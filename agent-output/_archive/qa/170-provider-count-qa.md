---
ID: 170
Origin: 170
UUID: a7f2e9d4
Status: Active
Verdict: PASS
---

# QA Report: Fix Hardcoded Provider Counts in Wo (Where) Section

## Test Results

**Overall**: 196 passed, 3 failed, 1 skipped (200 test files, 1643 tests)

| Metric | Count |
|--------|-------|
| Test files passed | 196 |
| Test files failed | 3 (pre-existing, unrelated) |
| Test files skipped | 1 (integration, always skipped) |
| Tests passed | 1608 |
| Tests failed | 13 (all pre-existing, unrelated) |
| Tests skipped | 22 |

### Relevant test files — all pass

| Test file | Status | Tests |
|-----------|--------|-------|
| `src/features/search/components/WoCityResults.test.tsx` | ✅ Pass | 9 (was 7, +2 regression) |
| `src/__tests__/regression/plan170-provider-count-regression.test.ts` | ✅ Pass | 4 (new file) |
| `src/__tests__/services/providers.test.ts` | ✅ Pass | 10 |

### Pre-existing failures (unrelated to Plan 170)

| File | Failure | Root Cause |
|------|---------|------------|
| `src/__tests__/migrations/006-phase4-semantic-constraints-behavior.test.ts` | `listing_type_enum` missing "ummah" value | Local DB enum not updated; migration test only runs on local PG |
| `src/__tests__/lib/validations/adminSchemas.test.ts` | listingType validation expects `false` but got `true` | Pre-existing schema validation change (unrelated) |
| `src/__tests__/app/(public)/search/page-meal-search.test.tsx` | Missing `LayoutGrid` in `lucide-react` mock | Pre-existing mock gap; 11 tests fail together |

## TDD Compliance Verification

| Test | Status | File |
|------|--------|------|
| `fetchPopularCities with section filter calls eq on listing_type` | ✅ Pass | `plan170-provider-count-regression.test.ts` |
| `fetchPopularCities without section does not call eq` | ✅ Pass | `plan170-provider-count-regression.test.ts` |
| `fetchPopularCities filters by ummah section` | ✅ Pass | `plan170-provider-count-regression.test.ts` |
| `fetchPopularCities filters by store section` | ✅ Pass | `plan170-provider-count-regression.test.ts` |
| `[regression 170] selected city outside top 3 shows correct provider count` | ✅ Pass | `WoCityResults.test.tsx` |
| `[regression 170] recent search city outside top 3 shows correct provider count` | ✅ Pass | `WoCityResults.test.tsx` |

**All 6 tests pass.** ✅

## Type-Check Result

✅ **Pass** — `tsc --noEmit` completed with zero errors.

## Lint Result

⚠️ **14 errors, 137 warnings** — all pre-existing, zero new issues from Plan 170 changes.

Pre-existing errors are in unrelated files:
- `src/app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx` — empty block, missing dep
- `src/app/(dashboard)/dashboard/providers/[id]/edit/delivery/page.tsx` — unused import
- `src/components/layout/Header.tsx` — unused function
- `src/components/providers/MobileProviderDetail.tsx` — unused vars
- `src/components/providers/ProviderEditForm.tsx` — unused vars
- `src/features/search/components/SearchBar.tsx` — unused vars
- `src/lib/enrichment/delivery-enricher.ts` — unused import
- `src/lib/enrichment/delivery-platform/ubereats-client.ts` — unused params
- `src/lib/enrichment/delivery-platform/ubereats-enricher.ts` — unused import
- `src/features/providers/components/ProviderDetailSections.tsx` — non-null assertion

**No lint regressions introduced.** ✅

## Code Diff Summary

### Files changed (4)

| File | Change | Status |
|------|--------|--------|
| `src/services/providers.ts:781-799` | Added optional `section?: Section` param to `fetchPopularCities()`. Adds `.eq('listing_type', section)` when provided. Backward compatible. | ✅ Correct |
| `src/app/(public)/search/page.tsx:168-187` | Changed `useEffect` dep from `[]` to `[selectedSection]`. Passes `selectedSection` to `fetchPopularCities(500, selectedSection)`. | ✅ Correct |
| `src/app/(public)/search/page.tsx:515-579` | Removed `popularCities = cityCounts.slice(0, 3)`. Passes `cityCounts` (full array) as `popularCities` prop to `WoCityResults`. | ✅ Correct |
| `src/features/search/components/WoCityResults.test.tsx` | Added 2 regression tests: selected city and recent search outside top 3 show correct count. | ✅ Correct |

### New file

| File | Change | Status |
|------|--------|--------|
| `src/__tests__/regression/plan170-provider-count-regression.test.ts` | 4 tests: section filter `.eq()`, no-section backward compat, ummah/store sections. | ✅ Correct |

## Root Cause Verification

| Root Cause | Fix Applied | Status |
|------------|-------------|--------|
| 1. `fetchPopularCities()` ignores section context | Added `.eq('listing_type', section)` when section param provided | ✅ |
| 2. City counts never refetch on section change | Dep changed from `[]` to `[selectedSection]` | ✅ |
| 3. `countByCity` Map built from top 3 only | Passes full `cityCounts` instead of `slice(0, 3)` | ✅ |

## Issues Found

**None.** All changes are correct, type-safe, tested, and backward compatible. The 3 pre-existing test failures are unrelated to Plan 170.

## Overall Verdict

**PASS** ✅

All acceptance criteria met:
- Section-filtered provider counts in "Wo" accordion
- City counts refetch on section tab change
- Selected cities and recent searches outside top 3 show correct counts
- Full test coverage with passing regression tests
- Type-check passes clean
- No lint regressions
- Backward compatible (no-section callers unchanged)
