---
ID: 174
Origin: 174
Status: Active
---

# Plan: Fix online-after-edit bug

## Changelog
| Date | Agent | Description |
|------|-------|-------------|
| 2026-06-14 | Planner | Initial plan |

## Problem Statement

When a provider has address data (e.g. `address_city = 'Berlin'`), and either an owner or admin saves the edit form, the provider's address is permanently nulled in the database. The public profile then displays "Online" instead of the address.

The root cause is a chain:

1. `syncFromLocalStorage` uses `??` for `isOnlineBusiness` (line 278) but `||` for `city` (line 276). Stale localStorage from a previous session where the user toggled "online business" ON restores `isOnlineBusiness=true` while `city` falls through to the provider's real city. The form enters contradictory state.

2. The owner's `handleSubmit` (line 419-437) does `address_city: submitData.isOnlineBusiness ? null : (submitData.city || null)` — this unconditionally nulls address fields when `isOnlineBusiness` is true, regardless of whether `submitData.city` actually contains data. There is no COALESCE protection.

3. The Zod schema `providerEditUpdateSchema` (adminSchemas.ts:65-115) is missing `showAddress`, so the admin API silently drops `show_address` updates. Not part of the "Online" display bug, but a functional omission.

## Implementation Plan

### Milestone 1: Fix `syncFromLocalStorage` operator asymmetry

- **Files**: `src/components/providers/ProviderEditForm.tsx`
- **Changes**: In the `storedInline` handler (lines 269-287), change the `isOnlineBusiness` restoration to recompute from the merged address data instead of restoring the stored toggle value:

  ```typescript
  // Before (line 278):
  isOnlineBusiness: parsed.isOnlineBusiness ?? prev.isOnlineBusiness,

  // After — recompute from merged address data:
  isOnlineBusiness: !(parsed.city || prev.city) && !(parsed.zipCode || prev.zipCode),
  ```

  This makes `isOnlineBusiness` a *derived* value from the merged address state. If the user's address data is present (from provider DB or previously saved), `isOnlineBusiness` is `false`. Only when address fields are genuinely empty does it become `true`.

- **Rationale**: Eliminates the contradictory form state at the source. The stale toggle can no longer override the provider's actual address data. Aligns the operator pattern: city, zip, street, country all use `||` (falsy fallback), so `isOnlineBusiness` should derive from the same merged result.

### Milestone 2: Fix owner path — add guard against stale `isOnlineBusiness`

- **Files**: `src/components/providers/ProviderEditForm.tsx`
- **Changes**: In `handleSubmit` (lines 426-429), add a conjunctive guard that only nulls address fields when BOTH `isOnlineBusiness` is true AND the address fields are genuinely null/empty:

  ```typescript
  // Before:
  address_street: submitData.isOnlineBusiness ? null : (submitData.street || null),
  address_zip: submitData.isOnlineBusiness ? null : (submitData.zipCode || null),
  address_city: submitData.isOnlineBusiness ? null : (submitData.city || null),
  address_country: submitData.isOnlineBusiness ? null : (submitData.country || null),

  // After:
  address_street: submitData.isOnlineBusiness && !submitData.street ? null : (submitData.street || null),
  address_zip: submitData.isOnlineBusiness && !submitData.zipCode ? null : (submitData.zipCode || null),
  address_city: submitData.isOnlineBusiness && !submitData.city ? null : (submitData.city || null),
  address_country: submitData.isOnlineBusiness && !submitData.country ? null : (submitData.country || null),
  ```

  Also fix `show_address` on the same principle (line 430):

  ```typescript
  // Before:
  show_address: submitData.isOnlineBusiness ? false : submitData.showAddress,

  // After:
  show_address: submitData.isOnlineBusiness && !submitData.city ? false : submitData.showAddress,
  ```

- **Rationale**: The owner path cannot use the RPC (it uses the user's own Supabase client with RLS, while the RPC requires service_role). The simplest protective fix is to only null addresses when the address data *actually* signals intent to go online (both toggle is ON and city is empty). This prevents data corruption from stale `isOnlineBusiness` state.

### Milestone 3: Add `showAddress` to Zod schema

- **Files**: `src/lib/validations/adminSchemas.ts`
- **Changes**: Add `showAddress` field to `providerEditUpdateSchema` (after line 74, alongside other address fields):

  ```typescript
  showAddress: z.boolean().optional(),
  ```

- **Rationale**: The admin page (page.tsx:138) already sends `showAddress` in the request body, but the Zod schema strips it before it reaches `buildBasicFieldsPayload`. Adding it to the schema lets the admin API actually update `show_address`. The RPC (migration 106:80) already handles `show_address` via COALESCE, so it will work once the field passes validation.

### Milestone 4: Admin localStorage safety — guard against contradictory state

- **Files**: `src/components/providers/ProviderEditForm.tsx`
- **Changes**: Add a consistency check after `syncFromLocalStorage` restores all stored values. If `isOnlineBusiness` contradicts the address data (`city`, `street`, `zip`, `country` are all empty AND provider has address data), reset `isOnlineBusiness` to `false`. Place this in the `storedInline` handler after the merged state is computed (or as a separate `useEffect`).

  Option A (inline in `syncFromLocalStorage`, inside the `storedInline` handler, after the existing merge block):

  ```typescript
  // After line 287 (end of storedInline merge block), add:
  if (parsed.isOnlineBusiness === true && (parsed.city || prev.city || parsed.zipCode || prev.zipCode)) {
    setFormData(prev => ({ ...prev, isOnlineBusiness: false }));
  }
  ```

  Option B (separate effect, more explicit):

  ```typescript
  useEffect(() => {
    if (!enableLocalStorage) return;
    const pid = provider.provider_id;
    const pfx = localStoragePrefix;
    const storedInline = localStorage.getItem(`${pfx}edit_inline_${pid}`);
    if (storedInline) {
      try {
        const parsed = JSON.parse(storedInline);
        if (parsed.isOnlineBusiness && (provider.address_city || provider.address_zip)) {
          setFormData(prev => {
            if (prev.isOnlineBusiness && (prev.city || prev.zipCode)) {
              return { ...prev, isOnlineBusiness: false };
            }
            return prev;
          });
        }
      } catch { /* ignore */ }
    }
  }, [enableLocalStorage, localStoragePrefix, provider.provider_id, provider.address_city, provider.address_zip]);
  ```

  **Recommendation**: Use Option A — inline guard is simpler, co-located with the restoration logic, and avoids an extra effect.

- **Rationale**: Provides defense-in-depth. Even after Milestone 1 fixes the merge logic, stale localStorage could still produce inconsistencies if `syncFromLocalStorage` runs with partial data. The guard catches the specific case of contradictory `isOnlineBusiness` and resets it.

## Acceptance Criteria

1. **Regression**: Provider with address data (e.g. `address_city = 'Berlin'`) — admin opens edit page with stale localStorage containing `isOnlineBusiness=true` and `city="Berlin"` — form loads showing city field populated and online toggle OFF — saving preserves `address_city` in DB

2. **Regression**: Same scenario via owner edit path (direct Supabase update) — `address_city` preserved in DB

3. **Functional**: Admin sends `showAddress: false` in request body — validated by Zod — `buildBasicFieldsPayload` includes `show_address: false` — RPC updates `show_address` column

4. **Edge case**: User intentionally sets online business ON with all address fields cleared — `isOnlineBusiness=true`, `city=""` — save correctly nulls address fields — provider displays as "Online"

5. **Edge case**: User toggles online business ON, fills in no address, navigates to sub-page, navigates back — `syncFromLocalStorage` restores `isOnlineBusiness=true` and empty address fields — correct consistent state

6. **No regression**: All existing edit form functionality works (basic fields, categories, images, social, menu, delivery, locations, hours, halal, values, enrichment review)

## Test Plan

### Unit / Integration Tests

| Test | File | Description |
|------|------|-------------|
| `syncFromLocalStorage recomputes isOnlineBusiness` | `components/providers/ProviderEditForm.test.tsx` | Stale localStorage has `isOnlineBusiness=true`, provider has `city=Berlin` — after sync, `isOnlineBusiness=false` |
| `handleSubmit owner path with stale isOnlineBusiness` | `components/providers/ProviderEditForm.test.tsx` | Form has `isOnlineBusiness=true`, `city=Berlin` — submit — DB receives `address_city=Berlin` (not null) [post-fix PASSES] |
| `handleSubmit owner path intentional online` | `components/providers/ProviderEditForm.test.tsx` | Form has `isOnlineBusiness=true`, `city=""` — submit — DB receives `address_city=null` |
| `Zod schema passes showAddress` | `lib/validations/adminSchemas.test.ts` | `providerEditUpdateSchema.parse({showAddress: false})` — `validatedData.showAddress` is `false` [post-fix PASSES] |
| `buildBasicFieldsPayload includes showAddress` | `services/admin/providerEdit.test.ts` | `buildBasicFieldsPayload({showAddress: false})` — payload has `{show_address: false}` |
