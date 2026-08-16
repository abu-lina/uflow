---
ID: 215
Origin: 215
UUID: 140019f7
Status: Committed
---

# QA Report: Plan 215 — iOS PWA Geolocation Hang Watchdog (Near Me)

**Plan Reference**: `agent-output/planning/215-near-me-ios-pwa-geolocation-plan.md`
**Analysis Reference**: `agent-output/analysis/215-near-me-iphone-se-analysis.md`
**Implementation Reference**: `agent-output/implementation/215-ios-pwa-geolocation-implementation.md`
**Code Review Reference**: `agent-output/code-review/215-ios-pwa-geolocation-code-review.md` (APPROVED_WITH_COMMENTS; Medium guard fix applied in `58360b22`)
**Branch**: `fix/215-ios-pwa-geolocation`
**Commit Range**: `1cd6389a..58360b22` (commits `3b191d23`, `a2d0cda8`, `58360b22`)
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date (UTC) | Agent | Request | Summary |
|---|---|---|---|
| 2026-08-16T23:10Z | qa | Phase 1 test strategy development | Strategy defined from plan M1-M6 + analysis F9 root cause |
| 2026-08-16T23:15Z | qa | Phase 2 test execution | All automated gates executed and recorded; QA Complete |
| 2026-08-16T23:50Z | devops | Stage 1 lifecycle commit | Status: Committed — release v0.15.16; DF-1 CI gate now exercised via PR |

## Timeline

- **Test Strategy Started**: 2026-08-16T23:10Z
- **Test Strategy Completed**: 2026-08-16T23:10Z
- **Implementation Received**: Already complete and code-reviewed (APPROVED_WITH_COMMENTS, Medium fix applied in `58360b22`)
- **Testing Started**: 2026-08-16T23:12Z
- **Testing Completed**: 2026-08-16T23:25Z
- **Final Status**: QA Complete (2026-08-16T23:25Z)

---

## Test Strategy (Phase 1)

### Value Statement Validation Target

- **User Goal**: On iPhone SE standalone PWA, tapping "Near Me" must reach a **terminal, actionable state** — map pans to device location (granted), or clear next-step guidance appears (denied with Plan 209 iOS Settings hint / timeout / unavailable). Never a silent hang stuck in `prompting`.
- **Success Criteria**: Watchdog forces a terminal state ~12 s after tap when `getCurrentPosition` never calls back; standalone hang → `denied` (iOS hint surfaces); non-standalone hang → `timeout`; happy path (callback before 12 s) behaves exactly as before; no double-fire, no late override, no setState-after-unmount.
- **Anti-Goals**: (a) Watchdog breaks the Plan 212 happy path (chip green + map pans on grant); (b) watchdog reintroduces centroid snap-back; (c) Path B (`/providers` via `useNearMeToggle`) regresses; (d) Plan 209 denied-hint behavior changes.

### Root-Cause-Driven Test Focus (Analysis F9)

The confirmed defect: on iPhone SE standalone PWA, iOS suppresses the permission prompt AND both `getCurrentPosition` callbacks — the request hangs, `useGeolocation` status stays `prompting` forever, the chip shows no terminal feedback. The mandatory regression therefore exercises the **hung-request path** directly: `getCurrentPosition` invoked with **no callbacks** → fake timers advance past the watchdog deadline → terminal state asserted. Adjacent behaviors (browser-reported denied/timeout) are covered by the pre-existing 5 hook tests, which continue to pass unchanged.

### Testing Scope

This is a client-side hook change with a UI-adjacent instrumentation change:

1. **`useGeolocation` watchdog** (primary fix): arm on `requestLocation()`, fire at 12,000 ms if neither callback fired, map standalone → `denied` / non-standalone → `timeout`, clear on success/error/reset/unmount, emit outcome log.
2. **`isStandaloneDisplayMode()`** helper (exported): `navigator.standalone === true` OR `matchMedia('(display-mode: standalone)').matches`, guarded for non-browser contexts (review-fix regression).
3. **`SearchMap` setView logging**: executed vs skipped (mapRef null) log branches.
4. **Cross-plan surface**: chip geoStatus states (Plan 212), denied hint rendering (Plan 209), `/providers` toggle (Path B).

### Test Type Breakdown (Test Pyramid)

```
        /\
       /  \        E2E/Manual (1, deferred)
      /----\       On-device iPhone SE PWA — M6 gate / DF-3 closure
     /      \
    /--------\     Integration (7)
   /          \    Hook + component suites, cross-plan suites
  /------------\
 /              \  Unit (43)
/________________\ Hook state machine, watchdog timers, helper, component logging
```

### Unit Tests (43 across the 5 targeted files)

**`useGeolocation.test.ts`** (17 tests = 5 pre-existing + 12 new)

| # | Test | Covers |
|---|------|--------|
| 1 | `starts in the idle state and does not request location automatically` | baseline |
| 2 | `transitions idle -> prompting -> granted with coords on success` | happy path |
| 3 | `transitions to denied when the browser reports PERMISSION_DENIED` | browser error path |
| 4 | `transitions to timeout when the browser reports TIMEOUT` | browser error path |
| 5 | `[pre-fix FAILS / post-fix PASSES] transitions to unavailable and logs outcome` | review-fix: unavailable log branch |
| 6 | `reset() returns to idle state` | baseline |
| 7 | `[pre-fix FAILS / post-fix PASSES] watchdog forces timeout when getCurrentPosition never calls back (non-standalone)` | **BUG PATH**: hang → timeout at 12 s |
| 8 | `[pre-fix FAILS / post-fix PASSES] watchdog forces denied when standalone and getCurrentPosition never calls back` | **BUG PATH**: iOS standalone hang → denied |
| 9 | `[pre-fix FAILS / post-fix PASSES] watchdog clears when success fires before deadline` | no double-fire / no late override |
| 10 | `[pre-fix FAILS / post-fix PASSES] watchdog clears when error fires before deadline` | no double-fire / no late override |
| 11 | `[pre-fix FAILS / post-fix PASSES] reset clears in-flight watchdog` | reset safety / no post-reset transition |
| 12 | `[pre-fix FAILS / post-fix PASSES] logs outcome with status, errorCode, standalone and elapsedMs` | instrumentation shape |
| 13-17 | `isStandaloneDisplayMode` describe block (5 tests): navigator-absent guard, `standalone` true, matchMedia standalone true, neither, matchMedia absent | platform detection + review-fix SSR guard |

**`SearchMap.test.tsx`** (7 tests = 5 pre-existing + 2 new)

| # | Test | Covers |
|---|------|--------|
| 1-5 | renders container, marker click, pans on userCoords, rerender guard (setView exactly 2x), no `getCurrentPosition` in source | Plan 212 regression surface |
| 6 | `[pre-fix FAILS / post-fix PASSES] logs setView executed when userCoords is provided and map is initialized` | M3 instrumentation |
| 7 | `[pre-fix FAILS / post-fix PASSES] logs setView skipped when mapRef is null` | M3 instrumentation |

### Integration / Cross-Plan Tests (7, in the targeted run)

1. `HomeSearchBar.test.tsx` (19 tests) — chip geoStatus states incl. `[pre-fix FAILS / post-fix PASSES] denied state shows iOS-specific recovery hint` (Plan 209 surface; the exact hint the watchdog's standalone→denied mapping feeds)
2. `plan212-near-me-viewport.test.tsx` (1 test) — chip tap → `requestLocation()` wiring (Plan 212 regression)
3. `useNearMeToggle.test.tsx` (6 tests) — Path B `/providers` toggle + URL sync (now also exercises the new `geolocation_outcome` log path)

### E2E / On-Device Tests (1, deferred — cannot execute in this environment)

On-device iPhone SE standalone PWA validation. See **UAT / On-Device Gate (M6 / DF-3)** section.

### Testing Infrastructure Required

**Frameworks (already in place)**: Vitest + React Testing Library (`renderHook`, `act`, `waitFor`), `vi.useFakeTimers()`, `@testing-library/react`, Leaflet mock infrastructure.
**Config**: existing `vitest.config.ts`; no new dependencies or config changes needed.

---

## Test Execution Results (Phase 2 — ACTUAL command outputs)

All gates executed by QA in this session on branch `fix/215-ios-pwa-geolocation` (HEAD `58360b22`).

| Gate | Command | Status | Actual Output |
|---|---|---|---|
| Targeted tests (Plan 215 + cross-plan) | `npx vitest run src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx src/__tests__/features/search/HomeSearchBar.test.tsx src/__tests__/regression/plan212-near-me-viewport.test.tsx src/__tests__/hooks/useNearMeToggle.test.tsx` | ✅ PASS | `Test Files 5 passed (5)` / `Tests 50 passed (50)` — Duration 1.50s |
| Full test suite | `npx vitest run` | ✅ PASS | `Test Files 233 passed \| 2 skipped (235)` / `Tests 1906 passed \| 24 skipped (1930)` — Duration 30.63s |
| Type check | `npm run type-check` | ✅ PASS | `tsc --noEmit` exited 0, no errors |
| Targeted lint (changed files) | `npx eslint src/hooks/useGeolocation.ts src/features/search/components/SearchMap.tsx src/__tests__/hooks/useGeolocation.test.ts src/features/search/components/SearchMap.test.tsx` | ✅ PASS | Exit 0, no problems reported |
| Full-repo lint baseline | `npm run lint` | ⚠️ FAIL (pre-existing, unrelated) | `203 problems (40 errors, 163 warnings)` — e.g. `src/services/providerService.ts:83 no-empty`. Identical to the pre-existing baseline recorded by the Implementer; no Plan 215 files in the error set |
| Build | `npm run build` | ✅ PASS | Exit 0; route table generated; `public/sw.js` regenerated (3,471 bytes, non-empty). NOTE: env gate — build succeeds locally because `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` (1 occurrence). In envs without it the build fails at page render; CI remains the authoritative gate (DF-1) |

### Targeted Run Detail (50 tests)

| File | Tests | Status |
|---|---|---|
| `src/__tests__/hooks/useGeolocation.test.ts` | 17 | ✅ PASS |
| `src/features/search/components/SearchMap.test.tsx` | 7 | ✅ PASS |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | 19 | ✅ PASS |
| `src/__tests__/regression/plan212-near-me-viewport.test.tsx` | 1 | ✅ PASS |
| `src/__tests__/hooks/useNearMeToggle.test.tsx` | 6 | ✅ PASS |

*Note: the implementation doc records 49 passed for this 5-file set; the current run shows 50 because the review-fix (`58360b22`) added 2 regression tests (navigator-absent guard + unavailable outcome log) to `useGeolocation.test.ts`, and the doc's 49 figure predates that count settling. The full-suite figures (233 files / 1906 tests) match the implementation doc exactly.*

### Version Artifacts Verification (M5)

| Artifact | Expected | Actual | Status |
|---|---|---|---|
| `package.json` | `0.15.16` | `0.15.16` | ✅ |
| `package-lock.json` | `0.15.16` (root + packages[""]) | `0.15.16` (both occurrences) | ✅ |
| `CHANGELOG.md` | `## [0.15.16] - 2026-08-16` entry referencing Plan 215 + both instrumentation lines | Present, references Plan 215, watchdog behavior, `{ status, errorCode?, standalone, elapsedMs }` + `setView` logging | ✅ |

---

## Coverage Analysis

### Bug-Path Regression Adequacy (mandatory check)

The reported bug: **iPhone SE PWA, tap Near Me → chip activates → nothing happens (geolocation hangs)**. Regression adequacy:

| Required coverage | Test evidence | Verdict |
|---|---|---|
| Watchdog fires when NO callback fires (hang) → terminal state at ~12 s | `watchdog forces timeout ... never calls back (non-standalone)` + `watchdog forces denied when standalone and ... never calls back` — both `vi.useFakeTimers()` + `vi.advanceTimersByTime(12000)` with a no-op `getCurrentPosition` mock | ✅ EXERCISES THE ACTUAL BUG PATH (hung request, not adjacent behavior) |
| Standalone → `denied` (surfaces Plan 209 iOS hint) | standalone test asserts `status` `denied` + log `standalone: true, forcedByWatchdog: true` | ✅ |
| Non-standalone → `timeout` | non-standalone test asserts `status` `timeout` + log `standalone: false, forcedByWatchdog: true` | ✅ |
| Timer cleared on success (no late override) | advance 6,000 ms → `granted`; advance another 12,000 ms → still `granted`; `logApp` called once; `forcedByWatchdog` never logged | ✅ |
| Timer cleared on error (no late override) | advance 4,000 ms → browser `timeout`; advance another 12,000 ms → still `timeout`; `logApp` called once; no `forcedByWatchdog` | ✅ |
| `reset()` clears in-flight watchdog | advance 6,000 ms → `reset()` → advance 12,000 ms → status stays `idle` AND `logApp` **never called** (proves the timer was genuinely removed, not merely suppressed) | ✅ |
| No setState-after-unmount | No explicit unmount test; the unmount `useEffect` cleanup and `reset()` share the same `clearWatchdog` callback (verified in `useGeolocation.ts:108-121`). The reset test proves the timer is cleared at deadline; unmount follows the identical code path. **Minor observation (LOW)**: an explicit `unmount()` regression test would harden this, but the shared-mechanism coverage is adequate for this change | ⚠️ ADEQUATE (shared mechanism, no explicit unmount test) |

### Outcome-Log Coverage

All terminal transitions emit `{ event: 'geolocation_outcome', status, errorCode?, standalone, elapsedMs, forcedByWatchdog? }`: granted, browser denied (code 1), browser timeout (code 3), unavailable (review-fix), watchdog timeout, watchdog denied. Asserted via `logApp` mock in 5 tests. No PII in the payload. ✅

### Watchdog Deadline Semantics

`WATCHDOG_MS = 12000` sits above the browser `PositionOptions.timeout = 10000` (unchanged), so well-behaved browsers resolve via the real error callback first; iOS standalone (suppressed callbacks) gets a terminal state ~12 s after tap. Both test branches (callback before deadline; no callback) verify the boundary behavior. ✅

---

## TDD Compliance Verification

**TDD COMPLIANCE GATE**: ✅ PASS — Implementation doc contains a complete TDD Compliance table.

| Verification item | Result |
|---|---|
| TDD table present in implementation doc | ✅ Yes (10 rows) |
| Rows match plan intents (8) + review-fix regressions (2) | ✅ 8 plan intents (watchdog timeout/denied, cleared-on-success/error, reset-clears, standalone helper, outcome log, SearchMap setView log) + 2 review-fix rows (navigator-absent guard, unavailable outcome log) |
| All rows "Test Written First? ✅ Yes" | ✅ 10/10 |
| All rows "Failure Verified? ✅ Yes" with specific pre-fix failures | ✅ 9/10. Intent #5 (`reset()` cleanup) honestly records "⚠️ No observable pre-fix failure (no watchdog existed to leak) — N/A safety guard". Correctly framed, not a dodge |
| Red-phase evidence recorded | ✅ Initial red: `11 failed` (watchdog tests timed out at `prompting`, `isStandaloneDisplayMode is not a function`, SearchMap log assertions). Review-fix red: `2 failed` (`ReferenceError: navigator is not defined`, `AssertionError: logApp not called for unavailable`) |
| `[pre-fix FAILS / post-fix PASSES]` naming convention | ✅ Verified in the actual test files: 9 of 12 new hook tests + both new SearchMap tests carry the convention (client-state precedence regression pattern per repo guidance) |
| Red→green is logically sound | ✅ Verified by inspection: pre-fix, the no-callback watchdog tests would leave status at `prompting` and fail the terminal-state assertions; the navigator-absent test would throw `ReferenceError` against the pre-fix guard order; the unavailable test would fail on the missing `logApp` call. Current green verified by QA's own run |

**Verdict**: TDD compliance is REAL, not cosmetic. The watchdog tests genuinely reproduce the hang (no-callback `getCurrentPosition` + fake timers), and the review-fix regressions target the exact Medium finding (`navigator` guard order) and the Low finding (`unavailable` unlogged).

---

## Cross-Plan Regression Check

| Plan / surface | Behaviors validated | Evidence | Verdict |
|---|---|---|---|
| **Plan 212** (chip geoStatus states, map pans only on userCoords, no centroid snap-back) | `HomeSearchBar` chip states (19 tests incl. `geoStatus="denied"` rerender at line 144, green only when `granted`); `SearchMap` pans when `userCoords` provided, `setView` called exactly 2× on unchanged rerender (no snap-back), source contains no `getCurrentPosition`; chip tap → `requestLocation()` wiring (`plan212-near-me-viewport`) | All passing in targeted run + full suite | ✅ NO REGRESSION |
| **Plan 209** (denied hint renders) | `HomeSearchBar.test.tsx` + `NearMeOpenNowFilters.test.tsx`: `denied state shows iOS-specific recovery hint` asserts "Standort nicht verfügbar" + "Standort gesperrt. Öffne Einstellungen → Datenschutz → Ortungsdienste." The watchdog's standalone→denied mapping feeds **exactly this branch** (`showNearMeDeniedHint` = `geoStatus === 'denied'`). `timeout`/`unavailable` correctly do NOT render the Settings hint — matching the watchdog's non-standalone→timeout mapping | All passing | ✅ NO REGRESSION; hint is now *reachable on the bug path* |
| **Path B** `/providers` (`useNearMeToggle`) | 6 tests: URL sync (`near_lat`/`near_lon`/`near_radius`), radius changes. Tests now emit `geolocation_outcome` logs (observed in run output) through the new logging path with zero failures | All passing | ✅ NO REGRESSION |
| **Full suite** | 233 files / 1906 tests across migrations, integration, regression suites | All passing (24 pre-existing skips) | ✅ NO REPO-WIDE REGRESSION |

---

## Approval Criteria for QA Complete

- [x] Phase 2 automated gates pass: targeted 50/50, full suite 1906/1906, type-check 0 errors, targeted lint clean
- [x] Bug-path regression tests exercise the ACTUAL hang (no-callback `getCurrentPosition` → terminal state at 12 s), not adjacent behavior
- [x] Watchdog lifecycle verified: fires on hang, cleared on success/error/reset (no double-fire, no late override, no post-reset transition)
- [x] Standalone → `denied` mapping verified (surfaces Plan 209 iOS hint); non-standalone → `timeout` verified
- [x] Outcome logging `{ status, errorCode?, standalone, elapsedMs, forcedByWatchdog? }` verified on all terminal transitions incl. `unavailable` (review-fix)
- [x] `SearchMap` setView executed/skipped logging verified (both branches)
- [x] TDD table complete (10 rows), red-phase evidence real, `[pre-fix FAILS / post-fix PASSES]` convention verified in files
- [x] Cross-plan regression: Plan 212 chip/map, Plan 209 denied hint, Path B toggle — all green
- [x] Version artifacts consistent (`0.15.16` in package.json, package-lock.json, CHANGELOG)
- [x] Code review Medium finding (navigator guard order) verified FIXED in `58360b22` (`useGeolocation.ts:43` guards before `:47` reads)
- [x] Build passes (exit 0, env var present); CI remains the authoritative gate (DF-1)
- [x] On-device validation deferred with owner, trigger, and concrete evidence requirements (DF-3, below)

**QA Verdict**: ✅ **QA COMPLETE** — All automated gates pass. The implementation delivers the plan's value statement: a hung geolocation request now always reaches a terminal, actionable state (~12 s) instead of hanging silently, with the Plan 209 iOS Settings hint surfaced for standalone users. Remaining validation is exclusively the on-device iPhone SE gate (M6 / DF-3), which cannot be executed in this environment.

---

## UAT / On-Device Gate (M6 / Plan 212 DF-3) — DEFERRED, CANNOT EXECUTE HERE

**Owner**: UAT operator / user with iPhone SE (human gate, requires physical device)
**Trigger**: After this QA approval + DevOps release to UAT/staging; BEFORE promoting to PROD end users
**Due**: 2026-08-17 EOD (per Plan 212 open-actions tracker)
**Closure**: Record evidence for scenarios A–E below; then close DF-3 in `agent-output/planning/212-near-me-pwa-fix-open-actions.md`

All scenarios run in the **standalone PWA** on iPhone SE against the staged `0.15.16` build (install from Safari → Share → Add to Home Screen). Open questions Q3/Q4/Q5 from the analysis must also be answered on-device (scenario E).

| # | Scenario | Action (concrete) | Required evidence (accept =) |
|---|----------|-------------------|------------------------------|
| A | **Hang → guidance (THE BUG)** | Fresh install / cleared site data. Tap "Near Me" chip. Start a stopwatch. Wait **15 s** (past the 12 s watchdog). | **Video (screen recording)**: chip pulses (`prompting`) → at ~12 s transitions to terminal state; "Standort nicht verfügbar" + iOS Settings hint ("Standort gesperrt. Öffne Einstellungen → Datenschutz → Ortungsdienste.") visible; **no infinite hang**. Stopwatch visible in frame showing < 15 s to terminal state. |
| B | **Happy path** | Safari → Settings → Location Services → ummahflow.com = Allow (if not already). Tap "Near Me". | **Video**: permission prompt appears (or already allowed), map pans to device location at zoom 14 within 12 s; chip turns green. Include the same stopwatch frame. |
| C | **Denied** | Revoke location in Settings. Tap "Near Me". | **Screenshot/video**: immediate denied state + iOS hint (no hang, no watchdog wait). |
| D | **Deactivate (Plan 212 regression)** | With granted state, tap "Near Me" again to deactivate. | **Screenshot/video**: map stays at local position; **no centroid snap-back** to Germany. |
| E | **Q3/Q4/Q5 evidence** | (Q3) After scenario A, note whether ANY message appeared before 12 s (did browser timeout fire?); (Q4) check Safari → Settings → Location Services for ummahflow.com permission state; (Q5) open the same site in regular Safari (NOT standalone), tap Near Me, note whether the prompt appears. | **Written answers** recorded for all three questions in the UAT doc or DF-3 tracker. |
| F | **Instrumentation** | While running A/B, open the app console (Safari → Develop → device) or pull staging logs. | **Log excerpt** showing `geolocation_outcome` with `{ status, standalone: true/false, elapsedMs, forcedByWatchdog }` and `searchmap_setview_executed` (B) or `_skipped` (A). |

**Evidence format**: one screen recording per scenario (A/B/D) plus screenshots (C) + log excerpt (F), attached to the UAT doc / DF-3 tracker. If UAT reveals the `denied` wording is misleading when location is actually "Allow" but still hangs, log a follow-up for neutral wording (plan risk R1) — does not block this release.

---

## Deferred Items (with owners)

| Item | Owner | Trigger/Due | Closure path | Status |
|---|---|---|---|---|
| **DF-3 / M6: On-device iPhone SE PWA validation** (scenarios A–F above) | UAT operator (user with device) | After QA approval + UAT staging; due 2026-08-17 EOD | Evidence recorded in UAT doc; DF-3 closed in `212-near-me-pwa-fix-open-actions.md` | ⏸️ DEFERRED (blocked on device access) |
| **DF-1: CI build verification** | DevOps / CI | PR merge | GitHub Actions build job exit 0 | Open (CI gate) |
| Full-repo lint debt (203 problems: 40 errors / 163 warnings) | Repo debt cleanup (separate plan) | Ongoing | Track as separate debt cleanup; Plan 215 delta lint is clean | Open (pre-existing, not Plan 215) |
| Explicit `unmount()` watchdog regression test | QA follow-up (next plan touching `useGeolocation`) | Next touch | Add `unmount()` → advance past deadline → no setState warning/transition | Optional (LOW) |
| Desktop standalone false-positive on `denied` mapping (code review LOW) | Follow-up if telemetry shows it | If UAT/telemetry evidence | Refine detection to iOS UA + standalone | Open (LOW) |

---

## Positive Observations

- **Watchdog lifecycle is airtight**: armed per request, cleared on success/error/reset/unmount via a stable ref; the reset test proves the timer is genuinely removed (status `idle` + zero logs past deadline).
- **Terminal-state mapping is exactly as planned**: standalone → `denied` (reuses Plan 209 iOS hint), non-standalone → `timeout`; no new `GeolocationStatus` value, no new translation keys (KISS/YAGNI honored).
- **Review-fix discipline**: the Medium finding (navigator guard order) and the Low finding (unavailable unlogged) were both fixed AND regressed with `[pre-fix FAILS / post-fix PASSES]` tests — the guard-order fix is verified in the shipped code (`useGeolocation.ts:43-45`).
- **Scope discipline**: `HomeSearchBar.tsx`, `RootPageContent.tsx`, `useNearMeToggle.ts`, and all translation files have **zero diff** — verified via `git diff 1cd6389a..HEAD`.
- **Instrumentation is clean**: `forcedByWatchdog: true` distinguishes watchdog-forced from browser-reported terminal states in production logs; no PII.
- **Full-suite figures match the implementation doc exactly** (233 files / 1906 tests) — the implementer's recorded results reproduce 1:1 in QA's independent run.

---

## Next Steps

1. **DevOps**: confirm final patch version at Stage 1 (target `0.15.16`), run CI build gate (DF-1), prepare PR + UAT deployment.
2. **UAT operator (user)**: execute the on-device iPhone SE scenarios A–F above, record evidence, close DF-3.
3. **After on-device evidence**: UAT approval decision (APPROVED FOR RELEASE conditional on DF-3 evidence, per plan M6).
