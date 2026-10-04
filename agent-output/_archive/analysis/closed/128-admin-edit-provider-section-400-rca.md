---
ID: 128
Origin: 128
UUID: c7e4a91d
Status: Planned
---

# 128 — RCA: Admin Edit-Provider Section Dropdown HTTP 400

## Changelog

| Date       | Agent    | Action                                      |
|------------|----------|---------------------------------------------|
| 2026-05-12 | Analyst  | Initial root cause analysis — L1 Proven     |

## Value Statement & Business Objective

Admin moderators cannot change a provider's section (listing_type) via the edit panel. This blocks a core admin workflow — reclassifying providers between Food and Business/Store sections. The PATCH API returns HTTP 400 "Invalid request body", preventing the save.

## Objective

Identify why PATCH `/api/admin/edit-provider` returns 400 when the `section` dropdown value changes, and provide a verified root cause with fix hypothesis.

## Context

- **Bug**: Issue #221 — Admin edit-provider section dropdown change fails with HTTP 400
- **Symptom**: Browser console shows `PATCH /api/admin/edit-provider → HTTP/3 400 "Invalid request body"`
- **Trigger**: Changing the Section dropdown to "Business" (value `"store"`) in the admin provider edit page
- **Introduced by**: Migration `083_m5a_supertype_unification.sql` which renamed the Postgres enum value `'business'` → `'store'`, but the Zod validation schema was not updated to match

## Methodology

- **Upstream Tracing**: Followed data flow from UI dropdown → form state → request body → Zod schema → API handler
- **Component Isolation**: Compared the Zod enum values against the DB enum, form dropdown values, and TypeScript types
- **Migration Archaeology**: Searched `supabase/migrations/` for `listing_type_enum` changes

## Findings

### L1 Proven — Root Cause: Zod Schema Enum Mismatch

**The Zod validation schema uses the stale enum value `'business'` while the database, frontend form, and canonical Section type all use `'store'`.**

#### Evidence Chain

1. **Database enum** (baseline + migration):
   - `001_baseline.sql:46–48`: `listing_type_enum` created with `('food', 'business')`
   - `083_m5a_supertype_unification.sql:56`: **`ALTER TYPE public.listing_type_enum RENAME VALUE 'business' TO 'store'`**
   - Current DB enum values: `'food'`, `'store'`, `'ummah'`

2. **Canonical Section type** (`src/config/sectionFilters.ts:14`):
   - `export type Section = 'food' | 'ummah' | 'store'` — uses `'store'` ✅

3. **Provider type** (`src/services/providers.ts:52`):
   - `listing_type?: 'food' | 'store' | 'ummah' | null` — uses `'store'` ✅

4. **Form dropdown** (`src/components/providers/ProviderEditForm.tsx:462`):
   - `<option value="store">` — sends `'store'` ✅

5. **Form data type** (`src/components/providers/ProviderEditForm.tsx:55`):
   - `listingType: 'food' | 'store' | 'ummah' | null` — uses `'store'` ✅

6. **Request body construction** (`src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:107`):
   - `listingType: formData.listingType` — passes `'store'` through ✅

7. **Zod validation schema** (`src/lib/validations/adminSchemas.ts:44`):
   - `listingType: z.enum(['food', 'business']).nullable().optional()` — **STALE, uses `'business'`** ❌
   - `'store'` is not in `['food', 'business']` → Zod throws → HTTP 400

8. **Service interface** (`src/services/admin/providerEdit.ts:17`):
   - `listingType?: 'food' | 'business' | 'ummah' | null` — **STALE, uses `'business'`** ❌

9. **Test mock** (`src/__tests__/api/admin-edit-provider.test.ts:61`):
   - Mock validator also checks against `'food'` and `'business'` — **STALE** ❌

### Failure Scenario (Step-by-Step)

| Step | Layer | Value | Result |
|------|-------|-------|--------|
| 1 | UI dropdown | Admin selects "Business" | `value="store"` |
| 2 | Form state | `handleInputChange('listingType', 'store')` | `formData.listingType = 'store'` |
| 3 | Request body | `{ listingType: 'store', ... }` | Sent to API |
| 4 | Zod validation | `z.enum(['food', 'business']).parse('store')` | **Throws** — `'store'` not in enum |
| 5 | API handler | Catches Zod error | Returns HTTP 400 "Invalid request body" |

### Partial Success Cases

- Selecting **"Food"** → `listingType: 'food'` → passes Zod ✅
- Selecting **empty/unclassified** → `listingType: null` → passes `.nullable()` ✅
- Only selecting **"Business/Store"** → `listingType: 'store'` → **fails** ❌

## Root Cause Statement

**L1 Proven**: Migration `083_m5a_supertype_unification.sql` renamed the Postgres `listing_type_enum` value from `'business'` to `'store'`. The frontend components, canonical types, and Provider service types were updated to use `'store'`, but the Zod validation schema (`providerEditUpdateSchema`) and the admin service interface (`AdminProviderEditData`) were not updated — they still reference the old value `'business'`. When the dropdown sends `listingType: 'store'`, the Zod `z.enum(['food', 'business'])` rejects it as invalid, producing the HTTP 400.

## Fix Hypothesis

Three files need the stale `'business'` value updated to `'store'`:

| # | File | Line | Current | Fix |
|---|------|------|---------|-----|
| 1 | `src/lib/validations/adminSchemas.ts` | 44 | `z.enum(['food', 'business'])` | `z.enum(['food', 'store'])` |
| 2 | `src/services/admin/providerEdit.ts` | 17 | `'food' \| 'business' \| 'ummah' \| null` | `'food' \| 'store' \| 'ummah' \| null` |
| 3 | `src/__tests__/api/admin-edit-provider.test.ts` | 61 | `listingType !== 'business'` | `listingType !== 'store'` |

### Regression Risk

- **Low**: The fix is a direct value rename to match the canonical DB enum. No behavioral logic changes.
- **Test gap**: The security regression test (`security-066-regression.test.ts`) uses real Zod but never tests `listingType` with `'store'` — a regression test should be added.
- **Secondary concern**: The `AdminProviderEditData` interface in the service layer also uses `'business'` — this is a type-only issue (no runtime impact since Zod gate is the blocker), but should be fixed for consistency.

## Remaining Gaps

| # | Unknown | Status | Required Action |
|---|---------|--------|-----------------|
| 1 | Are there other stale `'business'` references in the codebase? | Resolved | Grep found the 3 files listed above. No other runtime code uses `'business'` for listing_type. |
| 2 | Is there a test that exercises the real Zod schema with `listingType: 'store'`? | Gap | No existing test. Implementer should add one. |

## Analysis Recommendations

1. **Fix the 3 files** listed in the Fix Hypothesis table.
2. **Add regression test**: A test using the real (unmocked) Zod schema with `listingType: 'store'` to prevent future enum drift.
3. **Consider**: Adding a shared `LISTING_TYPE_VALUES` constant derived from the canonical Section type to prevent future divergence between the Zod schema and the DB enum.
