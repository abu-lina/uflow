---
ID: 215
Origin: 215
UUID: 140019f7
Status: Committed
---

# Implementation 215 — iOS PWA Geolocation Hang Watchdog (Near Me)

## Plan Reference
- Plan: `agent-output/planning/215-near-me-ios-pwa-geolocation-plan.md`
- Analysis: `agent-output/analysis/215-near-me-iphone-se-analysis.md`
- Prior implementation (contract): `agent-output/implementation/closed/212-near-me-pwa-fix-implementation.md`
- Prior implementation (denied hints): `agent-output/implementation/closed/209-near-me-denied-ux-guidance-implementation.md`

## Date
- 2026-08-16

## Changelog
| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-08-16T23:00Z | Implementer | Initial implementation | Started M1-M5 execution, TDD red phase for watchdog/standalone/logging |
| 2026-08-16T23:20Z | Implementer | Validation + artifacts | Completed code/test/version updates; recorded gate results |
| 2026-08-16T23:45Z | Implementer | Code review remediation | Reordered `typeof navigator` guard in `isStandaloneDisplayMode`; added `unavailable` outcome log; added regression tests for both |
| 2026-08-16T23:50Z | devops | Stage 1 lifecycle commit | Status: Committed — release v0.15.16 |

## Implementation Summary
Implemented a client-side geolocation hang watchdog so the Near Me flow on iPhone SE standalone PWA always reaches a terminal, actionable state instead of staying stuck in `prompting` forever.

Changes:
- `useGeolocation.ts` now arms a 12,000 ms `setTimeout` watchdog when `requestLocation()` is called. If iOS/WKWebView suppresses the permission prompt and neither the success nor error callback fires, the watchdog forces a terminal state at the deadline: `denied` in standalone mode (so Plan 209's `permissionDeniedHintIos` is surfaced) and `timeout` otherwise.
- Added exported `isStandaloneDisplayMode()` helper that detects standalone via `navigator.standalone === true` or `matchMedia('(display-mode: standalone)').matches`. The `typeof navigator !== 'undefined'` guard is now evaluated before any read of `navigator`, so the helper is safe in SSR / non-browser contexts.
- Watchdog is cleared on success, error, `reset()`, and unmount — preventing double-fire, late overrides, and setState-after-unmount warnings.
- Added Normal-level outcome logging `{ status, errorCode?, standalone, elapsedMs }` on every terminal transition, including the `unavailable` branch, with `forcedByWatchdog: true` on watchdog-forced paths so the two failure modes are distinguishable in production logs.
- `SearchMap.tsx` now logs `setView` executed and `setView skipped (mapRef null)` on the near-me pan path.
- `HomeSearchBar.tsx` required no code change: the existing `geoStatus === 'denied'` branch already renders Plan 209's iOS Settings hint.
- Bumped version to `0.15.16` and added CHANGELOG entry.

Value delivery against plan objective:
- The geolocation request always resolves or fails with guidance; no silent hang.
- iOS standalone PWA users see the existing "Standort gesperrt. Öffne Einstellungen → ..." recovery hint.
- Outcome logs make device-specific failures diagnosable from production telemetry.

## Baseline & Measurements
- Baseline/target from plan retained.
- On-device timing and wording validation remain deferred to QA/UAT per plan M6 gate.

## Milestones Completed
- [x] M1 — TDD red phase: watchdog + standalone + instrumentation tests
- [x] M2 — Implement watchdog + standalone detection + outcome logging in `useGeolocation`
- [x] M3 — `SearchMap` setView executed/skipped logging
- [x] M4 — Verify `HomeSearchBar` terminal-state surfacing (no code change required)
- [x] M5 — Version bump + CHANGELOG
- [ ] M6 — On-device UAT gate (requires user's iPhone SE; human gate)

## Files Modified
| File | Changes | Approx lines |
| --- | --- | --- |
| `src/hooks/useGeolocation.ts` | Added watchdog, standalone helper, outcome logging, unmount/reset cleanup, navigator guard fix | +95 / -10 |
| `src/features/search/components/SearchMap.tsx` | Added `setView` executed/skipped logging and defensive null-map guard | +18 / -2 |
| `src/__tests__/hooks/useGeolocation.test.ts` | Added 12 watchdog/standalone/logging regression tests (including review-fix regressions) | +310 |
| `src/features/search/components/SearchMap.test.tsx` | Added 2 setView logging regression tests | +35 |
| `package.json` | Version bump `0.15.15 -> 0.15.16` | 1 |
| `package-lock.json` | Version alignment to `0.15.16` | generated |
| `CHANGELOG.md` | Added Plan 215 entry under `## [0.15.16] - 2026-08-16` | +6 |

## Files Created
| File | Purpose |
| --- | --- |
| `agent-output/implementation/215-ios-pwa-geolocation-implementation.md` | Implementation artifact for Plan 215 |

## Code Quality Validation
- [x] Targeted lint on modified files passes:
  - `npx eslint src/hooks/useGeolocation.ts src/features/search/components/SearchMap.tsx src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx`
- [x] Type check passes:
  - `npm run type-check`
- [x] Full test suite passes:
  - `npx vitest run`
  - Result: `233 passed | 2 skipped` files, `1906 passed | 24 skipped` tests
- [x] Build passes:
  - `npm run build` exits `0` (route optimization completes; `DYNAMIC_SERVER_USAGE` warnings are pre-existing `/city/[cityName]` static-generation issues unrelated to Plan 215)
- [ ] Full-repo lint passes:
  - `npm run lint` fails due pre-existing unrelated repository errors outside Plan 215 scope (40 errors / 163 warnings; examples: `src/app/api/chat/route.ts`, `src/features/chat/services/tool-executor.ts`, `src/components/layout/Header.tsx`)

## Value Statement Validation
Original value statement:
- As an iPhone SE user running the ummahflow.com standalone PWA, tapping Near Me should either pan the map to my location or, if location cannot be resolved, show clear next-step guidance.

Implementation delivery:
- A hung `getCurrentPosition` call now transitions out of `prompting` to a terminal state after ~12 s.
- Standalone mode maps the hang to `denied`, which reuses Plan 209's iOS Settings hint.
- Non-standalone browsers map the hang to `timeout`, surfacing the existing "Standort nicht verfügbar" label.
- `SearchMap` logs whether the pan executed or was skipped, closing the diagnostics gap.

## TDD Compliance
| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `useGeolocation` watchdog → `timeout` (non-standalone hang) | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | Test timed out / status never left `prompting` | ✅ Yes |
| `useGeolocation` watchdog → `denied` (standalone hang) | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | Test timed out / status never left `prompting` | ✅ Yes |
| `useGeolocation` watchdog cleared on success | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | Test timed out / late watchdog overrode `granted` | ✅ Yes |
| `useGeolocation` watchdog cleared on error | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | Test timed out / late watchdog overrode browser error | ✅ Yes |
| `useGeolocation` `reset()` clears in-flight watchdog | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ⚠️ No observable pre-fix failure (no watchdog existed to leak) | N/A — safety guard | ✅ Yes |
| `isStandaloneDisplayMode()` helper | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | `TypeError: isStandaloneDisplayMode is not a function` | ✅ Yes |
| `useGeolocation` outcome log `{ status, errorCode?, standalone, elapsedMs }` | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: logApp not called with expected outcome shape` | ✅ Yes |
| `useGeolocation` `unavailable` outcome log | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: logApp not called for unavailable branch` | ✅ Yes |
| `isStandaloneDisplayMode()` navigator-absent guard | `src/__tests__/hooks/useGeolocation.test.ts` | ✅ Yes | ✅ Yes | `ReferenceError: navigator is not defined` | ✅ Yes |
| `SearchMap` setView executed/skipped logging | `src/features/search/components/SearchMap.test.tsx` | ✅ Yes | ✅ Yes | `AssertionError: logApp not called with expected setView event` | ✅ Yes |

**Note on intent #5:** The `reset()` cleanup test is a safety/regression guard. Before the watchdog existed there was no timer to leak, so the assertion that status stays `idle` already passed. The implementation still clears the watchdog on reset and unmount, satisfying the acceptance criterion and preventing setState-after-unmount.

## Test Coverage
- Unit / hook:
  - Watchdog terminal transitions (timeout, denied)
  - Watchdog teardown on success/error/reset/unmount
  - Standalone detection helper, including navigator-absent SSR/non-browser guard
  - Outcome log shape on all terminal transitions, including `unavailable`
- Component:
  - `SearchMap` setView executed and skipped log branches
- Regression:
  - Existing Near-Me suites (`HomeSearchBar`, `plan212-near-me-viewport`, `useNearMeToggle`) remain green and now exercise the new geolocation outcome log path.

## Test Execution Results
| Command | Result |
| --- | --- |
| `npx vitest run src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx` | Red phase captured: 11 failed (watchdog tests timed out, standalone helper `TypeError`, SearchMap log assertions failed) |
| `npx vitest run src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx` | Green after implementation: 23 passed |
| `npx vitest run src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx src/__tests__/hooks/useNearMeToggle.test.tsx` | Pass: 49 passed |
| `npx vitest run src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx` | Review-fix red phase: 2 failed (`ReferenceError: navigator is not defined`, `AssertionError: logApp not called for unavailable`) |
| `npx vitest run src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx` | Review-fix green: 24 passed |
| `npx vitest run` | Pass: `233 passed | 2 skipped` files, `1906 passed | 24 skipped` tests |
| `npm run type-check` | Pass |
| `npx eslint src/hooks/useGeolocation.ts src/features/search/components/SearchMap.tsx src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx` | Pass |
| `npm run lint` | Fail — pre-existing unrelated repo lint errors |
| `npm run build` | Pass (exit 0) |

## Required Trace Audits
- Search/Filter Client-Interaction Trace: N/A — no query-param submit lifecycle changes.
- Multi-Plan State Audit: N/A — no prior-plan hydration mutation conflicts in touched state paths.
- API Route Coverage Gate: N/A — no API route changes.
- Local verification: ⚠️ Blocked — no browser/manual PWA device validation in this terminal-only run; on-device iPhone SE verification remains QA/UAT M6 gate.

## Versioning Notes
- Version bumped to `0.15.16`.
- Lockfile alignment completed with `npm install --package-lock-only` and verified root lockfile version lines (`version: 0.15.16` in both top-level and `packages[""]`).

## Outstanding Items
1. Full-repo lint gate is red due unrelated existing lint errors outside Plan 215 scope.
2. Manual iPhone SE PWA behavior verification pending QA/UAT M6 gate (closes Plan 212 DF-3).
3. If UAT reveals the `denied` wording is misleading when location is already "Allow" in Safari settings, open a follow-up for neutral wording per plan risk R1.

## Next Steps
1. Code Reviewer: verify Plan 215 implementation + regression coverage.
2. QA: run regression suite and prepare UAT/iPhone SE standalone PWA scenario per plan M6.
3. DevOps: confirm final patch version at Stage 1 and proceed with release pipeline.
