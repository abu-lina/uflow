---
ID: 261
Origin: 261
UUID: 261-food-city-scroll-block
Status: Merged
Type: bug
Branch: fix/261-food-city-scroll-block
Worktree: ../uflow-wt/261-food-city-scroll-block
Created: 2026-09-26
---

# Request 261: /food/[city] unscrollable for seconds on mobile PWA

## Original request

> on mobile on iphone se pwa, on https://uat.ummahflow.com/food/stuttgart i cannot scroll for some seconds.

## Classification

- **Type:** bug
- **Route:** Bug flow (Diagnose -> Fix -> Code Review -> Done)
- **Confidence:** high

## Phases

| #   | Phase                 | Status | Outcome                                                        |
| --- | --------------------- | ------ | -------------------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                                      |
| 1   | Diagnose              | Done   | Root cause identified at code level; magnitude corrected later |
| 2   | Fix                   | Done   | `546ccf06` (parts 1/2/4), `c9c1e88b` (part 3)                  |
| 3   | Code Review           | Done   | Both diffs reviewed and accepted; nits folded into `c9c1e88b`  |
| 4   | Done                  | Done   | PR #420, learnings captured in `c5b07e11`                      |
| 5   | Conflict resolution   | Done   | Merged `origin/main` (#419) in `8e499a1e`; take-both resolution |
| 6   | Merged                | Done   | PR #420 squash-merged to main as `be158d3f`; worktree removed   |

## Diagnosis

### Root cause

`/food/[city]` eagerly mounts the full Leaflet map and every nationwide food pin
into a **hidden** container while the user is in list view. All of that work runs
on the main thread during hydration, so the first touch cannot start a scroll.

The chain, all confirmed statically:

1. `src/app/(public)/food/[city]/page.tsx` -> `renderProvidersPage({ routeSection: 'food' })`
   -> `<ProvidersContent>` **without** `showGreeting`, so `showGreeting === false`.
2. `ProvidersContent.tsx:692-701` renders `<SearchMap>` whenever
   `!showGreeting && section === 'food'` — i.e. **always** on this route,
   regardless of `viewMode`. It is only visually suppressed via
   `visibility: viewMode === 'map' ? 'visible' : 'hidden'`. `visibility: hidden`
   hides pixels; it does not stop mount, effects, network, or layout.
3. `SearchMap` (dynamic, `ssr: false`) pulls in `leaflet` + `leaflet/dist/leaflet.css`
   and on mount calls `L.map(...)` + `L.tileLayer(...)`, which requests OSM tiles
   for an invisible map.
4. `useMapDiscovery` (`src/features/search/hooks/useMapDiscovery.ts:180-194`) calls
   `getMapLocations(reviewStatus)` on mount, unconditionally.
5. `getMapLocations` (`src/services/providers/map-pins.ts:35-56`) selects **every
   approved food location in the database** — no city filter, no limit, no
   pagination — joined with providers + categories.
6. `SearchMap`'s marker effect then loops every pin and calls
   `L.marker(..., { icon: createPinIcon() })`. `createPinIcon` builds an inline
   SVG HTML string of roughly 8 KB per pin (three long `path` data strings, a
   mask, an SVG filter with `feGaussianBlur`), which Leaflet injects as
   `innerHTML` per marker.

Net effect on a low-power device: Leaflet parse/execute, a full-table location
fetch, and N x ~8 KB of HTML string construction plus DOM parsing, all for a map
that is not on screen. The main thread is saturated for seconds, so the first
touch on the list does not begin scrolling.

### Aggravating factor (secondary)

`src/styles/globals.css:369-379` applies `-webkit-overflow-scrolling: touch` to
`*` inside `@supports (-webkit-touch-callout: none)`. On iOS this promotes every
element to a scrolling/compositing layer. It widens the window of any main-thread
stall rather than causing it, so it is a follow-up, not the fix.

### Ruled out

- **Scroll lock leak** — `useScrollLock` is ref-counted and has a DOM-attribute
  recovery path; no modal is mounted on this route.
- **Overlay swallowing touches** — `visibility: hidden` is inherited by the
  `fixed inset-0 z-[20]` root inside `SearchMap`, so it is not hit-testable in
  list mode.
- **Empty page / nothing to scroll** — initial results are server-rendered by
  `renderProvidersPage`, so list content is in the HTML on first paint.

### Magnitude correction (post-recon)

The original framing overstated the marker cost. UAT holds only **6 approved food
locations with coordinates** nationwide, 1 in Stuttgart (774 food locations exist,
but 801 are pending and 110 rejected, and `getMapLocations` filters to
`approved`). So the marker loop ran ~6 times on UAT, not hundreds.

The costs actually removed on UAT are the Leaflet chunk parse/execute, `L.map()`
init plus tile requests, one Supabase round trip, and the universal
`-webkit-overflow-scrolling` rule that promoted every element to a compositing
layer. The pin sprite and the query cap are production-scale wins, not the UAT fix.

### Still to confirm on device

The symptom is not verified. The UAT/local list for Stuttgart has a single item,
so there was nothing to drag locally; the browser check proves the work is gone
(0 leaflet requests, 0 `locations` requests in list view), not that the freeze is.
Needs a real iPhone SE PWA pass once #420 reaches UAT.

## Decisions

| #   | Decision                   | Choice                                 | Rationale                                                                                                                                                       |
| --- | -------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fix scope                  | All of lazy-mount, pin icons, query cap | User chose the full scope over the minimal lazy-mount.                                                                                                          |
| 2   | Lazy pin fetch default     | Opt-in flag, not new default            | `RootPageContent` feeds `pins` to `HomeListView` in list view, so deferring globally would break the home page.                                                  |
| 3   | Keep map mounted after open | `hasOpenedMap` latch                   | Toggling back to list must not tear down the Leaflet instance and refetch.                                                                                       |
| 4   | Pin artwork                | One `<symbol>` sprite + shared `<use>` icon | Removes ~8 KB of `innerHTML` per marker. Geometry preserved via nested `<svg x/y/width/height/viewBox>` rather than re-deriving path coordinates.            |
| 5   | `getMapLocations` scoping  | Limit only, no city filter              | Reversed from the initial "all three" after recon: `providers.address_city` is free text, so filtering risks an empty map where it disagrees with `cities`. Also saves nothing on UAT's 6 rows. |
| 6   | Limit determinism          | `.order('provider_id')` with the cap    | Without ordering, truncation is nondeterministic and pins shuffle between loads once the cap is hit.                                                             |
| 7   | iOS CSS scope              | Included in this fix                    | User chose to include it rather than defer. Only universal selectors (`*`, `main *`) lost the property; targeted scroll containers keep it.                       |

## Implementation notes

- Branch: `fix/261-food-city-scroll-block` → PR #420
- Commits: `546ccf06` (lazy-mount, sprite, CSS), `c9c1e88b` (query cap, review nits), `c5b07e11` (learnings)
- Files changed: `useMapDiscovery.ts`, `ProvidersContent.tsx`, `SearchMap.tsx`, `globals.css`, `map-pins.ts`, `services/providers/index.ts`
- Tests added: `src/__tests__/regression/plan261-food-city-scroll-block.test.tsx` (10), `src/__tests__/services/map-pins.test.ts` (6)

## Review findings

### Standards axis

- Accepted both diffs. Part 1 matched the design exactly; CSS change was minimal and surgical.
- Nits folded into `c9c1e88b`: collapsed a pure `pinSpriteInnerHtml()` called once at module scope into a plain constant; added a comment documenting that `dangerouslySetInnerHTML` receives a module constant with no interpolated user input.
- Accepted as-is: duplicate `id="uflow-pin-symbol"` would occur if two `SearchMap` instances mounted at once. Not reachable today (the three consumers are on separate routes) and `<use>` would resolve to the first identical symbol anyway.
- Accepted as-is: prettier reformatted two unrelated `LEARNINGS.md` lines; reverting would fight `lint-staged`.

### Spec axis

- All four agreed parts landed. Decision 5 reversed the user's initial choice on the basis of new recon data and was re-gated with them before implementing.

## QA results

- Suite: pass. 23 tests across `map-pins.test.ts` (6), `plan261-*.test.tsx` (10), `SearchMap.test.tsx` (7); `plan226-view-toggle-url-sync.test.tsx` (12) also green.
- `npm run type-check` clean; `eslint` clean on changed files.
- Browser (iPhone SE viewport): list view fires 0 leaflet and 0 `locations` requests; map view renders all pins via `<use href="#uflow-pin-symbol">`.
- Regressions: none found. Home-page eager-fetch behaviour is pinned by a dedicated test.
- **Outstanding:** the reported freeze is not confirmed fixed on real hardware. See "Still to confirm on device".

## Follow-up requests

- Confirm the freeze is gone on a real iPhone SE PWA once #420 reaches UAT.
- Leaflet needs marker clustering beyond a few hundred pins; `MAP_LOCATIONS_LIMIT` bounds the fetch but does not solve render cost.
- Consider viewport-bounds pin loading for the map, which would make the cap largely moot.
- `-webkit-overflow-scrolling: touch` still appears on broad `[class*='overflow']` / `[class*='scroll']` selectors; narrowing those was out of scope here.
- `console.error` seen in dev: "Cannot update a component (`Router`) while rendering a different component (`ProvidersContent`)". Looks pre-existing, not introduced by this change; worth its own request.

## Learnings

Three entries appended to `docs/ai/LEARNINGS.md` in `c5b07e11` and `546ccf06`:

1. `visibility: hidden` is not lazy — hidden React trees still hydrate, fetch, and burn the main thread.
2. Size a suspected cost against real row counts before calling it the root cause.
3. PostgREST streams every matching row unless you pass an explicit `.limit()`; pair it with `.order()`.
