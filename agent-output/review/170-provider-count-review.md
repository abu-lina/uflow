---
ID: 170
Origin: 170
UUID: a4f8c3d1
Status: Active
Verdict: APPROVED
---

# Review: Fix Hardcoded Provider Counts in Wo (Where) Section

## Summary

The implementation correctly addresses all 3 root causes identified in the analysis, with matching test coverage.

## Correctness

| Root Cause | Fix | Status |
|---|---|---|
| 1. `fetchPopularCities()` ignores section context | Added optional `section?: Section` param; adds `.eq('listing_type', section)` when provided (providers.ts:792-794) | ✅ |
| 2. City counts never refetch on section change | Changed effect dep from `[]` to `[selectedSection]` (page.tsx:187); passes `selectedSection` to `fetchPopularCities` (page.tsx:176) | ✅ |
| 3. `countByCity` Map built from top 3 only | Removed `cityCounts.slice(0, 3)` variable; passes full `cityCounts` as `popularCities` prop (page.tsx:579) | ✅ |

The section change flow is correct: `handleSectionChange` → `router.replace()` → `urlSection` update → `setSelectedSection(urlSection)` → effect fires with new section.

## Backward Compatibility

`fetchPopularCities()` without the `section` parameter returns all-sections counts as before. Verified by regression test (line 32-36) and by the optional parameter signature.

## Type Safety

- `Section` type (`'food' | 'ummah' | 'store'`) is defined in `@/config/sectionFilters` and re-exported from `@/providers/search-provider`. Both import paths resolve to the same type.
- `PopularCity` interface unchanged.

## Testing

**WoCityResults.test.tsx** (+2 tests):
- `[regression 170] selected city outside top 3 shows correct provider count` — Leipzig (rank 5) displays 5, not 0
- `[regression 170] recent search city outside top 3 shows correct provider count` — Leipzig in recent searches shows 5
- Existing tests for top-3 display slicing and other behaviors unchanged

**plan170-provider-count-regression.test.ts** (new, 4 tests):
- Section filter calls `.eq('listing_type', section)`
- No section does not call `.eq()`
- `ummah` and `store` sections both work
- Mock setup correctly differentiates the `.eq()` chain vs direct `.returns()` path

## Performance

- `fetchPopularCities(500, ...)` fetches up to 500 rows; with section filter the result set may be smaller. Negligible.
- `countByCity` Map built from full array (~500 entries max). O(n) construction is trivial.
- Display always sliced to 3 unless "Show all" is toggled.

## Edge Cases Considered

| Case | Handled? | Notes |
|---|---|---|
| Empty response (no providers match section) | ✅ | `cityCounts` → `countByCity` empty → component returns null |
| Error in fetch | ✅ | Caught, `setCityCounts([])`, error state rendered in WoCityResults |
| First render / initial section | ✅ | Effect fires on mount with initial `selectedSection`; slightly redundant but harmless |
| Recent searches outside top 3 | ✅ | `countByCity` now built from full data |
| Race condition on rapid section switching | ⚠️ | Pre-existing issue; no `AbortController` or mounted flag. Filed as follow-up in plan |

## Non-Blocking Suggestions

1. **Race condition mitigation**: Add an `AbortController` or mounted flag to `loadPopularCities` effect to prevent stale responses from overwriting fresh ones when the user rapidly switches sections. This is a pre-existing concern, not a regression.

2. **`fetchProviderCities()` section filter**: The city autocomplete dropdown still shows cities unfiltered by section. Documented as follow-up in the plan.

3. **`review_status` alignment**: `fetchPopularCities` doesn't filter by `review_status`, which may slightly inflate counts vs actual visible search results. Pre-existing issue.

## Risk Assessment

**Overall: Low**. All changes are backward compatible, type-safe, and fully tested. The implementation matches the plan and addresses all 3 root causes correctly. No regressions introduced.
