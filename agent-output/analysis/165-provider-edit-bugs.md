# Analysis: Provider Edit Page Bugs

**Date**: 2026-06-12
**Objective**: Investigate two bugs on `/dashboard/providers/[id]/edit`:
1. Review status lost on field navigation
2. 500 error on PATCH `/api/admin/edit-provider`

---

## Bug 1: Review Status Lost on Field Navigation

### Root Cause
**Confidence: Proven**

`reviewStatus` is not included in `saveInlineDataToLocalStorage()` (line 289) or the inline section of `syncFromLocalStorage()` (line 265). When an admin changes the dropdown then clicks a sub-page navigation link (Kategorie, Bilder, etc.), the state is saved to localStorage without `reviewStatus`. On return, `syncFromLocalStorage()` runs on mount + visibility change, but reviewStatus is not restored — it falls back to the `provider.review_status` from the initial prop.

### Code Evidence

**`src/components/providers/ProviderEditForm.tsx` — saveInlineDataToLocalStorage (lines 289–308):**
```typescript
const saveInlineDataToLocalStorage = useCallback(() => {
    if (!enableLocalStorage) return;
    const pid = provider.provider_id;
    const pfx = localStoragePrefix;
    const inlineData = {
        providerName: formData.providerName,
        providerDescription: formData.providerDescription,
        listingType: formData.listingType,
        street: formData.street,
        zipCode: formData.zipCode,
        city: formData.city,
        country: formData.country,
        isOnlineBusiness: formData.isOnlineBusiness,
        showAddress: formData.showAddress,
        website: formData.website,
        instagram: formData.instagram,
        email: formData.email,
        phone: formData.phone,
        // MISSING: reviewStatus
    };
    localStorage.setItem(`${pfx}edit_inline_${pid}`, JSON.stringify(inlineData));
}, [enableLocalStorage, localStoragePrefix, provider.provider_id, formData]);
```

**syncFromLocalStorage — inline section (lines 265–286):**
```typescript
const storedInline = localStorage.getItem(`${pfx}edit_inline_${pid}`);
if (storedInline) {
    const parsed = JSON.parse(storedInline);
    setFormData(prev => ({
        ...prev,
        providerName: parsed.providerName || prev.providerName,
        // ... all the same fields
        // MISSING: reviewStatus
    }));
}
```

### Data Flow

1. Admin changes Review Status dropdown → `handleInputChange('reviewStatus', value)` updates React state
2. Admin clicks "Kategorie" → `onClick={() => saveInlineDataAndNavigate(...)}`
3. `saveInlineDataAndNavigate` calls `saveInlineDataToLocalStorage()` then `router.push(url)`
4. Component unmounts, category sub-page renders
5. Admin navigates back → component remounts
6. `syncFromLocalStorage()` runs in mount `useEffect` (line 317–319) — restores all inline fields EXCEPT reviewStatus
7. `formData.reviewStatus` was initialized from `provider.review_status` in `useState` (line 177), so the admin's change is lost

### Recommended Fix

Add `reviewStatus` to both `saveInlineDataToLocalStorage()` and `syncFromLocalStorage()`:

**In `saveInlineDataToLocalStorage()`:**
```typescript
const inlineData = {
    // ... existing fields
    reviewStatus: formData.reviewStatus,
};
```

**In `syncFromLocalStorage()` inline section:**
```typescript
reviewStatus: parsed.reviewStatus || prev.reviewStatus,
```

---

## Bug 2: 500 Error on PATCH /api/admin/edit-provider

### Investigation

#### Code path traced

1. `page.tsx:145` — `fetch('/api/admin/edit-provider', { method: 'PATCH', body: JSON.stringify(requestBody) })`
2. `route.ts:66` — Zod validation `providerEditUpdateSchema.parse(body)`
3. `route.ts:84` — destructure `providerId`, `editFields`
4. `route.ts:86` — `updateProviderFields(providerId, editFields, user.id)`
5. `providerEdit.ts:228` — `buildRpcPayload(editData, editData.listingType)` builds JSONB payload
6. `providerEdit.ts:230` — `supabase.rpc('admin_update_provider', { p_provider_id, p_data })`
7. `migration 102` — RPC function updates providers table, extension tables, menu, delivery links, community services, locations atomically

### Root Cause

**Confidence: Inferred** — most likely the `listingType` enum mismatch between form data and Zod schema.

**The Zod schema at `adminSchemas.ts:70` only accepts:**
```typescript
listingType: z.enum(['food', 'store']).nullable().optional(),
```

**But the database and TypeScript type allow `'ummah'`:**
- `AdminProviderWithExtensions.listing_type` → `'food' | 'store' | 'ummah' | null` (adminProvider.ts:56)
- `ProviderEditFormData.listingType` → `'food' | 'store' | 'ummah' | null` (ProviderEditForm.tsx:55)

When a provider has `listing_type = 'ummah'`, the form initializes `listingType: 'ummah'` (line 154: `listingType: provider.listing_type ?? null`). On submit, the API receives `listingType: 'ummah'`, which Zod rejects with a ZodError. The handler catches this and returns HTTP **400** (route.ts:80), not 500. However:

**Secondary issue**: Even if Zod is fixed, the RPC function at `migration 102:52-54` casts `listing_type` via:
```sql
listing_type = CASE WHEN v_providers ? 'listing_type'
              THEN NULLIF(v_providers->>'listing_type', '')::listing_type_enum
              ELSE listing_type END,
```

If `listing_type_enum` does not include `'ummah'`, this cast would throw a Postgres error, caught by the outer try-catch in `route.ts:116`, resulting in a **500**. This matches the reported symptom.

#### Additional issues found along the path (do not cause 500 but are data bugs):

1. **`show_address` never updated**: The `ProviderEditFormData` includes `showAddress` (line 61) and `isOnlineBusiness` toggle (lines 678–690) that sets `showAddress: false`, but `showAddress` is not in `AdminProviderEditData` (providerEdit.ts:30) or the RPC `UPDATE` statement. Admin changes to show_address are silently lost.

2. **Unnecessary extension table upserts**: `buildExtensionFieldsPayload` returns `{ food_providers: {} }` when `listingType === 'food'` even when no halal fields changed (providerEdit.ts:124). This triggers an `INSERT ... ON CONFLICT DO UPDATE` in the RPC that writes default/false values for all halal fields, potentially overwriting existing data.

3. **Review status sync race**: After `saveProviderEdits` succeeds, the code calls the review-provider API (page.tsx:168–182) with `expectedUpdatedAt`. The RPC already changed `updated_at`, and the review-provider also sets a new `updated_at`. The `expectedUpdatedAt` from the edit response should match, but if there's any drift, the review-provider call fails with 409 (CONFLICT), which is silently swallowed.

### Recommended Fix

**Primary — Add `'ummah'` to the Zod schema and ensure the DB enum supports it:**
```typescript
listingType: z.enum(['food', 'store', 'ummah']).nullable().optional(),
```
And verify that `listing_type_enum` in Postgres includes `'ummah'` (check migration `0060_plan_145_enum_value.sql`).

**Secondary — Fix `buildExtensionFieldsPayload` to not trigger unnecessary upserts:**
```typescript
export function buildExtensionFieldsPayload(
  data: Partial<AdminProviderEditData>,
  listingType?: 'food' | 'store' | string | null
): Record<string, unknown> {
  const hasExtensionFields =
    data.verificationMethod !== undefined ||
    data.hasCertificate !== undefined ||
    data.certificateUrl !== undefined ||
    data.noAlcohol !== undefined ||
    data.noPork !== undefined ||
    data.noGambling !== undefined;

  if (!hasExtensionFields) return {};

  // ... rest unchanged
```

**Tertiary — Handle `show_address` in the admin edit flow:**
Add `showAddress` to `AdminProviderEditData`, `buildBasicFieldsPayload`, and the RPC `UPDATE` statement.

---

## Gap Tracking

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does the `listing_type_enum` in the target DB include `'ummah'`? | Cannot access production DB. | Check `supabase/migrations/0060_plan_145_enum_value.sql` or run `\dT+ listing_type_enum` on the DB. | Developer |
| 2 | Is the `admin_update_provider` RPC applied to the target DB? | Cannot verify DB state. | Run `SELECT proname FROM pg_proc WHERE proname = 'admin_update_provider'` on target DB. | Developer |
| 3 | What exact error message does the 500 return? | Not yet observed in logs. | Reproduce locally with dev mode, check browser network tab or server logs. | Developer |

## Open Questions

1. Is the reported 500 actually a 400 from Zod validation that the user misidentified? Reproduce with `NODE_ENV=development` to get the full error message.
2. Is `listing_type_enum` consistently defined across all environments? The enum may have been altered by migration `0060_plan_145_enum_value.sql`.
