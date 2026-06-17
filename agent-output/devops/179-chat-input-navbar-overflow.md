# DevOps Release: Chat Input Navbar Overflow Fix

**Plan ID**: 179
**Plan Reference**: `agent-output/planning/179-chat-input-navbar-overflow.md`
**QA Evidence**: `agent-output/qa/179-chat-input-navbar-overflow.md`
**PR**: https://github.com/abu-lina/uflow/pull/256
**Date**: 2026-06-17

## Changelog

### Fixed
- Prevent mobile bottom navbar (MobileFooterBar) from overlapping the chat input on `/chat` page by adding `MobileFooterBar`, `CityEarlyAccessNavbar`, and `/chat` to component exclusion lists in `src/utils/navigationUtils.ts`
- Add `/chat` to `footerExcludedPages` in both Stage 3 (`isAppLaunched`) and Stage 1/2 paths
- Add `/chat` to `excludedPages` in `shouldShowCityEarlyAccessNavbar`

## Summary of Changes

| File | Change |
|------|--------|
| `src/utils/navigationUtils.ts` | 3 array additions to exclusion lists |
| `src/__tests__/utils/navigationUtils-179.test.ts` | 11 new tests covering all exclusion paths |

All entries follow the existing exact-match pattern used by other excluded routes (`/signup/check-email`, `/waitlist`, `/about`, `/city-selection`, etc.).

## QA Evidence

- **Tests**: 11/11 passed (new tests), 9/9 passed (pre-existing Plan 062 tests)
- **TypeScript**: Clean `tsc --noEmit` (zero errors)
- **Regressions**: None

Full details: `agent-output/qa/179-chat-input-navbar-overflow.md`

## Deployment Instructions

Standard bugfix deploy:
1. Merge PR #256 into `main`
2. Deploy via existing CI/CD pipeline on `main`
3. Verify `/chat` page no longer shows bottom navbar overlap on mobile viewports

## Status

**PR Created**: Yes (https://github.com/abu-lina/uflow/pull/256)
**Merged**: No — pending user approval
**Deployed**: No — pending merge and deploy
