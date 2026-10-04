---
ID: 217
Origin: 217
UUID: e7b4f2a9
Status: In Review
---

# Code Review: Plan 217 — Fix "Near me" on the Home List View

**Plan Reference**: `agent-output/planning/217-near-me-list-fix-plan.md`
**Implementation Reference**: `agent-output/implementation/217-near-me-list-fix-implementation.md`
**Analysis Reference**: `agent-output/analysis/217-near-me-bug-analysis.md`
**Critique Reference**: `agent-output/critiques/217-plan-critique.md`
**Date**: 2026-08-17
**Reviewer**: Code Reviewer

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-08-17 | Implementer → Code Reviewer | Review Plan 217 implementation on `fix/217-near-me-list-fix` | Reviewed git diff `origin/main...HEAD`, all new/modified source files, tests, and validation evidence. |
| 2026-08-17 | Implementer → Code Reviewer | Re-check loading-state flash fix | Verified `useHomeNearMe` now derives `isLoading` from `hasFetched`/`isFetching`; new regression test asserts first-active-render loading; targeted tests pass. |

## Self-Check

Scanned `agent-output/code-review/` (excluding `closed/`). No documents with terminal status (`Committed`, `Released`, `Abandoned`, `Deferred`, `Superseded`, `Resolved`) were found outside `closed/`. No orphan closure required.

## Architecture Alignment

**System Architecture Reference**: `docs/architecture/ARCHITECTURE_OVERVIEW.md`
**Alignment Status**: ALIGNED

The implementation follows the Architect-approved plan exactly:

- Reuses the existing `search_food_near_me` RPC (no new backend work).
- Adds a focused `useHomeNearMe` adapter hook instead of pulling in the URL-param-driven search-page hook stack (D3).
- Adds a thin `HomeNearMeList` component rather than reusing bookmark-coupled `NearMeResultsGrid` (D4).
- Leaves `HomeListView`, `SearchMap`, `useGeolocation`, and `searchFoodNearMe` untouched (D8).
- Keeps all new files in the correct domain locations (`src/features/search/hooks/`, `src/features/search/components/`).
- No URL state invented; no schema changes; no new services.

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Concerns**: None. The implementation doc records red-first failures for all three test surfaces (`useHomeNearMe`, `HomeNearMeList`, `RootPageContent` wiring) and reports green after implementation.

## Findings

### Critical

None.

### High

None.

### Medium

**[MEDIUM] [RESOLVED] Hook loading state can flash the empty state on activation**
- **Location**: `src/features/search/hooks/useHomeNearMe.ts:24-25`, `src/features/search/hooks/useHomeNearMe.ts:42-100`
- **Issue**: `isLoading` is initialized to `false` and only set to `true` inside `useEffect`. When the hook transitions from inactive to active (e.g., user switches from Map to List after granting location, or grants location while already in List view), React renders `HomeNearMeList` once with `isLoading=false` and `results=[]` before the effect commits and sets `isLoading=true`. That single frame renders the empty state ("No open restaurants nearby") instead of the `SkeletonGrid`, violating the behavior spec's loading state and producing a visible flicker.
- **Recommendation**: Derive `isLoading` so it is `true` whenever the hook is active and the initial fetch has not yet completed. One compact pattern:
  ```ts
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  // in effect: setIsFetching(true) before the RPC, setHasFetched(true) + setIsFetching(false) on settle
  const isLoading = isActive && (!hasFetched || isFetching);
  ```
  Reset `hasFetched`/`isFetching` when inactive so the next activation starts in the loading state.
- **Why not blocking**: The steady-state behavior is correct; this is a transient UI flash, not a data-loss or functional bug.
- **Resolution**: Implementer replaced `isLoading` state with `isFetching` + `hasFetched` flags, derives `isLoading = isActive && (!hasFetched || isFetching)`, resets both flags on deactivation, and added a TDD regression test that hangs the RPC and asserts `isLoading === true` on the very first active render. Verified with `npx vitest run src/__tests__/hooks/useHomeNearMe.test.tsx src/__tests__/regression/plan217-near-me-list.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx` (12 tests passed) and `npx tsc --noEmit && npx eslint` (clean).

### Low / Info

**[LOW] `home_list_nearme_skipped` can log more than once per transition**
- **Location**: `src/components/shared/RootPageContent.tsx:100-107`
- **Issue**: The effect fires whenever `viewMode`, `userCoords`, or `geolocation.status` changes. If the user is in List view without location and `geolocation.status` moves `idle → prompting → denied`, the event is emitted twice for what the plan describes as a single skipped transition.
- **Recommendation**: Acceptable instrumentation noise, but consider tracking the previous emitted `(viewMode, userCoords, status)` tuple and only logging when it changes. Not required for approval.

**[LOW] Regression test cannot literally run red against pre-fix code**
- **Location**: `src/__tests__/regression/plan217-near-me-list.test.tsx:1-181`
- **Issue**: As noted in Architect finding F-217-5, the regression test mocks modules that did not exist pre-fix, so its "pre-fix FAILS" claim is by module-resolution failure rather than a behavioral assertion against the old `HomeListView` path. The post-fix behavioral assertion (near-me active → `home-near-me-list` renders) is sound and is layered on top of unit/component tests that do exercise the real behavior.
- **Recommendation**: Already acknowledged in the implementation doc. No change required.

**[LOW] Test uses `fireEvent.click` instead of `@testing-library/user-event`**
- **Location**: `src/__tests__/features/search/HomeNearMeList.test.tsx:84`
- **Issue**: The retry-button test uses `fireEvent.click`. The repo generally prefers `userEvent.click` for closer-to-user interaction, but this is a single test helper call and does not affect correctness.
- **Recommendation**: Optional style cleanup; not blocking.

## Positive Observations

- **Clean separation of concerns**: `useHomeNearMe` owns data fetching/filtering/logging; `HomeNearMeList` owns presentation; `RootPageContent` owns the conditional render. Each file is small and focused.
- **Defensive category handling**: `category_name_de ?? category_name_en ?? ''` and `category_images ?? undefined` mirror `NearMeResultsGrid` and protect against the DEV migration-122 drift (D7).
- **Privacy-aware logging**: Coordinates are truncated to 4 decimals (~11 m) before logging, which is appropriate for a user-location telemetry event.
- **Stale-response guard**: The `cancelled` flag in the hook effect prevents in-flight RPC results from overwriting newer state when `refetch` or view-mode toggles race.
- **Layout parity**: `HomeNearMeList` copies the fixed inset scroll wrapper, grid classes, bottom safe-area padding, and keyboard-clickable card wrapper from `HomeListView`, so the near-me list should scroll and feel identical.
- **Open-now interplay is correct**: `filterOpenNow` is applied to RPC results and is order-preserving, matching the search-page behavior and the plan spec.
- **No Map-branch regression**: `SearchMap` still receives `pins` and `userCoords`; the Map branch is unchanged.
- **Commit hygiene**: Exactly 11 files in the diff as planned; `package.json`/`package-lock.json` versions are aligned at `0.15.18`; CHANGELOG entry is present under `[Unreleased]`.

## Verdict

**Status**: APPROVED

**Rationale**: The implementation matches the approved plan, passes the reported static and test gates (`type-check`, `vitest`, `build`), introduces no security or architectural concerns, and correctly wires the home List view to the existing `search_food_near_me` RPC with distance badges and open-now interplay. All findings are resolved or informational; the implementation is ready for QA.

## Required Actions

1. **(Optional)** Reduce `home_list_nearme_skipped` log noise by de-duping consecutive identical emissions.
2. **(Optional)** Replace `fireEvent.click` with `userEvent.click` in `HomeNearMeList.test.tsx` for consistency with repo conventions.

## Next Steps

- Route to **QA** for functional sign-off and manual device verification (geolocation grant/deny on home List view, distance ordering, ≤25 km radius, open-now interplay).
- No blocking findings remain; QA can proceed directly to functional sign-off.
- **DevOps** creates the PR and confirms `v0.15.18` release readiness.
