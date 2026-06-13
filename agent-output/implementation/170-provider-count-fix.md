---
ID: 170
Origin: 170
UUID: d8f4a71c
Status: Active
---

# Implementation: Fix Hardcoded Provider Counts in Wo (Where) Section

## TDD Compliance

| Test | Status | Type | Notes |
|------|--------|------|-------|
| `fetchPopularCities with section filter calls eq on listing_type` | ✅ Pass | Unit | Verifies `.eq('listing_type', section)` when section provided |
| `fetchPopularCities without section does not call eq` | ✅ Pass | Unit | Verifies backward compatibility |
| `fetchPopularCities filters by ummah section` | ✅ Pass | Unit | `'ummah'` section works |
| `fetchPopularCities filters by store section` | ✅ Pass | Unit | `'store'` section works |
| `[regression 170] selected city outside top 3 shows correct provider count` | ✅ Pass | Regression | Leipzig outside top 3 shows 5, not 0 |
| `[regression 170] recent search city outside top 3 shows correct provider count` | ✅ Pass | Regression | Leipzig in recent searches shows 5, not 0 |

## Summary of Changes

### 1. `src/services/providers.ts:781-821` — Add section filter to `fetchPopularCities()`

- Added optional `section?: Section` parameter
- When provided, adds `.eq('listing_type', section)` to the Supabase query
- Backward compatible — no section arg = all-sections behavior unchanged

### 2. `src/app/(public)/search/page.tsx:168-186` — Refetch on section change

- Changed `loadPopularCities` useEffect dependency from `[]` to `[selectedSection]`
- Passes `selectedSection` to `fetchPopularCities(500, selectedSection)`
- Removed `popularCities` local variable (`cityCounts.slice(0, 3)`)
- Passes `cityCounts` (full array) as `popularCities` prop to `WoCityResults`

### 3. `src/features/search/components/WoCityResults.tsx` — No changes needed

- Component already slices to top 3 for display: `popularCities.slice(0, 3)`
- `countByCity` Map now built from full `cityCounts` array
- Selected city and recent search lookups find any city, not just top 3

### 4. `src/features/search/components/WoCityResults.test.tsx` — 2 regression tests added

- `[regression 170] selected city outside top 3 shows correct provider count`
- `[regression 170] recent search city outside top 3 shows correct provider count`

### 5. `src/__tests__/regression/plan170-provider-count-regression.test.ts` — NEW file

- 4 tests covering section filter behavior and backward compatibility

## Test Results

```
✓ src/features/search/components/WoCityResults.test.tsx (9 tests) ✓ (was 7, +2)
✓ src/__tests__/regression/plan170-provider-count-regression.test.ts (4 tests)
✓ TypeScript: no errors
✓ Lint: no new warnings/errors
```
