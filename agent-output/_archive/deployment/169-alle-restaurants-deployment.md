---
ID: 169
Origin: 169
Status: Released
---

# Deployment Report: Plan 169 — "Alle Restaurants" Entry

**Plan Reference**: `agent-output/planning/closed/169-alle-restaurants-plan.md`
**Commit Date**: 2026-06-13
**Prepared By**: DevOps Agent

## Release Summary

| Field | Value |
|-------|-------|
| Version | 0.14.0 (pending MINOR bump at release) |
| Type | MINOR |
| Plan | 169 — Add "Alle Restaurants" entry to search filter |

## Files Changed

| File | Change |
|------|--------|
| `src/translations/de.ts` | Added `allRestaurants: "Alle Restaurants"` |
| `src/translations/en.ts` | Added `allRestaurants: "All Restaurants"` |
| `src/features/search/components/WasCategoryResults.tsx` | Added `'all-restaurants'` type, `LayoutGrid` icon, `shouldShowAllRestaurants` logic |
| `src/app/(public)/search/page.tsx` | Replaced inline `toFoodRecentSearches`/`handleSearch` with imports from `@/lib/search-params` |
| `src/lib/search-params.ts` | **NEW** — `buildSearchParams` and `toFoodRecentSearches` utilities |
| `src/features/search/components/WasCategoryResults.test.tsx` | Added 5 test cases for "Alle Restaurants" |
| `src/__tests__/regression/plan169-alle-restaurants-regression.test.ts` | **NEW** — 5 regression tests |

## Commit Information

| Field | Value |
|-------|-------|
| Commit Hash | `6810b2a6` |
| Commit Message | `feat: reorder filters (Where before What) + add Alle Restaurants option` |
| Branch | `main` |

## Verification Status

| Check | Status |
|-------|--------|
| Code Review | ✅ APPROVED |
| QA | ✅ 12/12 + 5/5 tests passed |
| UAT | ✅ APPROVED FOR RELEASE |
| TypeScript (`npm run type-check`) | ✅ 0 errors |
| Lint (`npm run lint`) | ✅ 0 new issues |
| Tests (`npm test`) | ✅ All passing |
| Debug artifacts | ✅ None found |

## Release Stage Status

**Status**: Committed — awaiting release approval.

This plan is committed locally. A subsequent release workflow (Stage 2) will handle version bump, tagging, and push once all planned plans for the target release are committed and the user approves.
