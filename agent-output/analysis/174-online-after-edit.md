---
ID: 174
Origin: 174
Status: Active
---

# Analysis: Provider appears as Online after admin edit

## Changelog
| Date | Agent | Description |
|------|-------|-------------|
| 2026-06-14 | Analyst | Initial analysis |

## Context

When an admin edits a provider at `/dashboard/providers/{id}/edit` and saves (either via the Save button, Approve, or Reject action), the public profile at `/providers/{id}` shows the provider as "Online" with no address displayed — even though the admin did not change location fields or toggle "online business".

The "Online" display is determined by the presence of `address_city` in the provider data. The public profile (`ProviderDetailPage.tsx:384`) checks `selectedLocation?.address_city || provider.address_city` — if neither is truthy, it shows "Online" instead of the address.

## Methodology

1. Read all key files across the full data flow: form (`ProviderEditForm.tsx`), admin page (`page.tsx`), Zod schema (`adminSchemas.ts`), service layer (`providerEdit.ts`), RPC function (`migration 106`), API route (`edit-provider/route.ts`), and public profile (`ProviderDetailPage.tsx`, `providers.server.ts`).
2. Verified RPC COALESCE behavior directly against the local Postgres database with edge cases (JSON null, missing key, empty string, boolean null/false).
3. Traced `syncFromLocalStorage` restoration patterns — specifically the operator asymmetry between `isOnlineBusiness` (`??`) and `city` (`||`).
4. Traced the `enableLocalStorage` configuration in the admin page and the localStorage prefix isolation.

## Findings (with Confidence Levels)

### Finding 1 — `showAddress` stripped by Zod schema — Proven

**Evidence**: `adminSchemas.ts:65-115` — the `providerEditUpdateSchema` does not include `showAddress`. The admin page (`page.tsx:138`) sends `showAddress` in the request body, but `route.ts:66` calls `providerEditUpdateSchema.parse(body)` which strips unknown keys by default (Zod's `.strip()` mode). The validated data never reaches `buildBasicFieldsPayload`, so `show_address` is never included in the RPC payload. The RPC preserves it via `COALESCE`, but the admin can never *change* `show_address`.

**DB test confirmed**: `COALESCE(null::boolean, existing_show_address)` preserves the current value.

### Finding 2 — `isOnlineBusiness`/`city` operator asymmetry in `syncFromLocalStorage` — Proven

**Evidence**: `ProviderEditForm.tsx:269-287` — `syncFromLocalStorage` uses different operators for restoration:

```typescript
// Line 276: uses || (falsy fallback) — empty string falls through to prev
city: parsed.city || prev.city,

// Line 278: uses ?? (nullish coalescing) — false/true override from localStorage
isOnlineBusiness: parsed.isOnlineBusiness ?? prev.isOnlineBusiness,
```

With `??`, if `parsed.isOnlineBusiness` is `false`, it restores `false`. If it's `true`, it restores `true`. Only `null`/`undefined` falls through. With `||`, empty string `""` falls through to `prev.city` (the provider's actual city).

This means stale localStorage (e.g., from a session where admin toggled online ON and navigated to a sub-page) can restore `isOnlineBusiness: true` while `city` falls back to the provider's real city. The form has contradictory state: `isOnlineBusiness=true` but `city="Berlin"`.

### Finding 3 — RPC COALESCE protects against `null` address values — Proven

**Evidence**: Migration `106_plan_165_show_address_admin_edit.sql:55-58` uses `COALESCE(v_providers->>'address_city', address_city)` for all address fields. DB tests confirm:

| Input | `->>` result | COALESCE result |
|-------|-------------|-----------------|
| `null` (JSON) | SQL NULL | Preserves existing |
| key absent | SQL NULL | Preserves existing |
| `"Berlin"` | `"Berlin"` | Overwrites with `"Berlin"` |
| `""` (empty string) | `""` | **Overwrites with empty string** |

The admin path (`page.tsx:110`) converts empty strings to `null` via `(formData.city || null)`, so the `""` case is avoided. `null` is safe.

### Finding 4 — Owner edit path has NO COALESCE protection — Observed

**Evidence**: `ProviderEditForm.tsx:419-437` — the owner `handleSubmit` path does direct `supabase.from('providers').update(...)` with `address_city: submitData.isOnlineBusiness ? null : (submitData.city || null)`. If the owner has stale `isOnlineBusiness=true` from localStorage, this directly nulls out `address_city` in the DB with no COALESCE protection.

This is a data corruption vector that the RPC was specifically designed to prevent (Plan 145).

### Finding 5 — Admin page enables localStorage despite documented warning — Observed

**Evidence**: `page.tsx:340` sets `enableLocalStorage={true}` with `localStoragePrefix="admin_"`. The prop documentation (`ProviderEditForm.tsx:27-30`) says: *"Set to false in admin context to avoid stale owner state."* While the prefix isolates admin from owner data, the admin's own localStorage can still accumulate stale state across sessions. Combined with the operator asymmetry (Finding 2), this creates the contradictory form state.

### Finding 6 — `show_address` column has no explicit handling for `null` JSONB in RPC — Observed

**Evidence**: In migration `106_plan_165_show_address_admin_edit.sql:80`:
```sql
show_address = COALESCE((v_providers->>'show_address')::boolean, show_address),
```
When `show_address` is stripped by Zod (Finding 1), the key doesn't exist in the payload, so `v_providers->>'show_address'` is SQL NULL, `NULL::boolean` is NULL, and COALESCE preserves. Verified with DB test.

## Root Cause

The root cause is a **combination of localStorage state leakage and Zod schema omission**:

**Primary**: The owner's `handleSubmit` path (Finding 4) does a direct Supabase `UPDATE` without COALESCE protection. When the owner has stale `isOnlineBusiness=true` in localStorage — from a previous session where they toggled online ON and navigated to a sub-page — the owner save directly nulls out `address_city`, `address_zip`, `address_street`, and `address_country` in the database. This corruption persists until an admin or owner sets the address back.

**Secondary (admin visible)**: `showAddress` is stripped by the Zod schema (Finding 1), so it can never be updated through the admin API. This is a separate functional bug: the admin cannot change `show_address` even when explicitly trying to, because the field is silently dropped during Zod validation.

**Trigger sequence**:
1. Owner visits the edit page (owner or admin URL with `enableLocalStorage=true`)
2. Owner toggles "online business" ON (fields visually cleared, `isOnlineBusiness=true` saved to localStorage on sub-page navigation)
3. Owner navigates away without saving
4. Later, admin opens the edit page — `syncFromLocalStorage` restores `isOnlineBusiness=true` (from stale localStorage) but `city="Berlin"` (from provider data via `||` fallback) — **contradictory state**
5. If admin saves with this state: admin API path (RPC with COALESCE) is SAFE — DB preserved
6. **But if owner saves with this state**: the owner path directly nulls address fields — DB CORRUPTED
7. After corruption, any page view shows "Online" because `provider.address_city` is now `null`

However, scenario 5 (admin saves with contradictory state) is safe via COALESCE. The admin only *sees* the corruption if steps 3-6 occurred before the admin's visit.

**Alternatively**, if the `showAddress` change was intended to affect the public display, the Zod omission means the admin's intent is silently ignored.

## Remaining Gaps

1. **`showAddress` impact on public display**: The public profile (`ProviderDetailPage.tsx:384`) only checks `address_city`, not `show_address`. Is "Online" purely determined by `address_city`, or does `show_address` play a role elsewhere (e.g., in the card view or other display components)?

2. **Is the admin also the owner?** If the admin is also listed as `provider_owner_id` for the provider, the admin's edit would trigger the owner path (if `onSubmitForm` were not set). Need to verify admin role doesn't interfere with `onSubmitForm` detection.

3. **Can `address_city` be empty string `""` in the DB?** The `|| ''` and `|| null` patterns convert between empty string and null. If `address_city` is `""` in DB, the form initialization and save path handle it differently from `null`. The COALESCE test shows `""` overwrites the DB — but the admin API avoids sending `""`.

4. **Race condition between `invalidateQueries` and `router.push`**: After admin save, the React Query cache is invalidated then navigation occurs. If the SSR `initialData` arrives before the DB is fully committed (unlikely with Supabase but theoretically possible with replication lag), the public page could show stale data.

5. **What exact value did `address_city` have before the admin edit?** To reproduce: check the provider's `address_city` before the admin edits. If it was already `null` (corrupted by a previous owner save), the edit form would show `isOnlineBusiness=true` and the admin's "didn't touch location" would still result in no address change.

## Analysis Recommendations

### For implementer

1. **Add `showAddress` to `providerEditUpdateSchema`** in `adminSchemas.ts` to stop stripping it. This lets the admin API actually update `show_address`.

2. **Fix `syncFromLocalStorage` operator asymmetry** in `ProviderEditForm.tsx`: Change `isOnlineBusiness` restoration to use `||` (like `city`) so stale `true` values are discarded when the underlying provider data has address fields. Or, better: restore `isOnlineBusiness` from the *provider data* rather than localStorage, computing it fresh from `!provider.address_city && !provider.address_zip` after merging other fields from localStorage.

   ```typescript
   // After syncing city, street, zip, country from localStorage:
   // Recompute isOnlineBusiness from the synced address data, not from stored toggle
   isOnlineBusiness: !(parsed.city || prev.city) && !(parsed.zipCode || prev.zipCode),
   ```

3. **Set `enableLocalStorage={false}` for admin context** in `page.tsx`, or keep it enabled but add a guard that invalidates stale `isOnlineBusiness` state when it contradicts the provider's address data.

4. **For the owner path** (`ProviderEditForm.tsx:419-437`): Consider routing owner edits through the RPC as well, or at minimum wrapping the owner's direct update in a conditional that only nulls address fields when `submitData.city` is also null (not just when `isOnlineBusiness` is true with a stale value).

### Tests to add

- **Regression test**: Admin page loads provider with address, stale localStorage has `isOnlineBusiness=true` → form shows address fields correctly → save via `onSubmitForm` → address_city in DB preserved
- **Regression test**: Zod schema parses body with `showAddress=false` → `validatedData.showAddress` is `undefined` → field stripped
- **Regression test**: Owner with stale `isOnlineBusiness=true` saves → DB address_city NOT corrupted (currently expected to FAIL, documenting the bug)
- **Unit test**: `buildBasicFieldsPayload` with `addressCity=null` → payload has `address_city: null` → RPC COALESCE preserves
