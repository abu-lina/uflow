---
ID: 217
Origin: 217
UUID: e7b4f2a9
Status: QA Complete
---

# QA Report — Plan 217: Fix "Near me" on the Home List View

| Field | Value |
| --- | --- |
| Plan | [217-near-me-list-fix-plan.md](../planning/217-near-me-list-fix-plan.md) |
| Implementation | [217-near-me-list-fix-implementation.md](../implementation/217-near-me-list-fix-implementation.md) |
| Code Review | [217-code-review.md](../code-review/217-code-review.md) — APPROVED, all findings RESOLVED/closed |
| Branch | `fix/217-near-me-list-fix` (base `origin/main`) |
| QA Verdict | **QA Complete** |
| UAT Eligibility | **APPROVED FOR RELEASE** (technical gate passed; human device pass checklist below) |

## Changelog

| Date (UTC) | Agent | Action |
| --- | --- | --- |
| 2026-08-17 | QA | Opened QA report. Test strategy defined, awaiting implementation. |
| 2026-08-17 | QA | Testing In Progress — ran targeted suites, type-check, delta lint, browser smoke, pre-fix comparison. |
| 2026-08-17 | QA | QA Complete. Verdict: APPROVED FOR RELEASE with 2 awareness findings + 1 pre-existing observation routed separately. |

## Self-Check

Scanned `agent-output/qa/` and `agent-output/uat/` (excluding `closed/`). No documents with terminal status found outside `closed/`. No orphan closure required.

---

## Phase 1: Test Strategy

Scope derived from the plan's Behavior Specification and the analysis root cause (near-me signal reaches only the Map branch; List branch had no consumer):

| # | Scenario (user perspective) | Automated coverage | Manual/browser evidence |
| --- | --- | --- | --- |
| S1 | Tap "Near me" in List view → list switches to distance-ordered results (not the unordered `pins`) | `plan217-near-me-list.test.tsx` (regression wiring, pre/post-fix expression) | Browser smoke: chip click → `HomeNearMeList` with 4 distance badges |
| S2 | Results limited to ≤25 km | Hook test asserts `radiusKm: 25` passed to `searchFoodNearMe`; RPC migration 120 `LEAST(p_radius_km, 25)` clamp verified in source | Browser smoke: all 4 badge values ≤ 25 km (60 m, 22 km, 22.1 km, 23.6 km) |
| S3 | Distance badge on each card (`distanceKm` → `formatDistance`) | `HomeNearMeList.test.tsx` asserts `distanceKm = distance_km` forwarded to `ProviderCard`; `ProviderCard.tsx:456` renders `data-testid="provider-distance"` | Browser smoke: 4 `provider-distance` elements with formatted values |
| S4 | Distance order preserved (nearest first) | Hook test "preserves RPC distance order"; component test "renders a card per result in the given order" | Browser smoke: DOM order 60 m → 22 km → 22.1 km → 23.6 km (non-decreasing) |
| S5 | Open-now chip interplay (client-side filter, order-preserving) | Hook test "open-now interplay" (filters to open-only, order preserved, no extra RPC call) | Covered by unit; device pass will spot-check |
| S6 | Loading / error / empty states | `useHomeNearMe` (loading-first render, error propagation) + `HomeNearMeList` (SkeletonGrid / EmptyState+retry / empty) | Code inspection of i18n keys (existing `suchen.nearMe.*`) |
| S7 | Map branch unchanged; map↔list toggle regression | `plan217` regression test #3 (map view renders `SearchMap`, near-me list NOT rendered); `plan212` viewport test intact | Browser smoke: map renders after toggle-back (10 tiles, 6 markers); pre-fix comparison confirms identical map behavior |
| S8 | Near-me off / denied / idle → unchanged `HomeListView` | `plan217` regression test #2 (denied/idle renders `HomeListView`) | Browser smoke: pre-activation list shows section pins |
| S9 | Instrumentation `home_list_nearme_*` observable | `plan212` regression still passes with additive mocks; `home_list_nearme_skipped` visible in test stdout | Smoke: RPC round-trip confirmed via 4 real results returned |

**Architect F-217-1 (multi-location open-now source)**: verified — see Finding F-QA-2.

**Known limitation of automated evidence**: geolocation grant/deny UX (browser permission dialog, iOS/Android settings hints) cannot be fully simulated in jsdom/headless; that is the human device pass (UAT checklist below).

---

## Phase 2: Test Execution Results

### 2.1 TDD Compliance Gate (first check)

Implementation doc contains the TDD Compliance table with all three rows complete:

| Function/Class | Test written first? | Failure verified? | Pass after impl? |
| --- | --- | --- | --- |
| `useHomeNearMe` | ✅ | ✅ (module-resolution failure pre-fix) | ✅ |
| `HomeNearMeList` | ✅ | ✅ (module-resolution failure pre-fix) | ✅ |
| `RootPageContent` wiring | ✅ | ✅ (`home-near-me-list` data-testid absent pre-fix) | ✅ |

**GATE PASSED** — table present and complete.

### 2.2 Independent test execution (QA re-run, not trusting implementer evidence)

```
$ npx vitest run src/__tests__/hooks/useHomeNearMe.test.tsx \
    src/__tests__/features/search/HomeNearMeList.test.tsx \
    src/__tests__/regression/plan217-near-me-list.test.tsx \
    src/__tests__/regression/plan212-near-me-viewport.test.tsx \
    src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx
Test Files  5 passed (5)
     Tests  23 passed (23)
```

Plus adjacent tests the plan flagged as potentially affected:

```
$ npx vitest run src/__tests__/components/RootPageContent.layout-regression.test.tsx \
    src/__tests__/features/search/HomeSearchBar.test.tsx
Test Files  2 passed (2)
     Tests  21 passed (21)
```

**Total independently verified: 44 tests across 7 files, 0 failures.**

| Test file | Tests | Result |
| --- | --- | --- |
| `useHomeNearMe.test.tsx` | 8 | ✅ (incl. first-render `isLoading=true` regression from code-review MEDIUM) |
| `HomeNearMeList.test.tsx` | 5 | ✅ (loading/error+retry/empty/order/distance+category fallback) |
| `plan217-near-me-list.test.tsx` | 3 | ✅ (granted→near-me list; denied/idle→HomeListView; map→SearchMap) |
| `plan212-near-me-viewport.test.tsx` | 1 | ✅ (additive mocks, assertions unchanged) |
| `plan208-mobile-search-map-switch.test.tsx` | 6 | ✅ (search page unaffected) |
| `RootPageContent.layout-regression.test.tsx` | 1 | ✅ |
| `HomeSearchBar.test.tsx` | 20 | ✅ |

### 2.3 Static gates

```
$ npm run type-check      → tsc --noEmit: PASS (no output, exit 0)
$ npx eslint <7 changed files>  → PASS (clean, no output)
```

Delta lint covered: `useHomeNearMe.ts`, `HomeNearMeList.tsx`, `RootPageContent.tsx`, `useHomeNearMe.test.tsx`, `HomeNearMeList.test.tsx`, `plan217-near-me-list.test.tsx`, `plan212-near-me-viewport.test.tsx`.

Full-repo `npm run lint` is blocked by pre-existing unrelated errors (chat feature files) — same as recorded by the implementer; Plan 217 files are clean. Build (`npm run build`) verified by implementer + code reviewer (static pages generated; pre-existing dynamic-server warnings non-blocking); not re-run in this phase.

### 2.4 Browser smoke check (Playwright, mobile viewport 390×844, iPhone UA, geolocation granted at 50.06/8.37 — Wiesbaden, DEV Supabase live)

```
PASS | home discovery rendered (toggle visible)
PASS | list view renders after toggle (12 role=button elements)
PASS | near-me chip clicked
PASS | near-me list renders distance badges — badges=4
      values=60 m, 22 km, 22,1 km, 23,6 km   ← real DEV RPC data, distance-ordered, all ≤ 25 km
PASS | map toggle regression — map re-renders after switching back (10 tiles, 6 markers)
console errors: 0    page errors: 0
```

The badge values (60 m, 22 km, 22.1 km, 23.6 km) match the live `search_food_near_me` RPC sample recorded in Analysis F5 (0.06, 21.99, 22.11, 23.57 km near Wiesbaden), confirming the home List branch is consuming the proven RPC end-to-end with `formatDistance` formatting (`<1 km → m`, `≥1 km → km` with German-locale comma).

### 2.5 Pre-fix comparison (worktree at `origin/main`, same seed state)

The home page in **initial map view** shows a blank map area on both pre-fix (`origin/main`) and post-fix (`fix/217`) code — `SearchMap` (a `dynamic()` ssr:false import) does not mount until a view-toggle re-render. Identical behavior on both sides; **not a Plan 217 regression** (SearchMap + its wrapper are untouched by this branch). Recorded as F-QA-1 (pre-existing, out of scope, routed separately).

---

## Code Change Verification (map to plan file list)

| Plan file action | Actual | Match |
| --- | --- | --- |
| Create `useHomeNearMe.ts` | ✅ `src/features/search/hooks/useHomeNearMe.ts` — contract matches (isActive/results/isLoading/error/refetch; `RADIUS_KM=25`; stale-guard `cancelled` flag; `home_list_nearme_activated/success/error` logs; coords truncated to 4 decimals) | ✅ |
| Create `HomeNearMeList.tsx` | ✅ `src/features/search/components/HomeNearMeList.tsx` — scroll wrapper parity, 2-col grid, category `?? ''` fallback, `distanceKm`, `hideWebsiteButton`, no bookmarks, `useRouter` push | ✅ |
| Modify `RootPageContent.tsx` | ✅ +40/-6 — hook call, `home_list_nearme_skipped` effect, `isActive ? HomeNearMeList : HomeListView` ternary; SearchMap branch untouched | ✅ |
| Create 3 test files | ✅ all present, TDD-red-first evidence recorded | ✅ |
| Modify `plan212` test | ✅ additive mocks only (useHomeNearMe inactive + HomeNearMeList stub) | ✅ |
| Version bump | ✅ `package.json` + `package-lock.json` → `0.15.18` | ✅ |
| CHANGELOG | ✅ `[Unreleased] - 2026-08-17` entry for Plan 217 | ✅ |

No plan deviation found. Implementation matches the approved plan exactly.

---

## Findings

### F-QA-1 (LOW — pre-existing, OUT OF SCOPE, routed separately)
**Initial home map view renders blank until the user toggles view**
- **Severity**: LOW (cosmetic-disruptive; map eventually mounts on any re-render/toggle) — PRE-EXISTING
- **Location**: `RootPageContent.tsx` SearchMap wrapper + `SearchMap.tsx` init effect; `next/dynamic(..., { ssr: false })`
- **Evidence**: Verified identical on `origin/main` (worktree test) and `fix/217`; SearchMap chunk loads (HTTP 200) but component never mounts in initial map view (no `.uflow-map-tiles`, no `.leaflet-container` after 38 s); mounts within ~2 s of any view toggle. Zero console/page errors on both.
- **Impact**: A user landing on the home map view sees no map until they interact. Affects Plan 217's "map unchanged" surface only in that the map was already affected pre-fix; the near-me List fix itself is unaffected.
- **Recommendation**: Route to a separate analysis (candidate: dynamic-import mount deferral under React 19 hydration). Not a blocker for Plan 217.

### F-QA-2 (MEDIUM — awareness, per Architect F-217-1; NO code change required)
**Open-now status uses a different data source on the near-me list vs the normal list/map**
- **Location**: `useHomeNearMe` (RPC `l.opening_hours`, migration 120) vs `RootPageContent` pins query (`providers.opening_hours`)
- **Evidence**: Migration `120_plan_196_search_food_near_me.sql` returns `l.opening_hours` from `public.locations`; the pins query joins `providers!inner(...)` and filters on provider-level hours. Implementation doc acknowledges this explicitly ("Architect F-217-1 Acknowledgment").
- **Impact**: For a provider with multiple locations carrying **per-location** opening hours, "Open now" can report differently between the near-me List (nearest location's hours) and the normal List/Map (provider-level hours) on the same home surface with near-me + open-now active. Semantically defensible (near-me shows the nearest location's availability); pre-existing (search page near-me behaves the same); not introduced by this plan.
- **Required QA/UAT action**: During the human device pass, exercise a known multi-location provider with near-me + open-now active and compare List vs Map membership. Documented in the UAT checklist below.

### F-QA-3 (LOW — awareness, accepted)
**Empty-state wording reads "No open restaurants nearby" even when open-now is off**
- Plan Behavior Spec note + Architect F-217-4 + code review accepted this (matches search page). No change in this bugfix.

### F-QA-4 (LOW — awareness, accepted)
**`home_list_nearme_skipped` can emit more than once per transition** (idle→prompting→denied emits twice)
- Code-review LOW finding, acknowledged. Instrumentation noise only; optional de-dupe later.

---

## Release Blockers Checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Version bump consistency | ✅ | `package.json` `0.15.18`, `package-lock.json` `0.15.18`, CHANGELOG `[Unreleased]` entry present |
| No unrelated files in branch diff | ✅ | `git diff --name-only origin/main...HEAD` = 13 files, all Plan 217 (3 source, 4 test, 3 agent docs, package/lock, CHANGELOG). Filter check returned NONE-UNRELATED. |
| TDD compliance table complete | ✅ | 3 rows, all red-first verified |
| Type-check | ✅ | `tsc --noEmit` clean |
| Delta lint (changed files) | ✅ | eslint clean on all 7 changed source/test files |
| Regression tests for actual bug path | ✅ | `plan217-near-me-list.test.tsx` + hook/component tests exercise the real fix surface |
| No new services / no schema change | ✅ | Reuses existing `search_food_near_me` RPC (migration 120, verified in source) |
| i18n compliance | ✅ | No hardcoded strings in new components (verified in source; labels via `t()`) |

---

## Business Value Assessment (UAT section)

**Value statement (from plan):** "As a mobile user on the home screen, I want to tap the 'Near me' chip while in List view and see providers reordered nearest-first and limited to those within 25 km — with a distance label on each card."

**Delivery confirmation:**

1. **Pre-fix expression (bug):** activating near-me in List view changed zero inputs to `HomeListView` — the list rendered identical unordered `pins` (analysis F1–F3, L1 proven).
2. **Post-fix expression (verified):** activating near-me in List view switches the branch to `HomeNearMeList` fed by `search_food_near_me({ lat, lon, radiusKm: 25 })`. The regression test asserts the switch; the hook tests assert the RPC args and order preservation; the component tests assert distance-badge forwarding.
3. **End-to-end proof (live):** browser smoke with granted geolocation produced a real, distance-ordered, ≤25 km result set with formatted distance badges (60 m, 22 km, 22.1 km, 23.6 km). This is the exact value the statement promises, observed with live DEV data.
4. **Regression-expression honesty (F-217-5, acknowledged):** the wiring regression test cannot literally run red on pre-fix code (mocks modules that did not exist). The behavioral claim is layered: unit (hook) + component tests exercise the real implementation; the wiring test proves the switch. Adequate.

**Verdict: the sum of implementation + code review + QA evidence demonstrates the value statement is delivered.** No re-test required after UAT phase (per QA/UAT split: UAT performs device-level validation, not re-running these gates).

### UAT Checklist (human device pass — owner: human QA/UAT on UAT deployment; fallback: DEV deploy)

| # | Check | Pass criteria |
| --- | --- | --- |
| U1 | Geolocation **grant** on home List view (320 px width) | Tap "Near me" → permission prompt → allow → list switches to near-me results (not the normal grid) |
| U2 | Distance ordering | Cards are ordered nearest-first (top card distance ≤ subsequent cards) |
| U3 | Radius clamp (≤25 km) | No card shows a distance > 25 km while near-me active |
| U4 | Distance badge formatting | Badges show `m` under 1 km and `km` (German comma locale) at/above 1 km; badge appears on each card |
| U5 | Open-now interplay | With "Open now" also active, list shows only currently-open providers, order still nearest-first |
| U6 | Geolocation **deny** (320 px) | Deny prompt → list stays on the normal `pins` grid; permission-denied hint appears on the near-me chip; no crash |
| U7 | Map toggle regression | Switch List→Map and back while near-me active: map renders (tiles/markers), near-me list returns on List; no stuck state |
| U8 | Multi-location provider consistency (F-217-1) | With near-me + open-now active, compare a known multi-location provider's presence in the near-me List vs the normal List/Map; document any open-status divergence (expected: nearest-location hours vs provider-level hours) |
| U9 | Loading / error / empty states | Force slow network → skeleton grid; offline/RPC failure → error + Retry works; empty radius → empty state (note: wording says "open restaurants" even when open-now off — accepted) |
| U10 | Tap-through | Tapping a near-me card navigates to `/providers/{id}` (keyboard Enter/Space works) |
| U11 | Regression on second activation | Deactivate near-me (chip tap) → normal grid returns; reactivate → near-me list returns (no stale/duplicate results) |

Manual mobile validation is **not** delegated in this QA phase — it is the next pipeline stage (UAT) by design; the checklist above is the executable contract. This QA phase verified everything automatable (unit/component/regression/static/live-browser) and found no blocking defects.

---

## QA Verdict

**Status: QA Complete**

**Release decision: APPROVED FOR RELEASE** (technical QA gate)

Rationale:
- All 44 independently re-run tests pass; type-check and delta lint clean.
- Live-browser smoke proves the value statement end-to-end with real data (distance-ordered, ≤25 km, distance badges) and confirms the map branch is unchanged.
- Release blockers all clear (version artifacts aligned, branch diff scoped, TDD table complete).
- No OPEN findings. F-QA-2 is an acknowledged pre-existing data-source difference with a UAT check item; F-QA-1 is pre-existing, out of scope, routed for separate analysis.

**Next**: DevOps creates the PR and deploys to UAT; human UAT executes the checklist above (U1–U11). After the human pass, the formal UAT doc (`agent-output/uat/217-…`) records the final release approval.
