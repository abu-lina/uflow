---
ID: 169
Origin: 169
Status: Committed
---

# Plan 169: "Alle Restaurants" Entry in Search Filter — Implementation

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-06-13 | DevOps | Document closed | Status: Committed |

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `src/translations/de.ts` | Added `allRestaurants: "Alle Restaurants"` under `suchen.was` |
| 2 | `src/translations/en.ts` | Added `allRestaurants: "All Restaurants"` under `suchen.was` |
| 3 | `src/features/search/components/WasCategoryResults.tsx` | Added `'all-restaurants'` to `WasSelection.type` union; imported `LayoutGrid`; added `shouldShowAllRestaurants` logic; renders "Alle Restaurants" RowItem; updated selection row icon handling |
| 4 | `src/app/(public)/search/page.tsx` | Replaced inline `toFoodRecentSearches` and `handleSearch` logic with imports from `@/lib/search-params` |
| 5 | `src/lib/search-params.ts` | **NEW** — extracted `buildSearchParams` and `toFoodRecentSearches` as pure utilities |
| 6 | `src/features/search/components/WasCategoryResults.test.tsx` | Added 5 test cases for "Alle Restaurants" behavior |
| 7 | `src/__tests__/regression/plan169-alle-restaurants-regression.test.ts` | **NEW** — 5 regression tests for `buildSearchParams` and `toFoodRecentSearches` |

## TDD Compliance

| Implementation Step | Test File | Test Name | Status |
|---|---|---|---|
| Render "Alle Restaurants" row | `WasCategoryResults.test.tsx` | renders "Alle Restaurants" as first item in POPULAR section | ✅ |
| onSelect fires correctly | `WasCategoryResults.test.tsx` | calls onSelect with all-restaurants type when clicked | ✅ |
| Mutual exclusion with RECENT | `WasCategoryResults.test.tsx` | does not render "Alle Restaurants" when recent searches exist | ✅ |
| Selection icon | `WasCategoryResults.test.tsx` | renders "Alle Restaurants" selection with LayoutGrid icon | ✅ |
| Empty items edge case | `WasCategoryResults.test.tsx` | renders "Alle Restaurants" even when items list is empty | ✅ |
| No URL params for all-restaurants | `plan169-regression.test.ts` | all-restaurants type sets no category or q param | ✅ |
| Category sets ?category= | `plan169-regression.test.ts` | category with categoryId sets category param | ✅ |
| Dish sets ?q= | `plan169-regression.test.ts` | dish type sets q param with label | ✅ |
| toFoodRecentSearches keeps all-restaurants | `plan169-regression.test.ts` | keeps all-restaurants entries in recent searches | ✅ |
| toFoodRecentSearches filters unknown | `plan169-regression.test.ts` | filters unknown types | ✅ |

## Test Results

```
✓ src/features/search/components/WasCategoryResults.test.tsx (12 tests) 131ms
  (7 existing + 5 new — all pass)

✓ src/__tests__/regression/plan169-alle-restaurants-regression.test.ts (5 tests) 2ms
  (5 new — all pass)

✓ npm run type-check — no errors
✓ npm run lint — no new warnings/errors
```

## Deviations from Plan

| # | Deviation | Rationale |
|---|-----------|-----------|
| 1 | `toFoodRecentSearches` extracted to `src/lib/search-params.ts` alongside `buildSearchParams` | Makes it importable for regression tests without duplicating logic. The plan noted this as conditional ("if inline, extract"). Since it was inline, extraction was the right call. |
| 2 | Added `@testing-library/jest-dom` import to test file | Already available via setup file, but explicit import doesn't hurt and matches pattern used in other test files. |
| 3 | No explicit `null` subtitle handling for `'all-restaurants'` in selection row | The existing `: null` fallback in the subtitle ternary already covers unrecognized types — no code change needed. |

## Architecture Notes

- **Decoupled rendering**: `shouldShowAllRestaurants` is independent of `shouldShowPopular`. Uses its own condition: `!shouldShowRecent && selectedWas?.type !== 'all-restaurants'`. This ensures it renders even when `items.length === 0`.
- **buildSearchParams**: Pure function with no side effects. Imported by both `handleSearch` and regression tests from the same source — no drift risk.
- **Sentinel type**: `'all-restaurants'` prevents accidental `?q=` param setting in `handleSearch`, since the `buildSearchParams` utility explicitly checks for it before falling through to `params.set('q', ...)`.
