---
ID: 215
Origin: 215
UUID: 140019f7
Status: Committed
---

# Analysis 215 — "Near Me" Broken on iPhone SE PWA (Home Page Map)

## Changelog

| Date (UTC)        | Agent   | Change |
| ----------------- | ------- | ------ |
| 2026-08-16T22:20Z | analyst | Analysis created; 8 findings documented; root cause classified as on-device gap (214-overlap vs 212-DF3), not a code defect |
| 2026-08-16T22:30Z | analyst | On-device evidence received; Plan 214 ruled out; DF-3 gap confirmed; root cause updated; F7 L3→L2; F9 added |
| 2026-08-16T22:45Z | planner | Plan created: agent-output/planning/215-near-me-ios-pwa-geolocation-plan.md |
| 2026-08-16T23:50Z | devops | Status: Committed — Stage 1 lifecycle commit for release v0.15.16 |

---

## Value Statement and Business Objective

A mobile user on iPhone SE in PWA (standalone) mode taps "Near Me" on the home
page. Expected: the map pans/zooms to their location so nearby restaurants are
visible. Actual: nothing useful happens — no nearby stores appear, the map does
not move. The user cannot discover nearby food providers on the primary mobile
device class. This analysis determines whether the symptom is (a) the Plan 214
home-map header touch-interception bug, (b) the Plan 212 geolocation flow that
was never validated on device (DF-3), or (c) a new independent defect — so the
Planner can decide between "coordinate with Plan 214" and "author a new fix."

---

## Context

### Prior work (all shipped, in main)

- **Plan 211** (v0.15.13) — fixed grey map tiles on iPhone.
- **Plan 212** (v0.15.14, commit `5b69d740`) — refactored the home-page Near Me
  flow: geolocation ownership moved into `RootPageContent` via `useGeolocation`;
  `SearchMap` became a pure display component (`userCoords` prop, no internal
  `getCurrentPosition`); `HomeSearchBar` chip state mapped to the geolocation
  lifecycle (`idle → prompting → granted/denied/timeout/unavailable`).
- **Plan 209** (v0.15.15, commit `1cd6389a`, current HEAD) — added
  platform-specific denied-state recovery hints to `HomeSearchBar` and
  `NearMeOpenNowFilters`.

### Parallel-session awareness (CRITICAL)

- **Plan 213** (GitHub #321, in flight): "Restore filter controls on mobile
  search page." Touches the `/search`/filters surface — **not** the home map.
  No overlap with this investigation.
- **Plan 214** (GitHub #322, in flight): "Home Map Header Touch Interception
  Fix." Claimed root cause: Leaflet map (`position: absolute; inset: 0`)
  overlaps the fixed header (z-50) containing the `HomeSearchBar` chips; on iOS
  Safari PWA, Leaflet's touch handler intercepts taps in the overlap zone,
  making Near Me / Open Now / search input UNTAPPABLE in map view.
  **Plan 214 is NOT released** (production is v0.15.15).
- **Plan 215 (this ID)**: new investigation. Scope is to determine which root
  cause explains the user's symptom and whether a new fix is warranted — NOT to
  duplicate Plan 214's touch-interception scope.

### Verified repo state

- `git rev-parse HEAD` = `1cd6389ad35c739dd9deca872b846ac105082025` = v0.15.15
  (`package.json` version `0.15.15`). Tags `v0.15.15` present.
- Plan 213/214 changes are **NOT** in main (git log shows 209 → 212 → 211 as the
  most recent feature commits). No `213-*`/`214-*` docs exist under
  `agent-output/`.
- Search/Near-Me source files (`RootPageContent.tsx`, `SearchMap.tsx`,
  `HomeSearchBar.tsx`, `useGeolocation.ts`, `useNearMeToggle.ts`,
  `ProvidersContent.tsx`, `NearMeResultsGrid.tsx`) are **clean at HEAD** (no
  working-tree diff). The only uncommitted changes are unrelated
  chat/saved/agent files.
- `agent-output/.next-id` = `216` (owned by control window; untouched).

---

## Methodology

1. Read all prior-art docs for Plans 209/212 (analysis, implementation, QA, UAT,
   open-actions) to establish what shipped and what was deferred.
2. Full code inspection of the home-page Near Me chain:
   `HomeSearchBar` (chip click) → `RootPageContent.handleNearMeChange` →
   `useGeolocation.requestLocation` → `userCoords` memo → `SearchMap` pan effect.
3. Code inspection of the Path B results chain for completeness:
   `useNearMeToggle` → `syncUrl` → `useNearMeSearch` → `searchFoodNearMe` RPC →
   `NearMeResultsGrid`.
4. Stacking/hit-testing audit of the map vs header: traced all ancestors from
   root (`RootClientLayout`) through `PageTransition` into `RootPageContent` for
   `transform`/`filter`/`contain`/`backdrop-filter` that could re-parent
   `position: fixed` elements.
5. `git log`/`git show` on `SearchMap.tsx` and `RootPageContent.tsx` to confirm
   the z-index structure predates Plan 212 (introduced in `4c10e903`).
6. Ran targeted Vitest suites (`SearchMap`, `HomeSearchBar`,
   `plan212-near-me-viewport`, `useGeolocation`) — **31/31 passed** (L1 evidence
   that the refactored wiring is correct in the test environment).
7. RPC signature review against migration `120_plan_196_search_food_near_me.sql`
   (local file). Live DB verification was **not possible** — no
   `SUPABASE_DB_URL` in env or `.env.local` (only `NEXT_PUBLIC_SUPABASE_URL`
   + `SUPABASE_SERVICE_ROLE_KEY`); `supabase`/`psql` CLIs present but no linked
   project/DB URL. Noted as a gap (Path B RPC is not implicated in the
   home-page symptom anyway).

No source code was modified.

---

## Affected Code Paths

| Path | Entry point | Component chain | Symptom it serves |
|------|-------------|-----------------|-------------------|
| **A — Home page map** | `RootPageContent.tsx` → `HomeSearchBar` (Near Me chip) → `useGeolocation` → `userCoords` → `SearchMap` | `handleNearMeChange` → `requestLocation()` → `status=granted` → `setView([lat,lon], 14)` | "moves the map towards my location" + "show near me stores" (pins near user) |
| **B — /providers results** | `ProvidersContent.tsx` → `NearMeOpenNowFilters` → `useNearMeToggle` → `useNearMeSearch` → `searchFoodNearMe` RPC → `NearMeResultsGrid` | chip → `requestLocation()` → `syncUrl` (near_lat/lon/radius) → RPC → distance-ordered list | "show near me stores" as a results list (no map) |

**Determination (L1): the user hit Path A.** The report says "moves the map
towards my location" — only Path A has a map. Path B renders a list and has no
map, so it cannot produce the "map doesn't move" symptom.

---

## Findings

### F1 [L1 Proven] — Plan 212 refactor is present and correct in main (v0.15.15); no code defect in the wiring

Evidence:
- `RootPageContent.tsx:81` calls `useGeolocation()`; `:83-89` derives
  `userCoords` only when `status === 'granted'`; `:91-97`
  `handleNearMeChange` calls `requestLocation()` on activate and `reset()` on
  deactivate/granted-re-tap.
- `SearchMap.tsx` contains no `getCurrentPosition` (grep confirmed; source-guard
  test asserts this). Pan effect at `:90-93`:
  `useEffect(..., [userLat, userLon]) → mapRef.current?.setView([userLat, userLon], 14)`.
- `HomeSearchBar.tsx:120` fires `onNearMeChange?.(!nearMeIsActive)`;
  `nearMeIsActive = geoStatus === 'granted'` (`:50`).
- Targeted Vitest run: **31/31 passed** across `SearchMap.test.tsx`,
  `HomeSearchBar.test.tsx`, `plan212-near-me-viewport.test.tsx`,
  `useGeolocation.test.ts`.

The chip-tap → request → grant → pan chain is sound in the test environment.
Any failure must therefore be **on-device** (OS/browser behavior), not in the
React wiring.

### F2 [L1 Proven] — "Near Me" on the home page only recenters the map; it does NOT filter pins by distance

`RootPageContent.tsx:99-125` builds `pins` from `allRows`, filtered **only** by
`isOpenNow` (`filterOpenNow`). There is no distance filter against `userCoords`.
`SearchMap` receives the full city pin set and `userCoords`; `userCoords` only
drives `setView(..., 14)` (≈1 km viewport).

Consequence: both halves of the user's report — "doesn't show near me stores"
AND "doesn't move the map" — are the **same single failure**: the map never
panned to their location. Once the map pans to zoom 14, nearby pins become
visible on screen. This collapses the bug surface to "the map didn't pan."

### F3 [L1 Proven] — Header (z-50) sits ABOVE the map (z-20) in the static stacking order; no transformed ancestor traps the fixed elements

Stacking trace (from code):
- Root `RootClientLayout.tsx:119` `div.relative` → `<main class="overflow-y-auto overscroll-none">` (`:134`) → `PageTransition` `div.relative flex ... transition-opacity` (`PageTransition.tsx:26`) → `RootPageContent` mobile tree.
- Header: `RootPageContent.tsx:331-333` `fixed left-0 right-0 top-0 z-50`.
- Map wrapper: `:370-375` `position: absolute; inset: 0` (no z-index).
- Map: `SearchMap.tsx:116` `fixed inset-0 z-[20]` (isolation isolate).

Neither `PageTransition` (only `transition-opacity`, no transform) nor `<main>`
(`overflow-y-auto` does not create a fixed-position containing block) nor any
other ancestor applies `transform`/`filter`/`perspective`/`contain`/`backdrop-
filter`. So both `position: fixed` elements resolve against the viewport, and
`z-50 (header) > z-20 (map)` — the header paints above the map and a plain CSS
hit-test routes a tap on the chip to the chip, **not** to Leaflet.

This structure is unchanged since the map feature landed (`4c10e903`); Plan 212
(`5b69d740`) did not alter z-index. Implication for Plan 214: the "map overlaps
header" claim is **not a simple z-index layering bug in current main**. If real,
it must be an iOS Safari PWA runtime behavior (Leaflet `touch-action: none` +
gesture handling on a full-viewport element, or a `backdrop-filter` hit-testing
quirk). This cannot be proven or refuted from code inspection — it needs an
on-device reproduction.

### F4 [L2 Observed → RESOLVED] — Two mutually exclusive candidate root causes were distinguished by on-device evidence

Candidate 1 — **Plan 214 overlap (chip untappable):** tap produces zero
reaction (no pulse, no color change, no denied text, no pan).

Candidate 2 — **Plan 212 DF-3 (geolocation never grants on device):** tap
produces a visible pulse (`prompting`) then reverts with "Standort nicht
verfügbar" (or an iOS permission prompt appears and is denied) — no pan.

The verbatim report ("when I click it, it doesnt show near me stores or moves
the map") does not mention a pulse or a denied message. That is weakly
consistent with Candidate 1 (dead chip), but a non-technical user would not
reliably report a transient pulse or notice an inline denied label.

**RESOLUTION (on-device evidence, 2026-08-16):** the user reports the chip
**visually responds on tap** ("font color turns black") and **no iOS permission
prompt ever appears**. The tap registers and React state advances, which rules
out Candidate 1 (Plan 214 untappable). The absence of a prompt, an error label,
and a map pan confirms Candidate 2 (Plan 212 DF-3: geolocation never resolves
on device). See **On-Device Evidence** section below for the full disjunction
resolution.

### F5 [L2 Observed] — Plan 212 DF-3 (on-device iPhone SE validation) was deferred and NEVER executed; it is now overdue

- QA doc `212-near-me-pwa-fix-qa.md` lists DF-3 as "MANDATORY before release",
  owner UAT operator, due 2026-08-17 EOD.
- UAT doc `212-near-me-pwa-fix-uat.md` approved release "conditional on DF-3
  closure" with scenarios A/B/C/D (happy path, denied, timeout, deactivate) all
  `⏸️ deferred on-device`.
- Open-actions tracker `212-near-me-pwa-fix-open-actions.md` still shows DF-3
  **OPEN** (partial: Plan 209 added denied-state hint text, but the happy-path
  map pan and deactivate snap-back were never validated on a device).

Net: the production v0.15.15 Near Me flow has **never** been exercised on an
actual iPhone SE PWA. The feature was released on automated-test evidence only.

### F6 [L2 Observed] — `useGeolocation` options are reasonable but the 10s timeout may be too short for indoor first GPS fix on iPhone SE

`useGeolocation.ts:74` uses `{ enableHighAccuracy: false, timeout: 10000,
maximumAge: 5 * 60 * 1000 }`. Inherited from Analysis 212 Open Question #3
("is 10 s still too short for first-launch GPS on iOS?"), which was **never
resolved** because DF-3 was never run. With `enableHighAccuracy: false` iOS uses
cell/WiFi triangulation (usually fast), but indoor/urban cold-start can exceed
10 s → `timeout` → no coords → no pan. This is a plausible secondary
contributor to Candidate 2 but is unverified (L2).

### F7 [L2 Observed, upgraded from L3] — iOS standalone PWA geolocation permission prompt is suppressed (user-confirmed)

iOS standalone PWAs run in WKWebView, where the geolocation permission prompt
has a history of being suppressed or bound to the underlying Safari per-site
setting. **Confidence upgraded L3 → L2 (2026-08-16):** the user confirmed on
device that **no permission prompt ever appears** when tapping Near Me in the
standalone PWA. This is direct observation of the prompt-suppression behavior,
not just a documented class of iOS quirks.

**Refinement beyond the original F7 prediction:** the original hypothesis said
the suppressed prompt would cause `getCurrentPosition` to *fail* with
`PERMISSION_DENIED`/`POSITION_UNAVAILABLE`, surfacing the denied label. The
user instead reports **no error label and no reversion** — the chip stays
visually active and nothing happens. That means the request does **not** error;
it **hangs** (neither callback fires), leaving `useGeolocation` status stuck at
`prompting` indefinitely. This is a worse failure mode than a clean deny,
because the state machine has no terminal state to surface guidance from (see
F9). Remaining gap to reach L1: an instrumented log capturing the
`getCurrentPosition` callback (or its absence) + the `standalone` display-mode
flag, which would prove the hang directly rather than inferring it.

### F8 [L1 Proven] — Path B (/providers results) is intact in code and not implicated in this report

`useNearMeToggle.ts` → `useGeolocation` → `syncUrl` writes `near_lat`/
`near_lon`/`near_radius`; `useNearMeSearch.ts` reads them and calls
`searchFoodNearMe`; `search_food_near_me` RPC (migration 120) has the expected
signature `(p_lat, p_lon, p_radius_km, p_limit)`, correct GRANTs, and is covered
by `120-search-food-near-me-tdd.test.ts` + `providers-near-me.test.ts`.
`NearMeResultsGrid` handles loading/error/empty/distance-order states. No code
defect found; this path also depends on the same `useGeolocation` grant and is
therefore subject to the same unvalidated on-device risk.

**DB verification gap (noted):** no live DB connection was available
(`SUPABASE_DB_URL` absent). The RPC was reviewed from the local migration file
only. The home-page bug does not touch any RPC (it uses a direct
`locations`/`providers` select), so this gap does not block the root-cause
determination.

### F9 [L2 Observed, user-confirmed] — Geolocation request hangs indefinitely on iOS standalone PWA; "font turns black" is a CSS hover effect, not a state transition

The user's "chip font color turns black" is explained by CSS, not by geolocation
progress. The chip's inactive class is `text-content-muted ... hover:text-content`
(`HomeSearchBar.tsx:117`). `text-content-muted` = `hsl(var(--color-text-muted))`
(gray); `text-content` (DEFAULT) = `hsl(var(--color-text-primary))` (near-black)
(`tailwind.config.ts:275-279`). On iOS Safari a tap triggers the simulated
`:hover` state, flipping the label from gray to near-black — a pure CSS visual
effect that fires on **any** tap regardless of whether the handler runs.

Diagnostic value of this distinction:
- The "black font" alone does **not** prove `requestLocation()` ran. It proves
  only that the tap hit the chip (Plan 214 ruled out).
- The wiring that turns a tap into `requestLocation()` is nonetheless code- and
  test-verified (F1): `HomeSearchBar.onClick → onNearMeChange(!nearMeIsActive) →
  RootPageContent.handleNearMeChange(true) → requestLocation()`. No gap exists.
- The decisive negative evidence is what the user did **not** see: no
  "Standort nicht verfügbar" label (which `HomeSearchBar` renders for
  `denied`/`timeout`/`unavailable`, `:48` and `:126-131`) and no green active
  chip (which requires `granted`). Therefore the state machine never reached a
  terminal state. The only non-terminal state `requestLocation()` can enter is
  `prompting` (`useGeolocation.ts:55`). Since `navigator.geolocation` clearly
  exists (otherwise the hook would set `unavailable` and render the label),
  `getCurrentPosition()` was called and **neither callback has fired** — the
  request is hung.

Implication: the `timeout: 10000` `PositionOptions` value (F6) may be **moot**.
The Geolocation spec says the browser should fire the error callback with
`TIMEOUT` (code 3) after the timeout elapses, but the user reports "nothing
happens afterwards" (no timeout error label) — so either the user did not wait
10 s, or iOS standalone suppresses the timeout callback along with the prompt.
This determines whether a JS-level watchdog is mandatory (see Recommendations).

---

## On-Device Evidence (User-Reported, 2026-08-16)

Two observations were collected from the user holding the iPhone SE PWA:

1. **Q:** "What happens when you tap the Near Me chip?"
   **A:** "Chip font color turns black, nothing happens afterwards."
2. **Q:** "Do you see any permission prompt from iOS?"
   **A:** "No prompt ever appears."

### Disjunction resolution

| Candidate | Before | After on-device evidence |
|-----------|--------|--------------------------|
| **Plan 214 overlap** (chip untappable) | Could not be ruled out | **RULED OUT** — the chip visually responds on tap, so taps are not intercepted; the chip is tappable |
| **Plan 212 DF-3** (geolocation never grants on device) | Could not be ruled out | **CONFIRMED** — no prompt, no error, no pan = geolocation request never resolves |

### "Stuck in prompting" symptom detail

The chip stays visually active (black label from the iOS `:hover` effect + a
subtle `animate-pulse` on the icon/label once `prompting` is set) and never
reverts, and no denied message appears. The `useGeolocation` state machine only
leaves `prompting` via the `getCurrentPosition` success or error callback;
since neither fires, status remains `prompting` indefinitely. `userCoords` stays
`null`, `SearchMap.setView` never runs, the map never pans, and no nearby stores
become visible.

### Confidence updates from this evidence

- **F4** (two candidates) → RESOLVED: Plan 214 ruled out, Plan 212 DF-3 confirmed.
- **F7** (prompt suppression) → upgraded L3 → L2 (user directly observed "no prompt").
- **F6** (10 s timeout) → still relevant but reframed: the question is now
  whether the browser *honors* the timeout at all when the prompt is suppressed
  (see F9), not merely whether 10 s is long enough for a GPS fix.

---

## Root Cause Determination

**Classification: Plan 212 DF-3 gap CONFIRMED; Plan 214 overlap RULED OUT.**

**Primary root cause (confirmed):** on the iPhone SE standalone PWA, tapping
Near Me reaches `useGeolocation.requestLocation()`, which calls
`navigator.geolocation.getCurrentPosition()`. iOS **never shows the permission
prompt** and **never invokes either the success or the error callback** — the
request hangs. The `useGeolocation` status is therefore stuck at `prompting`
(the only non-terminal state it can enter), `userCoords` stays `null`,
`SearchMap.setView` never fires, and the map never pans. The chip shows no
terminal feedback because the denied/timeout/unavailable states are only
reachable via the error callback, which never fires.

This is exactly the failure Plan 212's DF-3 gate was meant to catch on device
before PROD, and it was never executed. The chip-tap → request → pan wiring
itself is correct and unit-tested (F1) — the defect is not in the React code
but in the iOS standalone PWA geolocation runtime, which the app has no
watchdog or fallback for.

**Confidence:** the *failure itself* (geolocation never resolves on this
device; no prompt, no error, no pan) is **L1** — directly user-observed. The
*specific mechanism* (WKWebView/standalone prompt suppression causing a hung
`getCurrentPosition`) is **L2** — inferred from the observable pattern
(no-prompt + no-error + no-pan) plus known iOS standalone-PWA behavior; proving
it at L1 requires an instrumented build logging the callback outcome and the
`standalone` display-mode flag.

**Not implicated:** Plan 214 (touch interception) — ruled out because the chip
visibly responds to taps. No new independent code defect was found.

---

## System Weaknesses (Architecture / Code / Process)

| # | Weakness | Risk mechanism |
|---|----------|----------------|
| 1 | **On-device gate was never enforced before PROD.** QA marked DF-3 "MANDATORY", UAT made release "conditional on DF-3", yet v0.15.15 shipped without it. | A feature whose entire failure surface is OS/device-specific shipped with only automated (jsdom) evidence. |
| 2 | **Geolocation UX has no "in-progress result" surfacing on the map itself.** The chip pulses but the map gives no "acquiring location…" cue; when it fails, the only signal is a small inline label below the chip. | On a small iPhone SE screen, users can easily miss the denied/timeout label and read the feature as "silently broken." |
| 3 | **"Near Me" on the home page does not filter pins by distance** (F2). | Even a successful pan shows all city pins at zoom 14; product intent ("show near me stores") relies entirely on viewport zoom, which is fragile and unreviewed. |
| 4 | **Duplicate geolocation option sets could drift again.** Path A (`useGeolocation` in `RootPageContent`) and Path B (`useGeolocation` in `useNearMeToggle`) share the hook, but `SearchMap` previously held its own divergent copy (fixed in 212). | A single shared hook is correct; the prior drift (no timeout) was only caught by analysis, not by a test. The timeout value itself (10 s) remains empirically unvalidated. |
| 5 | **No telemetry on geolocation outcomes.** `useGeolocation` error callback sets state but logs nothing. | Device-specific failures are invisible in production; every recurrence will require a fresh on-device investigation. |
| 6 | **No client-side watchdog on the geolocation request.** The state machine relies entirely on the browser's `getCurrentPosition` success/error callbacks and its `PositionOptions.timeout`. | On iOS standalone PWA the prompt is suppressed and the callbacks (including possibly the timeout) never fire, leaving the UI stuck in `prompting` forever with no error path. |

---

## Instrumentation Gaps

| Gap | Type | What to add | Normal or Debug |
|-----|------|-------------|-----------------|
| Geolocation outcome from `useGeolocation` | Missing | Log `{ status, errorCode?, elapsedMs, standalone: matchMedia('(display-mode: standalone)').matches }` on grant/deny/timeout/unavailable | **Normal** (low-volume, actionable, no PII) |
| Chip tap registered vs intercepted | Missing | Log on `onNearMeChange` entry (only confirms the handler ran) | **Debug** (short window during investigation) |
| `setView` executed vs skipped | Missing | Log `[SearchMap] setView(lat, lon, 14)` and `[SearchMap] setView skipped (mapRef null)` | **Normal** (low-volume) |
| Permission prompt visibility (iOS PWA) | Missing | Capture `error.code` from `getCurrentPosition` (1 = denied, 2 = unavailable, 3 = timeout) — the code is already available in the hook but not emitted | **Normal** (single structured field) |
| GPS timing | Missing | `performance.now()` from `requestLocation()` to success/error callback | **Debug** |

---

## Analysis Recommendations (Next Steps for Planner)

**Direction change:** coordinating with Plan 214 is now **moot** for this
symptom — the chip is tappable, so 214's touch-interception fix does not apply
to the Near Me failure. The confirmed direction is to make the iOS standalone
PWA geolocation flow **actually resolve, or fail gracefully with actionable
feedback**, instead of hanging silently. Investigation/fix candidates for the
Planner to scope (analysis-level, not implementation instructions):

1. **Detect iOS PWA standalone mode and branch handling.** Investigate
   `navigator.standalone` (legacy iOS) and/or
   `matchMedia('(display-mode: standalone)')` to identify the standalone-PWA
   context where the prompt is suppressed.
2. **Add a client-side watchdog to `useGeolocation`.** Because the browser's
   `PositionOptions.timeout` may not fire on iOS standalone (see F9/Open Q1),
   test whether a JS `setTimeout` that forces status `prompting → timeout` (or a
   new `unavailable`-style terminal state) plus guidance text resolves the
   silent-hang. Verify this against the actual device — do not assume the
   browser timeout is reliable.
3. **Probe `navigator.permissions.query({ name: 'geolocation' })`.** Determine
   whether iOS reports a `denied` permission state (e.g. user previously denied
   in Safari before adding to home screen, which iOS inherits without
   re-prompting). If so, surface the existing Plan 209 recovery hint text
   (`permissionDeniedHintIos`) rather than hanging.
4. **Investigate previously-denied-in-Safari inheritance.** Ask the user to
   check Safari → Settings → Location Services for ummahflow.com (Open Q3). If
   the site was ever denied there, iOS will not re-prompt in the PWA, and the
   fix is to detect that state and show the recovery path.
5. **Investigate retry-on-user-gesture semantics.** iOS may only present the
   prompt on a fresh user gesture; test whether a second tap (or a re-request
   from a fresh gesture) can elicit the prompt after an initial suppressed
   attempt.
6. **Close Plan 212 DF-3** now that the failure is reproduced: validate the
   eventual fix on the real iPhone SE PWA across the original scenarios (happy
   path, denied, timeout, deactivate).
7. **Add the two `Normal` instrumentation lines** (geolocation outcome incl.
   `standalone` flag + error code; `setView` executed/skipped) so this class of
   failure is diagnosable from logs next time.

---

## Open Questions / Remaining Gaps

| # | Unknown | Blocker | Required action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | ~~Chip untappable vs tappable-but-failing~~ **RESOLVED** — chip is tappable (Plan 214 ruled out); geolocation never resolves (Plan 212 DF-3 confirmed) | — | Closed by on-device evidence 2026-08-16 | — |
| 2 | ~~Does the iOS standalone PWA prompt appear?~~ **RESOLVED** — no prompt ever appears (F7) | — | Closed by on-device evidence 2026-08-16 | — |
| 3 | Does the `PositionOptions.timeout` (10 s) actually fire the error callback on iOS standalone PWA, or does the request hang past the timeout? | Needs user to wait >10 s after tap and report whether "Standort nicht verfügbar" appears | Ask user: after tapping Near Me, wait 10–15 s — does any message appear, or does the chip stay black/unchanged indefinitely? | User / QA operator |
| 4 | Was location permission previously denied for ummahflow.com in Safari (inherited into the PWA without re-prompting)? | Needs user to check Safari settings | Ask user: Safari → Settings → Location Services (or Website Data) → find ummahflow.com and report its permission state | User / QA operator |
| 5 | Does the prompt appear in regular Safari (non-standalone) for the same site? | Needs a non-PWA browser test | Open ummahflow.com in Safari (not standalone), tap Near Me, observe prompt | User / QA operator |
| 6 | Is 10 s sufficient for first GPS fix once the prompt *does* appear? | Blocked until the prompt issue (Q3/Q4) is resolved | Re-measure after the flow resolves | QA/UAT operator |
| 7 | Does `search_food_near_me` RPC match the live DB (not just migration 120)? | No `SUPABASE_DB_URL`/DB link in env | `supabase db dump --schema public` or psql against Supabase | Analyst (only if Path B is later implicated) |
| 8 | Should "Near Me" on the home page filter pins by distance rather than only recenter the map? | Product decision (F2) | Product owner direction | PO |

---

## Files to Modify (candidates — for the Planner, once the fix is scoped)

| File | Reason | Trigger |
|------|--------|---------|
| `src/hooks/useGeolocation.ts` | **Primary target.** Add a client-side watchdog (`setTimeout` that forces a terminal state + guidance) for when `getCurrentPosition` hangs; add standalone-mode detection and outcome logging (`{ status, errorCode?, standalone, elapsedMs }`) | Confirmed root cause (F7/F9); requires on-device validation |
| `src/features/search/components/HomeSearchBar.tsx` | Surface a terminal "location unavailable — check Settings" state from the watchdog (reuse Plan 209 `permissionDeniedHintIos`) instead of leaving the chip stuck | Only after `useGeolocation` exposes the watchdog terminal state |
| `src/features/search/components/SearchMap.tsx` | Add `setView` executed/skipped logging | Low priority, diagnostic |
| `src/components/shared/RootPageContent.tsx` | (Product decision) optionally filter `pins` by distance when `userCoords` is set | Only if PO wants true "near me stores" filtering (F2) |

**Note on merge sequencing:** Plan 214's fix was presumed to target
`RootPageContent.tsx` / `SearchMap.tsx` (z-index/pointer-events), but that
overlap is now ruled out for this symptom. If Plan 215 work ends up touching
`useGeolocation.ts` only, there is no conflict with 214. If it also touches the
header/map, sequence after 214 merges. The Planner should confirm 214's actual
file set before scheduling.
