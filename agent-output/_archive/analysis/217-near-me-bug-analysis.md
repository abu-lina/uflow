---
ID: 217
Origin: 217
UUID: 7d3a9c1e
Status: Active
---

# Analysis: "Near me" on the Home Menu List View Does Nothing

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-08-17 | Analyst | Opened analysis. Root cause determined (L1). Doc awaiting Planner. |

## Value Statement and Business Objective

Mobile users open the home screen (root `/`, Stage 2/3 discovery home) and tap
the **"In der Nähe" / "Near me"** chip in the header while in **List view**,
expecting the list to reorder to nearby providers or filter by proximity. The
control does nothing visible in List view, so a core discovery affordance is
perceived as broken. This analysis identifies *where* the near-me signal stops
being consumed and *what* a fix must connect, so the Planner can scope a
contained, testable change.

## Objective

Convert the unknown "why doesn't near me work on the List view" into a proven
root cause with file/line evidence, and give the Planner a concrete, testable
fix direction.

## Context

There are **two independent "near me" implementations** in the codebase, and
they must not be conflated:

| Surface | Path | Near-me implementation | Status |
|---------|------|------------------------|--------|
| **Search page** | `/search` → `/providers` (`ProvidersContent`) | `useNearMeToggle` + `useNearMeSearch` + `NearMeOpenNowFilters` + `NearMeResultsGrid` + `search_food_near_me` RPC (Plan 196) | **Functional** (released v0.15.8 etc.) |
| **Home page (this bug)** | root `/` → `RootPageContent` → `HomeSearchBar` chip + `HomeListView` | `handleNearMeChange` → `useGeolocation` → `userCoords` → `SearchMap` only (Plans 208/212) | **Near-me has no List-view consumer** |

The report targets the **home page List view** (mobile Stage 2/3, the map↔list
toggle at `RootPageContent.tsx:393-410`). Prior "nearby" work (Plan 142,
`agent-output/uat/142-nearby-clickable-uat.md`) concerns the **provider detail
page** "nearby" section navigation, not this surface.

## Methodology

1. Traced the full UI path: chip click → handler → geolocation → state → render,
   reading source directly.
2. Read the two near-me implementations side by side to isolate what the home
   page is missing relative to the search page.
3. Verified the `search_food_near_me` RPC and `locations` geo columns against
   the **live linked DEV Supabase** (`qrekonfhaenjdnjhwdum`) via the PostgREST
   REST endpoint (workflow.mdc DB-verification rule), not just migration files.
4. Reviewed existing tests to confirm the gap is uncovered.

## Findings

### F1 (L1 Proven) — The near-me output only reaches the MAP view

`RootPageContent.tsx:91-97` — the home page's entire near-me handler:

```ts
const handleNearMeChange = (nextNearMe?: boolean) => {
  if (nextNearMe === false || geolocation.status === 'granted') {
    geolocation.reset();
    return;
  }
  geolocation.requestLocation();
};
```

It only calls `requestLocation()` (first tap) or `reset()` (re-tap when already
granted). It never computes distance, never filters/sorts, and never writes
URL state.

`RootPageContent.tsx:83-89` — the only product of a granted request:

```ts
const userCoords = useMemo(() =>
  geolocation.status === 'granted' && geolocation.coords
    ? { lat: geolocation.coords.latitude, lon: geolocation.coords.longitude }
    : null,
  [geolocation.status, geolocation.coords]);
```

`userCoords` is consumed in exactly one place — `RootPageContent.tsx:377-380`,
the **map** view:

```tsx
<SearchMap pins={pins} userCoords={userCoords} />
```

`SearchMap.tsx:100-120` reacts to it by centering/zooming the map:

```ts
mapRef.current.setView([userLat, userLon], 14);
```

### F2 (L1 Proven) — The List view has no access to near-me state

`RootPageContent.tsx:383-390` — the List view receives only `pins`:

```tsx
{viewMode === 'list' && (
  <HomeListView headerOffset={headerHeight} isLoading={pinsLoading}
    isOpenNow={isOpenNow} pins={pins} />
)}
```

`HomeListView.tsx:9-15` — its props are `pins`, `isLoading`, `isOpenNow`,
`headerOffset`. There is no coordinate, radius, or distance prop, and the
component (lines 17-101) does no distance work: it renders `pins.map(...)` in
a grid. Tapping "near me" while in List view changes **zero** inputs to this
component.

### F3 (L1 Proven) — `pins` is never distance-sorted or radius-filtered

`RootPageContent.tsx:99-125` builds `pins` from `allRows` (every approved food
location) and applies only the open-now filter:

```ts
return filterOpenNow(Array.from(unique.values()), isOpenNow);
```

`filterOpenNow` (`src/utils/filterOpenNow.ts`) is order-preserving and only
keeps currently-open items. No haversine/distance step exists on this path, and
`allRows` is loaded once via a direct `supabase.from('locations').select(...)`
query (`RootPageContent.tsx:127-144`) that is unaware of user location.

### F4 (L1 Proven) — The search page already has the working pattern

The `/search` → `/providers` flow (`useNearMeSearch.ts`, `useNearMeToggle.ts`,
`NearMeResultsGrid.tsx`, `services/providers.ts:51-71` `searchFoodNearMe`)
proves the intended behavior and reusable pieces:

- `search_food_near_me` RPC returns distance-ordered `distance_km` results.
- `NearMeResultsGrid.tsx:101` renders `ProviderCard` with a `distanceKm` prop.
- `utils/distance.ts:formatDistance` formats km/m for display.

### F5 (L1 Proven) — The DB dependency is live and functional

Live DEV DB verification (PostgREST, anon key, `qrekonfhaenjdnjhwdum.supabase.co`):

- `locations` has populated `location_latitude` / `location_longitude`
  (sample rows returned, e.g. `50.06051030 / 8.37019630`).
- `rpc/search_food_near_me` executes and returns distance-ordered rows, e.g.
  near Wiesbaden `(50.06, 8.37)` → `distance_km` values `0.06, 21.99, 22.11, 23.57`.

The home page therefore does **not** need new backend work to gain a working
"near me" — the RPC it would reuse is already deployed.

### F6 (L2 Observed) — DEV RPC schema lags migration 122

The live `search_food_near_me` response omits `category_id` / `category_name_de`
/ `category_name_en` / `category_images` (added by migration 122 / Plan 204),
while the `NearMeFoodResult` type (`providers.ts:27-40`) declares them. This is a
DEV-vs-PROD drift, not the cause of this bug, but relevant if the fix reuses the
search page's `NearMeResultsGrid` (it forwards category props).

### F7 (L1 Proven) — No test covers near-me → List view

Existing coverage only asserts wiring/visual state, never list behavior:

- `src/__tests__/regression/plan212-near-me-viewport.test.tsx` — asserts
  `requestLocation` on activate / `reset` on deactivate. Mocked `HomeListView`.
- `src/__tests__/features/search/HomeSearchBar.test.tsx` — asserts chip turns
  green only when `granted`, and callback boolean compatibility.
- `src/__tests__/components/RootPageContent.layout-regression.test.tsx` — section
  selector layout only.

None assert that activating near-me changes what `HomeListView` renders.

## Root Cause (L1 Proven)

The home page's "near me" control was built (Plans 208/212) to **center the map
on the user**, and that is the *only* thing it does. Its sole output,
`userCoords`, is passed exclusively to `SearchMap`. The List view
(`HomeListView`) is fed the same unordered `pins` array regardless of near-me
state. There is no consumer of the near-me signal on the List-view branch, so
activating "near me" in List view produces no visible change — the feature is
effectively unwired on that branch.

This is the same bug class as the Plan 196 `open_now` fix
(`agent-output/implementation/196-near-me-open-restaurants-search-implementation.md`,
line 47): *a control exists and writes state, but nothing on the target path
consumes it*. It is not a geolocation-permission failure (Plan 209/212 already
handle denied/timeout), not a dead button, not an i18n miss, and not a DB
failure.

### State-machine / conditional-render coverage

`viewMode` is a two-branch state (`'map' | 'list'`, `RootPageContent.tsx:76`).
The near-me chip is rendered in the shared header (visible in both branches):

| Branch | Near-me effect | Confidence |
|--------|----------------|------------|
| `map` | Confirmed functional — `SearchMap.setView` centers/zooms; QA'd in Plan 212/209 | L1 |
| `list` | Confirmed broken — no consumer of `userCoords`/distance | L1 |

No third branch exists. Both branches enumerated; none are "unverified".

## System Weaknesses

1. **Feature parity assumption** (code/process): the home near-me chip reuses the
   `suchen.nearMe.*` i18n labels and `MapPin` iconography from the search page,
   implying identical behavior, but was implemented as a map-centering-only
   affordance. No doc or test captures this narrower intent.
2. **Single-output wiring** (code): `userCoords` is a leaf input to exactly one
   component. Adding a second consumer (the list) is where the feature should
   converge, but nothing enforces that near-me state reaches every view.
3. **No test asserts behavioral parity** between Map and List near-me (see F7).

## Instrumentation Gaps

| Signal | Level | Purpose |
|--------|-------|---------|
| `geolocation_outcome` (already logged, `useGeolocation.ts:77-85`) | Normal | Confirms grant/deny/timeout; already present. |
| `searchmap_setview_executed/skipped` (already logged, `SearchMap.tsx:105-119`) | Normal | Confirms the map branch consumed coords. **No equivalent exists for the List branch** — a `home_list_nearme_*` event would make the missing consumer observable in production. |
| `search_food_near_me` RPC timing/error | Debug | Needed if the fix introduces an RPC call on the home page; capture error + param shape for triage. |

## Analysis Recommendations (next steps to confirm, not solutions)

1. **Confirm user expectation** with the reporter: should "near me" on List view
   (a) reorder the list nearest-first, (b) filter to a radius, or (c) both? This
   determines whether the fix reuses `search_food_near_me` (radius + order) or a
   client-side haversine sort of the already-loaded `pins`.
2. **Verify `ProviderCard` accepts `distanceKm`** and whether `NearMeResultsGrid`
   can be reused on the home page (both exist; confirm prop signature and
   category-prop dependency against F6).
3. **Establish the expected data source** for the list: the RPC
   (`search_food_near_me`, proven live) vs. sorting the existing `pins`
   client-side. The RPC path already handles radius clamp (≤25 km) and
   nearest-location-per-provider; the client-side path would reuse `pins.lat/lng`
   with no new query but no server radius clamp.
4. **Add a regression test** that activates near-me and asserts the list output
   changes (order/filter), following the repo's `[pre-fix FAILS / post-fix
   PASSES]` convention. The pre-fix expression is "list is identical with and
   without near-me"; the post-fix expression is "list is distance-ordered/filtered
   when near-me is granted".

## Open Questions

1. Does the product owner want the home List view to show a distance badge on
   each card (like the search page), or only reorder/filter?
2. Should the home near-me keep working on the Map view (it does today) while the
   List fix is added, or be unified into one shared hook (e.g., `useNearMeSearch`
   is section-scoped to `food` and URL-param-driven, which the home page does not
   currently use)?
3. Is DEV's missing migration 122 (F6) in scope to fix alongside this, or handled
   by DevOps separately?

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact desired List-view behavior (reorder vs filter vs both, distance badge?) | Product decision, not code | Confirm with reporter/owner | [TBD — Orchestrator] |
| 2 | Whether to reuse RPC vs client-side haversine for the list | Depends on gap #1 and latency/radius-clamp needs | Prototype both against `pins` + `search_food_near_me` | Planner |
| 3 | DEV vs PROD migration 122 drift (category fields on RPC) | DB state, tangential to bug | Confirm PROD has migration 122 applied | DevOps |
| 4 | No live production telemetry for the List-branch near-me consumer | Requires deploying instrumentation first | Add `home_list_nearme_*` debug log once fix is implemented | Implementer |
