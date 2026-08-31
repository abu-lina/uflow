---
ID: 169
Origin: 169
Status: Committed
---

# UAT Report: Plan 169 — "Alle Restaurants" Entry

**Verdict: APPROVED FOR RELEASE**

---

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-06-13 | DevOps | Document closed | Status: Committed |

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | "Alle Restaurants" visible as first item in BELIEBT section | ✅ PASS | `WasCategoryResults.tsx:209` renders `shouldShowAllRestaurants` block before `shouldShowPopular` block at `:230` |
| 2 | Clicking navigates to results with no category filter | ✅ PASS | `buildSearchParams` (`search-params.ts:8-10`) sets no `?category=` or `?q=` for `all-restaurants` type → API receives no filter → shows all restaurants |
| 3 | Translations for German and English | ✅ PASS | `de.ts:202`: `"Alle Restaurants"`; `en.ts:202`: `"All Restaurants"` |

## Manual Test Scenarios

| # | Scenario | Status | Code Evidence |
|---|----------|--------|---------------|
| 1 | Row renders before BELIEBT categories | ✅ | `WasCategoryResults.tsx:209` (Alle Restaurants block) → `:230` (POPULAR heading + categories) |
| 2 | Renders when `items` is empty (zero providers) | ✅ | `shouldShowAllRestaurants` is independent of `items.length` (`:113`); early return at `:115` includes `!shouldShowAllRestaurants` |
| 3 | URL omits `?category=` and `?q=` on search | ✅ | `buildSearchParams` (`search-params.ts:8-10`) — explicit empty branch for `all-restaurants`; only `?section=food` is set |
| 4 | Persists in recent searches, re-appears on next visit | ✅ | `toFoodRecentSearches` (`search-params.ts:20`) includes `'all-restaurants'` in filter; dedup by label, capped at 3 |
| 5 | Selection row shows `LayoutGrid` icon | ✅ | `WasCategoryResults.tsx:178-182` renders `LayoutGrid` for `all-restaurants` selection; subtitle falls to `null` |
| 6 | Both DE and EN translations present | ✅ | `de.ts:202`: `"Alle Restaurants"`; `en.ts:202`: `"All Restaurants"` |

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| `WasCategoryResults.test.tsx` | 12 (7 existing + 5 new) | ✅ All passed |
| `plan169-alle-restaurants-regression.test.ts` | 5 | ✅ All passed |

- Type check: ✅ Passed
- Lint: ✅ Passed

## Implementation Check

- Dedicated `'all-restaurants'` sentinel type in `WasSelection.type` union (`WasCategoryResults.tsx:13`)
- `LayoutGrid` icon (distinct from cuisine `UtensilsCrossed`)
- `shouldShowAllRestaurants` decoupled from `shouldShowPopular` — renders independently
- `buildSearchParams` extracted to `src/lib/search-params.ts` — pure, testable, shared with regression tests
- `toFoodRecentSearches` extracted alongside — includes `'all-restaurants'` type
- No backend changes needed; existing `null` category → `'both'` strategy on API side

## Edge Cases

| Case | Status |
|------|--------|
| Zero providers (empty items) | ✅ Implemented and tested |
| Recent searches exist (mutual exclusion) | ✅ Tested — row hidden, RECENT shown |
| Already selected `all-restaurants` | ✅ Row hidden (checked in `shouldShowAllRestaurants`) |
| Language switch (de/en) | ✅ Both translations present |
| Old localStorage backward compat | ✅ `toFoodRecentSearches` filters unknown types gracefully |

All acceptance criteria and manual test scenarios are satisfied. No issues found.
