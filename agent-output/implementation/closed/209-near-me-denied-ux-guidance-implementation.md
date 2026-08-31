---
ID: 209
Origin: 209
UUID: b7e3f41a
Status: Committed
---

# Implementation 209 - Near Me Permission-Denied UX Guidance

## Plan Reference
- Plan: `agent-output/planning/209-near-me-denied-ux-guidance-plan.md`
- Critique: `agent-output/critiques/209-near-me-denied-ux-guidance-critique.md`
- Issue: https://github.com/abu-lina/uflow/issues/319

## Date
- 2026-08-16

## Changelog
| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-08-16T17:30Z | Implementer | Initial implementation | Started Plan 209 execution, TDD red phase added for denied-hint scenarios |
| 2026-08-16T17:55Z | Implementer | Validation + artifacts | Completed M1-M4 code/tests/version updates; recorded gate outcomes and blockers |

## Implementation Summary
Implemented denied-state recovery guidance for Near Me on mobile PWA by adding platform-specific hint text rendered only for `geoStatus === 'denied'`. Both `HomeSearchBar` and `NearMeOpenNowFilters` now keep existing "permission denied" labels for `timeout`/`unavailable` but avoid misleading Settings guidance in those transient/non-permission cases.

Value delivery against plan objective:
- Denied users now get actionable next-step guidance instead of a dead-end label.
- iOS/Android/fallback platform variants are supported.
- Non-denied failures remain unchanged and non-misleading.

## Baseline & Measurements
- Performance baseline not applicable (pure UX text/state behavior change).
- No API/DB measurements required.

## Milestones Completed
- [x] M1 - Added translation keys for denied hints in all 6 locale files
- [x] M2 - Updated `HomeSearchBar` and `NearMeOpenNowFilters` denied-state rendering
- [x] M3 - Added regression tests for platform selection and denied-only guards
- [x] M4 - Updated version artifacts (`package.json`, `package-lock.json`, `CHANGELOG.md`)

## Files Modified
| File | Changes | Approx lines |
| --- | --- | --- |
| `src/features/search/components/HomeSearchBar.tsx` | Added UA-based hint key selection and denied-only hint rendering beneath existing denied label | +14 / -1 |
| `src/features/search/components/NearMeOpenNowFilters.tsx` | Added UA-based hint key selection and denied-only hint rendering beneath existing denied label | +16 / -1 |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | Added TDD regression cases for denied iOS/Android/fallback hints and timeout/unavailable no-hint guards | +59 |
| `src/features/search/components/NearMeOpenNowFilters.test.tsx` | Added TDD regression cases for denied iOS/Android/fallback hints and timeout/unavailable no-hint guards | +101 |
| `src/translations/de.ts` | Added `permissionDeniedHintIos|Android|Fallback` keys | +3 |
| `src/translations/en.ts` | Added `permissionDeniedHintIos|Android|Fallback` keys | +3 |
| `src/translations/tr.ts` | Added `permissionDeniedHintIos|Android|Fallback` keys | +3 |
| `src/translations/ar.ts` | Added `permissionDeniedHintIos|Android|Fallback` keys + RTL review TODO | +4 |
| `src/translations/ur.ts` | Added `permissionDeniedHintIos|Android|Fallback` keys + RTL review TODO | +4 |
| `src/translations/ps.ts` | Added `permissionDeniedHintIos|Android|Fallback` keys + RTL review TODO | +4 |
| `package.json` | Version bump `0.15.14 -> 0.15.15` | 1 |
| `package-lock.json` | Version alignment to `0.15.15` (`npm install --package-lock-only`) | generated |
| `CHANGELOG.md` | Added Plan 209 entry under `## [Unreleased] - 2026-08-16` | +6 |
| `agent-output/planning/209-near-me-denied-ux-guidance-plan.md` | Status `Critique Approved -> In Progress`, implementer start changelog row | +2 |

## Files Created
| File | Purpose |
| --- | --- |
| `agent-output/implementation/209-near-me-denied-ux-guidance-implementation.md` | Implementation artifact for Plan 209 |

## Code Quality Validation
- [x] Type check:
  - `npm run type-check` (passes)
- [x] Full tests:
  - `npm test -- --run` (passes: 233 files passed, 2 skipped; 1893 tests passed, 24 skipped)
- [x] Targeted lint on touched files:
  - `npx eslint src/features/search/components/HomeSearchBar.tsx src/features/search/components/NearMeOpenNowFilters.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/features/search/components/NearMeOpenNowFilters.test.tsx src/translations/de.ts src/translations/en.ts src/translations/tr.ts src/translations/ar.ts src/translations/ur.ts src/translations/ps.ts` (passes)
- [ ] Full-repo lint:
  - `npm run lint` fails due pre-existing unrelated repository errors outside Plan 209 scope (examples: `src/app/api/chat/route.ts`, `src/app/(public)/chat/page.tsx`, `src/app/(public)/saved/page.tsx`)
- [ ] Build:
  - `npm run build` fails in this worktree due missing required env var `NEXT_PUBLIC_SUPABASE_URL` during page-data collection for `/api/admin/badges/verify`

## Value Statement Validation
Original value statement:
- As a mobile PWA user on iOS who has previously denied location permission, I want clear guidance to re-enable location access when tapping Near Me.

Implementation delivery:
- Denied state now includes actionable guidance text keyed by platform.
- Guidance appears only when permission is actually denied.
- Timeout/unavailable states stay neutral and avoid incorrect Settings advice.

## TDD Compliance
| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `HomeSearchBar` denied-hint rendering (iOS/Android/fallback + guards) | `src/__tests__/features/search/HomeSearchBar.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `TestingLibraryElementError`: missing denied guidance text in DOM before implementation | ✅ Yes |
| `NearMeOpenNowFilters` denied-hint rendering (iOS/Android/fallback + guards) | `src/features/search/components/NearMeOpenNowFilters.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `TestingLibraryElementError`: missing denied guidance text in DOM before implementation | ✅ Yes |

## Test Coverage
- Component regression coverage:
  - Denied state: 3 UA paths (iOS/Android/fallback) × 2 components
  - Guard behavior: timeout/unavailable must not render guidance hint × 2 components
- Existing Plan 212 behaviors remain covered and unchanged.

## Test Execution Results
| Command | Result |
| --- | --- |
| `npx vitest run src/__tests__/features/search/HomeSearchBar.test.tsx src/features/search/components/NearMeOpenNowFilters.test.tsx` | Red phase captured expected failures (`Unable to find ... Standort gesperrt ...`) before implementation |
| `npx vitest run src/__tests__/features/search/HomeSearchBar.test.tsx src/features/search/components/NearMeOpenNowFilters.test.tsx` | Green after implementation (`2 passed, 33 tests`) |
| `npm test -- --run` | Pass (`233 passed | 2 skipped` files, `1893 passed | 24 skipped` tests) |
| `npm run type-check` | Pass |
| `npm run lint` | Fail (pre-existing unrelated repo lint errors) |
| `npm run build` | Fail (`NEXT_PUBLIC_SUPABASE_URL` missing in local env) |

## Required Trace Audits
- Search/Filter Client-Interaction Trace: N/A — no query-param submit lifecycle changes.
- Multi-Plan State Audit: N/A — no prior-plan state mutation conflict introduced.
- API Route Coverage Gate: N/A — no API route changes.
- Local verification: ⚠️ Blocked — no browser/device run in this terminal-only environment; on-device iPhone SE verification remains UAT operator step.

## Versioning Notes
- Version bumped to `0.15.15` (preliminary - final version confirmed at DevOps Stage 1).
- Lockfile alignment completed via `npm install --package-lock-only`.

## Outstanding Items
1. Full-repo lint gate is red due unrelated existing lint errors outside Plan 209 scope.
2. Build gate is blocked in this worktree by missing required Supabase env variables.
3. On-device iPhone SE PWA validation still required at UAT.

## Next Steps
1. Confirm whether to proceed despite pre-existing full-lint/build blockers in local environment.
2. If approved, hand off to Code Reviewer with explicit blocker notes.
3. After review approval, QA validates denied-state UX and regression behavior on UAT.
