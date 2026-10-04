# Plan 165: Provider Edit Page Bugfixes

**Date**: 2026-06-12
**Status**: Draft
**Analysis Ref**: `agent-output/analysis/165-provider-edit-bugs.md`

---

## 1. Bug Summary & Root Causes

| # | Priority | Bug | Root Cause | Confidence |
|---|----------|-----|------------|------------|
| 1 | P0 | Review status lost on field navigation | `reviewStatus` omitted from `saveInlineDataToLocalStorage()` and `syncFromLocalStorage()` inline section in `ProviderEditForm.tsx` | Proven |
| 2 | P0 | 400 error on PATCH `/api/admin/edit-provider` for 'ummah' providers | Zod schema `listingType` enum at `adminSchemas.ts:70` only allows `'food' | 'store'`; DB enum already has `'ummah'` (migration 0060) | Proven |
| 3 | P1 | Extension table upserts overwrite halal fields with defaults | Page always sends all 6 halal fields; even when none changed, they arrive as `null`/`false` — RPC then upserts with defaults | Inferred |
| 4 | P1 | `show_address` changes silently lost on admin edit | `showAddress` not in `AdminProviderEditData`, `buildBasicFieldsPayload`, or the RPC provider UPDATE | Proven |

---

## 2. Fix Details

### Fix 1 (P0): Add reviewStatus to localStorage sync

**File**: `src/components/providers/ProviderEditForm.tsx`

**Change A — `saveInlineDataToLocalStorage()`** (lines 293-307): Add `reviewStatus: formData.reviewStatus` to the `inlineData` object.

**Change B — `syncFromLocalStorage()` inline section** (lines 269-284): Add `reviewStatus: parsed.reviewStatus || prev.reviewStatus` to the `setFormData` spread.

### Fix 2 (P0): Add 'ummah' to Zod schema

**File**: `src/lib/validations/adminSchemas.ts`, line 70

Current:
```typescript
listingType: z.enum(['food', 'store']).nullable().optional(),
```

Proposed:
```typescript
listingType: z.enum(['food', 'store', 'ummah']).nullable().optional(),
```

No DB migration needed — migration `0060_plan_145_enum_value.sql` already added `'ummah'` to `listing_type_enum`. The RPC at migration `102_plan_151_admin_location_upsert.sql:52-54` safely casts via `NULLIF(...)::listing_type_enum`, which works because the enum value exists.

### P1 Fix 1: Guard unnecessary extension table upserts

**Root cause**: `page.tsx:saveProviderEdits` (lines 123-136) always includes all 6 halal fields in the request body. Even when no halal sub-page was visited, they arrive as `null`/`false`. The service layer passes them through, and the RPC's `ON CONFLICT DO UPDATE` overwrites existing values with defaults.

**Fix A — `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`**: Only include halal fields in the request body when they carry meaningful values (non-null verification, true booleans):

```typescript
// Only include halal fields if they were actually set (not defaults)
if (formData.verificationMethod) requestBody.verificationMethod = formData.verificationMethod;
if (formData.hasCertificate) requestBody.hasCertificate = true;
if (formData.certificateUrl) requestBody.certificateUrl = formData.certificateUrl;
if (formData.noAlcohol) requestBody.noAlcohol = true;
if (formData.noPork) requestBody.noPork = true;
if (formData.noGambling) requestBody.noGambling = true;
```

**Fix B — `src/services/admin/providerEdit.ts` `buildExtensionFieldsPayload`**: Change the `hasExtensionFields` check to consider `null`/`false` as "not meaningfully set":

```typescript
const halalFields = [
  data.verificationMethod,
  data.hasCertificate,
  data.certificateUrl,
  data.noAlcohol,
  data.noPork,
  data.noGambling,
];
const hasExtensionFields = halalFields.some(f => f !== undefined && f !== null && f !== false);
```

This provides defense-in-depth — even if a future caller sends all fields, only meaningful values trigger the upsert.

### P1 Fix 2: Add showAddress to admin edit flow

Four changes needed:

**Fix A — `src/services/admin/providerEdit.ts`** — Add to interface and payload builder:

```typescript
// AdminProviderEditData (line 30):
export interface AdminProviderEditData {
  // ... existing fields
  showAddress?: boolean;
}

// buildBasicFieldsPayload (line 79):
export function buildBasicFieldsPayload(data: Partial<AdminProviderEditData>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  // ... existing fields
  if (data.showAddress !== undefined) payload.show_address = data.showAddress;
  return payload;
}
```

**Fix B — `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`** — Add `showAddress` to request body:

```typescript
const requestBody: Record<string, unknown> = {
  // ... existing fields
  showAddress: formData.isOnlineBusiness ? false : formData.showAddress,
};
```

**Fix C — DB migration** — Add `show_address` to the RPC provider UPDATE. Create a new migration (e.g., `103_plan_165_show_address_admin_edit.sql`):

```sql
-- Add show_address to the admin_update_provider RPC provider UPDATE
CREATE OR REPLACE FUNCTION public.admin_update_provider(
  p_provider_id UUID,
  p_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers JSONB;
  v_food_providers JSONB;
  v_store_providers JSONB;
  v_menu_items JSONB;
  v_delivery_links JSONB;
  v_community_service_ids JSONB;
  v_locations JSONB;
  v_listing_type TEXT;
  v_result JSONB;
  v_updated_at TIMESTAMPTZ := NOW();
  v_location JSONB;
  v_location_id UUID;
  v_existing_ids UUID[];
BEGIN
  SELECT p.listing_type INTO v_listing_type
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  v_providers := p_data->'providers';
  v_food_providers := p_data->'food_providers';
  v_store_providers := p_data->'store_providers';
  v_menu_items := p_data->'menu_items';
  v_delivery_links := p_data->'delivery_links';
  v_community_service_ids := p_data->'community_service_ids';
  v_locations := p_data->'locations';

  IF v_providers IS NOT NULL AND v_providers != 'null'::jsonb THEN
    UPDATE public.providers SET
      -- ... all existing fields unchanged, then add:
      show_address        = COALESCE((v_providers->>'show_address')::boolean, show_address),
      -- ... rest unchanged
    WHERE provider_id = p_provider_id;
  END IF;

  -- ... rest of function unchanged
END;
$$;
```

---

## 3. Testing Strategy

### Unit tests to update/add

**Test file**: `src/__tests__/lib/validations/adminSchemas.test.ts`
- **Update test**: `"restricts listingType to food, store, or null"` → change to allow `'ummah'` + test `'ummah'` passes
- **Add test**: `"accepts listingType 'ummah'"` — explicit test that `'ummah'` validates

**Test file**: `src/__tests__/services/admin/providerEdit.test.ts`
- **Add test**: `"buildExtensionFieldsPayload returns empty when fields are null/false"` — verify `{ verificationMethod: null, hasCertificate: false }` returns `{}`
- **Add test**: `"buildExtensionFieldsPayload returns payload when fields have meaningful values"` — verify `{ verificationMethod: 'online' }` returns correct payload
- **Add test**: `"buildBasicFieldsPayload includes show_address when provided"` — verify `showAddress: true` maps to `show_address: true`
- **Add test**: `"updateProviderFields passes show_address through to RPC"` — verify `showAddress` in edit data produces `show_address` in RPC payload

**Test file**: `src/__tests__/api/admin-edit-provider.test.ts`
- **Update mock validation**: Allow `'ummah'` in the mock schema's listingType check (line 54-62)
- **Add test**: `"[post-fix PASSES] accepts listingType 'ummah'"` — verify HTTP 200 with `listingType: 'ummah'`
- **Add test**: `"still rejects invalid listingType 'other'"` — verify HTTP 400 remains for truly invalid values

### Logic test for Bug 1 (localStorage)

**New test file** or add to existing: `src/__tests__/components/providers/ProviderEditForm.test.tsx`

Add focused logic tests for the localStorage round-trip pattern:

```typescript
describe('ProviderEditForm — localStorage sync', () => {
  it('[post-fix PASSES] preserves reviewStatus through saveInlineDataToLocalStorage + syncFromLocalStorage round-trip', () => {
    // 1. Set reviewStatus to 'approved'
    // 2. Call saveInlineDataToLocalStorage
    // 3. Read localStorage key directly
    // 4. JSON.parse and assert reviewStatus === 'approved'
  });

  it('[pre-fix FAILS] reviewStatus is lost during save/restore cycle', () => {
    // Same as above but without the fix — proves bug exists
  });
});
```

### API integration test for Bug 2

The existing test `admin-edit-provider.test.ts:134` already has `"[pre-fix FAILS] returns 400 when listingType is outside allowed enum"` which tests `'other'`. We add:

```typescript
it("[post-fix PASSES] accepts listingType 'ummah'", async () => {
  const response = await PATCH(createRequest({
    ...validBody,
    listingType: 'ummah',
  }));
  expect(response.status).toBe(200);
});
```

---

## 4. TDD Compliance Table

| Test | Bug | Pre-fix | Post-fix | File |
|------|-----|---------|----------|------|
| `reviewStatus survives saveInlineData + syncFromLocalStorage round-trip` | Bug 1 | FAILS | PASSES | New: `ProviderEditForm.test.tsx` or logic test |
| `listingType 'ummah' is accepted by providerEditUpdateSchema` | Bug 2 | FAILS | PASSES | Existing: `adminSchemas.test.ts` |
| `API accepts listingType 'ummah'` | Bug 2 | FAILS | PASSES | Existing: `admin-edit-provider.test.ts` |
| `API still rejects invalid listingType 'other'` | Bug 2 | PASSES | PASSES | Existing: `admin-edit-provider.test.ts` |
| `buildExtensionFieldsPayload empty when fields are null/false` | P1 Fix 1 | FAILS | PASSES | Existing: `providerEdit.test.ts` |
| `buildBasicFieldsPayload includes show_address` | P1 Fix 2 | FAILS | PASSES | Existing: `providerEdit.test.ts` |
| `updateProviderFields passes show_address through RPC` | P1 Fix 2 | FAILS | PASSES | Existing: `providerEdit.test.ts` |

---

## 5. Implementation Order

**Step 1 (P0)**: `adminSchemas.ts` — Add `'ummah'` to Zod enum (one-line change, no DB migration, immediate fix for 400 error).

**Step 2 (P0)**: `ProviderEditForm.tsx` — Add `reviewStatus` to `saveInlineDataToLocalStorage()` and `syncFromLocalStorage()`.

**Step 3 (P1)**: `page.tsx` + `providerEdit.ts` — Guard halal extension upserts (defense-in-depth at both call site and service layer).

**Step 4 (P1)**: `providerEdit.ts` + `page.tsx` + migration — Add `showAddress` to admin edit flow.

**Step 5**: Tests — Update all test files per section 3.

**Step 6**: Verify — `npm run type-check && npm run lint && npm test`.

---

## 6. Files Changed Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `src/lib/validations/adminSchemas.ts:70` | Edit (Zod enum) | P0 |
| `src/components/providers/ProviderEditForm.tsx:293-307` | Edit (add reviewStatus to save) | P0 |
| `src/components/providers/ProviderEditForm.tsx:269-284` | Edit (add reviewStatus to restore) | P0 |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | Edit (conditionally send halal fields) | P1 |
| `src/services/admin/providerEdit.ts:104-113` | Edit (guard extension fields) | P1 |
| `src/services/admin/providerEdit.ts:30` | Edit (add showAddress to interface) | P1 |
| `src/services/admin/providerEdit.ts:79-99` | Edit (add show_address to payload) | P1 |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | Edit (add showAddress to requestBody) | P1 |
| `supabase/migrations/103_plan_165_show_address_admin_edit.sql` | New (add show_address to RPC) | P1 |
| `src/__tests__/lib/validations/adminSchemas.test.ts` | Edit (ummah tests) | P0 |
| `src/__tests__/api/admin-edit-provider.test.ts` | Edit (ummah + mock update) | P0 |
| `src/__tests__/services/admin/providerEdit.test.ts` | Edit (extension guard + showAddress tests) | P1 |
| New test file or addition | New (reviewStatus localStorage round-trip) | P0 |
