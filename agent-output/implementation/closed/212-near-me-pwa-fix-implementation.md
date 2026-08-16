---
ID: 212
Origin: 212
UUID: 4c9e1a7d
Status: Committed
---

# Implementation 212 - Near Me Map Viewport Fix (iPhone SE PWA)

## Plan Reference
- Plan: `agent-output/planning/212-near-me-pwa-fix-plan.md`
- Critique: `agent-output/critiques/closed/212-near-me-pwa-fix-critique.md`
- Issue: https://github.com/abu-lina/uflow/issues/316

## Date
- 2026-08-16

## Changelog
| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-08-16T12:15Z | Implementer | Initial implementation | Started M1-M5 execution, entered TDD red phase |
| 2026-08-16T14:12Z | Implementer | Validation + artifacts | Completed code/test/version updates; recorded gate results and blockers |
| 2026-08-16T14:15Z | Implementer | Code review remediation | Fixed recenter-on-rerender behavior and restored near-me callback compatibility; added regression tests |

## Implementation Summary
Implemented the Near Me flow refactor so home-page geolocation ownership is centralized in `RootPageContent` via `useGeolocation`, while `SearchMap` is now a pure display component that pans only from parent-provided `userCoords`. This removes duplicate geolocation code, enforces timeout-backed status transitions through the shared hook, and fixes the user-visible mismatch where the chip became active before map movement.

Value delivery against plan objective:
- Near Me map movement now depends on confirmed granted coordinates, not optimistic boolean toggling.
- Near Me chip visual state now maps to geolocation lifecycle (`idle`, `prompting`, `granted`, denied-like states).
- Toggle-off behavior now uses `reset()` and preserves current map viewport (no centroid snap-back).

## Baseline & Measurements
- Baseline/target from plan retained.
- On-device timing measurement remains deferred to QA/UAT per plan gate.

## Milestones Completed
- [x] M1 - Refactor `RootPageContent` geolocation ownership
- [x] M2 - Refactor `SearchMap` to `userCoords` prop and remove internal geolocation API call
- [x] M3 - Update `HomeSearchBar` chip state to `geoStatus` lifecycle
- [x] M4 - Add/extend regression tests (5 test intents covered)
- [x] M5 - Version artifacts (`package.json`, `package-lock.json`, `CHANGELOG.md`)

## Files Modified
| File | Changes | Approx lines |
| --- | --- | --- |
| `src/components/shared/RootPageContent.tsx` | Replaced local Near Me boolean flow with `useGeolocation`, derived `userCoords`, request/reset handling, new props to child components | +25 / -8 |
| `src/features/search/components/SearchMap.tsx` | Replaced `isNearMe` prop with optional `userCoords`, removed `getCurrentPosition`, added parent-driven pan effect | +8 / -17 |
| `src/features/search/components/HomeSearchBar.tsx` | Added `geoStatus` prop, active/prompting/denied UI states, i18n chip labels, updated Near Me callback contract | +22 / -10 |
| `src/features/search/components/SearchMap.test.tsx` | Added pan and source-guard regression tests, lint cleanup | +29 / -4 |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | Added geoStatus visual-state regressions and i18n mock keys | +30 / -0 |
| `package.json` | Version bump `0.15.13 -> 0.15.14` | 1 |
| `package-lock.json` | Version alignment to `0.15.14` | generated |
| `CHANGELOG.md` | Added Plan 212 fix entry dated 2026-08-16 | +6 |
| `agent-output/planning/212-near-me-pwa-fix-plan.md` | Status to `In Progress`; implementation-start changelog row | +2 |

## Files Created
| File | Purpose |
| --- | --- |
| `src/__tests__/regression/plan212-near-me-viewport.test.tsx` | Regression guard for RootPageContent Near Me request/reset wiring (F2 path) |
| `agent-output/implementation/212-near-me-pwa-fix-implementation.md` | Implementation artifact for Plan 212 |

## Code Quality Validation
- [x] Targeted lint on modified files passes:
  - `npx eslint src/components/shared/RootPageContent.tsx src/features/search/components/SearchMap.tsx src/features/search/components/HomeSearchBar.tsx src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx`
- [x] Type check passes:
  - `npm run type-check`
- [x] Full test suite passes:
  - `npx vitest run`
  - Result: `233 passed | 2 skipped` files, `1881 passed | 24 skipped` tests
- [ ] Full-repo lint passes:
  - `npm run lint` fails due pre-existing repo errors unrelated to Plan 212 changes
  - Examples: `src/app/api/chat/route.ts` (`no-control-regex`, `no-empty`, `no-useless-escape`), `src/app/(public)/chat/page.tsx` (`react/jsx-sort-props`), `src/components/layout/Header.tsx` (`no-unused-vars`)
- [ ] Build passes:
  - `npm run build` fails in environment due missing `NEXT_PUBLIC_SUPABASE_URL` during page data collection for `/api/badges/entity`

## Value Statement Validation
Original value statement:
- As an iPhone SE PWA user, tapping Near Me should pan/zoom to actual location quickly and accurately.

Implementation delivery:
- `SearchMap` now pans to coordinates only when provided by granted geolocation state.
- Near Me chip no longer claims success before location acquisition.
- Prompting/denied visual states make geolocation progress and failure explicit.

## TDD Compliance
| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `SearchMap` prop-driven near-me pan behavior | `src/features/search/components/SearchMap.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: map stayed at Germany centroid `[51.1657, 10.4515], 6` instead of user coords `[52.52, 13.405], 14` | ✅ Yes |
| `SearchMap` internal geolocation removal guard | `src/features/search/components/SearchMap.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: source still contained `getCurrentPosition` | ✅ Yes |
| `HomeSearchBar` geoStatus prompting/granted behavior | `src/__tests__/features/search/HomeSearchBar.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: geoStatus-driven visual class behavior not present pre-fix | ✅ Yes |
| `RootPageContent` Near Me request/reset wiring | `src/__tests__/regression/plan212-near-me-viewport.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: `requestLocation` not called pre-fix path; boolean state toggled instead | ✅ Yes |
| `SearchMap` unchanged-coords rerender guard | `src/features/search/components/SearchMap.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: `setView` called 3 times instead of 2 on unchanged rerender | ✅ Yes |
| `HomeSearchBar` callback compatibility | `src/__tests__/features/search/HomeSearchBar.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: callback received click event instead of boolean next state | ✅ Yes |

## Test Coverage
- Unit:
  - `SearchMap` behavior and source guard
  - `HomeSearchBar` chip lifecycle states
- Regression:
  - RootPageContent wiring from chip tap to hook (`requestLocation`/`reset`)

## Test Execution Results
| Command | Result |
| --- | --- |
| `npm run test -- src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx` | Initial run blocked by missing local deps (`vitest: command not found`) |
| `npm install` | Completed; enabled local test runner |
| `npx vitest run src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx` | Pass (18/18 tests) |
| `npx vitest run src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx` | Red phase captured 2 expected failures for code-review findings |
| `npx vitest run src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx` | Pass after remediation (20/20 tests) |
| `npx vitest run` | Pass (full suite) |
| `npm run type-check` | Pass |
| `npm run lint` | Fail (pre-existing unrelated repo errors) |
| `npm run build` | Fail in local env (`NEXT_PUBLIC_SUPABASE_URL` missing) |

## Required Trace Audits
- Search/Filter Client-Interaction Trace: N/A - no search param builder/submit lifecycle changes in this plan.
- Multi-Plan State Audit: N/A - no prior-plan hydration mutation conflicts in touched state paths.
- API Route Coverage Gate: N/A - no API route changes.
- Local verification: ⚠️ Blocked - no browser/manual PWA device validation in this terminal-only run; on-device iPhone SE verification remains QA/UAT gate.

## Versioning Notes
- Version bumped to `0.15.14` (preliminary - final version confirmed at DevOps Stage 1).
- Lockfile alignment completed with `npm install --package-lock-only` and verified root lockfile version lines.

## Outstanding Items
1. Full-repo lint baseline contains existing errors outside Plan 212 scope; cannot mark lint gate fully green without separate cleanup.
2. Local `npm run build` blocked by missing required Supabase env var in this worktree.
3. Manual iPhone SE PWA behavior verification pending QA/UAT.

## Next Steps
1. Code Reviewer: verify Plan 212 implementation + regression coverage.
2. QA: run UAT/iPhone SE standalone PWA scenario per plan on-device gate.
3. DevOps: confirm final patch version at Stage 1 and proceed with release pipeline.
