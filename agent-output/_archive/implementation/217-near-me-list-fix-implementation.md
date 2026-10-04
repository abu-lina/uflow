---
ID: 217
Origin: 217
UUID: e7b4f2a9
Status: Active
---

# Implementation — Plan 217: Fix "Near me" on the Home List View

## Changelog

| Date (UTC) | Agent | Action |
| --- | --- | --- |
| 2026-08-17 | Implementer | Completed M1–M5 implementation, validation, and branch push. |
| 2026-08-17 | Implementer | Applied Code Reviewer MEDIUM follow-up: fixed loading-state flash on activation and added TDD regression test. |

## Plan Reference

- **Plan**: [217-near-me-list-fix-plan.md](../planning/217-near-me-list-fix-plan.md)
- **Analysis**: [217-near-me-bug-analysis.md](../analysis/217-near-me-bug-analysis.md)
- **Critique**: [217-plan-critique.md](../critiques/217-plan-critique.md) — APPROVED, 6 non-blocking findings
- **Code Review**: [217-code-review.md](../code-review/217-code-review.md) — APPROVED w/ 1 MEDIUM follow-up (fixed)
- **Branch**: `fix/217-near-me-list-fix`

## Implementation Summary

This fix makes the home **List view** consume the same near-me signal that the Map view already used. A new `useHomeNearMe` hook fetches distance-ordered, radius-filtered results from the existing `search_food_near_me` RPC (≤25 km), and a new `HomeNearMeList` component renders them with `ProviderCard` distance badges. `RootPageContent` now switches the list branch to `HomeNearMeList` when near-me is active, while leaving the Map branch and `HomeListView` completely untouched.

All new code was written TDD-first: failing tests were created before the implementation, then made green. The existing `plan212` test was updated with additive mocks so it stays isolated from the new list consumer.

## Milestones Completed

- [x] M1 — `useHomeNearMe` hook + unit tests
- [x] M2 — `HomeNearMeList` component + tests
- [x] M3 — `RootPageContent` wiring + regression test
- [x] M4 — Instrumentation (`home_list_nearme_*`) + `plan212` mock updates
- [x] M5 — Version bump to `0.15.18` + CHANGELOG entry
- [x] Code Review follow-up — fixed loading-state flash on activation

## Code Review Follow-up (MEDIUM finding)

**Finding**: `useHomeNearMe` initialized `isLoading` to `false`, so the first render after activation could flash the empty state before the effect set `isLoading=true`.

**Fix**: Replaced the `isLoading` state with `isFetching` + `hasFetched` flags and derived `isLoading = isActive && (!hasFetched || isFetching)`. This guarantees the first active render reports loading, while refetches keep existing results on screen. The flags reset when the hook becomes inactive so the next activation starts in the loading state.

**TDD regression test**: Added `active state reports isLoading true on the very first render before the effect fires` to `src/__tests__/hooks/useHomeNearMe.test.tsx`. It captures the render-phase `isLoading` value with a hanging RPC and asserts it is `true`.

## Files Created

| # | File | Purpose |
| --- | --- | --- |
| 1 | `src/features/search/hooks/useHomeNearMe.ts` | Effect-based hook that fetches `search_food_near_me` results, applies `filterOpenNow`, guards stale responses, and emits `home_list_nearme_*` logs. |
| 2 | `src/__tests__/hooks/useHomeNearMe.test.tsx` | 7 TDD unit tests covering activation, disabled states, RPC args, distance-order preservation, open-now interplay, error propagation, and refetch. |
| 3 | `src/features/search/components/HomeNearMeList.tsx` | Renders `NearMeFoodResult[]` with distance badges, mirroring `HomeListView` scroll wrapper and grid. |
| 4 | `src/__tests__/features/search/HomeNearMeList.test.tsx` | 5 TDD component tests for loading, error + retry, empty, result order, and distance/category prop forwarding. |
| 5 | `src/__tests__/regression/plan217-near-me-list.test.tsx` | Pre/post-fix regression: granted + list renders near-me list; denied/idle + list keeps `HomeListView`; map view stays `SearchMap`. |
| 6 | `agent-output/implementation/217-near-me-list-fix-implementation.md` | This implementation artifact. |

## Files Modified

| # | File | Changes | Lines |
| --- | --- | --- | --- |
| 1 | `src/components/shared/RootPageContent.tsx` | Imported `useHomeNearMe`, `HomeNearMeList`, and `logApp`; added `homeNearMe` hook call; added `home_list_nearme_skipped` log effect; conditionally rendered `HomeNearMeList` in the `viewMode === 'list'` branch. | ~+40 / -6 |
| 2 | `src/__tests__/regression/plan212-near-me-viewport.test.tsx` | Added additive `vi.mock` for `useHomeNearMe` (inactive) and `HomeNearMeList` (stub). | +14 |
| 3 | `package.json` | Bumped `version` to `0.15.18`. | +1 / -1 |
| 4 | `package-lock.json` | Lockfile regenerated; version aligned to `0.15.18`. | +1 / -1 |
| 5 | `CHANGELOG.md` | Added `[Unreleased] - 2026-08-17` entry for Plan 217. | +7 |
| 6 | `src/features/search/hooks/useHomeNearMe.ts` | Follow-up fix: replaced `isLoading` state with `isFetching`/`hasFetched` flags; derived `isLoading` so the first active render reports loading. | ~+8 / -6 |
| 7 | `src/__tests__/hooks/useHomeNearMe.test.tsx` | Added regression test asserting `isLoading` is `true` on the first render before the effect fires. | +20 |

## Code Quality Validation

| Check | Result | Notes |
| --- | --- | --- |
| `npm run type-check` | ✅ Pass | No TypeScript errors (including after follow-up). |
| `npx eslint <Plan 217 files>` | ✅ Pass | All created/modified Plan 217 files lint clean (including follow-up hook + test). |
| `npx eslint src/features/search/hooks/useHomeNearMe.ts src/__tests__/hooks/useHomeNearMe.test.tsx` | ✅ Pass | Follow-up files lint clean. |
| `npm run lint` (full) | ⚠️ Blocked by pre-existing unrelated errors | 42 errors/164 warnings, all in files outside Plan 217 scope (chat feature files and unrelated pre-existing lint debt). Left untouched per working-tree instructions. |
| `npx vitest run` | ✅ Pass | 1925 tests passed, 24 skipped. |
| `npm run build` | ✅ Pass | Build completed and generated static pages. Dynamic-server warnings for `/city/[cityName]` are pre-existing and non-blocking. |
| Lockfile alignment | ✅ Aligned | `package.json` and `package-lock.json` both show `0.15.18`. |
| i18n self-scan | ✅ Pass | No hardcoded user-visible strings in new component files; all labels route through `t()`. |

## Value Statement Validation

The fix delivers the stated value: mobile users on the home List view can now tap "In der Nähe / Near me" and see providers reordered nearest-first, filtered to ≤25 km, with a distance badge on each card. The Map view, `HomeListView`, `SearchMap`, `useGeolocation`, and `searchFoodNearMe` remain unchanged, so rollback risk is confined to the new list consumer path.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `useHomeNearMe` | `src/__tests__/hooks/useHomeNearMe.test.tsx` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/features/search/hooks/useHomeNearMe"` | ✅ Yes |
| `HomeNearMeList` | `src/__tests__/features/search/HomeNearMeList.test.tsx` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/features/search/components/HomeNearMeList"` | ✅ Yes |
| `RootPageContent` near-me wiring | `src/__tests__/regression/plan217-near-me-list.test.tsx` | ✅ Yes | ✅ Yes | `Unable to find an element by: [data-testid="home-near-me-list"]` (pre-fix rendered `HomeListView`) | ✅ Yes |

## Test Coverage

- **Unit**: `useHomeNearMe` hook (8 tests)
- **Component**: `HomeNearMeList` (5 tests)
- **Regression**: Plan 217 wiring (3 tests) + updated Plan 212 near-me viewport (1 test)

## Test Execution Results

### Original full-suite run

```
npx vitest run
Test Files  236 passed | 2 skipped (238)
     Tests  1925 passed | 24 skipped (1949)
```

### Follow-up targeted runs

```
npx vitest run src/__tests__/hooks/useHomeNearMe.test.tsx
Test Files  1 passed (1)
     Tests  8 passed (8)

npx vitest run src/__tests__/regression/plan217-near-me-list.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx
Test Files  2 passed (2)
     Tests  4 passed (4)
```

All Plan 217 tests pass, and the updated `plan212` test continues to pass.

## Architect F-217-1 Acknowledgment

Per the Architect critique, the near-me list derives open-now status from `locations.opening_hours` (via the RPC), while the normal list and map derive it from `providers.opening_hours`. This is a pre-existing data-source difference that is semantically defensible: near-me shows the *nearest location's* availability. QA should verify behavior for a known multi-location provider when toggling between List and Map with both near-me and open-now active. No code change was made for this finding.

## Outstanding Items

1. **Full `npm run lint`**: Blocked by pre-existing lint errors in unrelated chat feature files. Plan 217 files are clean.
2. **Manual device QA/UAT**: Real-device geolocation grant/deny on the home List view at 320px width; verify distance ordering and ≤25 km radius clamp.
3. **PROD migration-122 drift**: Out of scope per plan D7; DevOps to confirm PROD RPC returns `category_id` / `category_name_*` / `category_images`. The implementation defensively falls back to empty/undefined category props, so it is safe either way.

## Next Steps

- Route back to **Code Reviewer** for re-check of the MEDIUM loading-state fix.
- After Code Reviewer approval, route to **QA** for manual device verification and functional sign-off.
- **DevOps** will create the PR and confirm `v0.15.18` release readiness.
