---
ID: 220
Origin: 220
UUID: b3e7a1c4
Status: Active
---

# Plan 220: Unify /food Results Page with Home Page List View

## Problem

The `/food?section=food&location=Stuttgart` results page (ProvidersContent) has different UI and near-me logic than the home page (`/`) list view. Users on PWA experience contradicting behaviour:

- Home page (`/`): DiscoveryHeader with HomeSearchInput, DiscoveryFilterBar (near me + open now + radius chips), map/list toggle, geolocation-based near-me with distance in cards.
- Food results page (`/food`): DiscoveryHeader with SearchContextBar (back arrow + search term display + sliders icon), DiscoveryFilterBar with URL-driven near-me (near_lat/near_lon params), no map/list toggle, no map view.

## Decisions (settled via grilling)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Keep `/food` route | Yes, restyle to match home page UI |
| D2 | Map/list toggle | Add same floating toggle button as home page |
| D3 | Default view mode on `/food` | List view (user just configured filters, expects results) |
| D4 | Near-me behavior | Switch from URL-driven to geolocation-based (like home page). Near-me overrides city filter. |
| D5 | Admin status filter placement | Inline into the same chip row as Near Me / Open Now (same visual style) |
| D6 | Search input | Replace SearchContextBar with HomeSearchInput |
| D7 | City label visibility | No need to display selected city label explicitly |

## Scope

### Files to modify

1. **`src/app/(public)/providers/ProvidersContent.tsx`** -- main refactoring target

### Changes required

#### 1. Replace SearchContextBar with HomeSearchInput (D6)

- Remove `SearchContextBar` import
- Add `HomeSearchInput` import
- In the `searchSlot` prop of `DiscoveryHeader`, render `<HomeSearchInput activeSection={section} />` instead of `<SearchContextBar ...>`
- The `selectedCategoryLabel`, `peopleSummary`, and category lookup logic can be removed (HomeSearchInput doesn't use them)

#### 2. Switch near-me from URL-driven to geolocation-based (D4)

- Remove URL-param-based near-me state (`nearLatParam`, `nearLonParam`, `nearRadiusParam`, `isNearMeMode` derived from URL)
- Add local state: `nearMeActive` (boolean), `radiusKm` (number, default 5), `isOpenNow` (boolean)
- Use `useGeolocation` hook to get coords when user taps Near Me
- Pass geolocation coords to `useNearMe` hook with `urlSync: false`
- `handleToggleNearMe`: toggle `nearMeActive` state + call `geolocation.requestLocation()` (same pattern as home page RootPageContent)
- `handleToggleOpenNow`: toggle `isOpenNow` state (no URL updates)
- `handleRadiusChange`: set `radiusKm` state (no URL updates)
- Remove the effect that syncs near-me coords to URL

#### 3. Add map/list toggle + SearchMap (D2, D3)

- Add `viewMode` state, default `'list'`
- Add `dynamic` import for `SearchMap`
- Add map pin loading from supabase (same query as home page RootPageContent: `locations` table joined with `providers` for food/approved)
- Add types: `RawCategoryRow`, `RawProviderRow`, `RawLocationRow` (same as home page)
- Compute `pins` from `allRows` via `useMemo` (same as home page), apply `filterOpenNow`
- Render `SearchMap` when `viewMode === 'map'` (absolute positioned, same as home page)
- Render `DiscoveryResultsGrid` when `viewMode === 'list'`
- Add floating toggle button (same markup as home page) positioned above navbar
- Pass `viewMode` to `DiscoveryHeader` so it adjusts backdrop blur for map

#### 4. Inline AdminStatusFilter into chip row (D5)

- The `DiscoveryFilterBar` already accepts an `adminSlot` prop that renders inline with the chip row
- Keep the existing pattern but ensure the admin chips use the same `inline-flex h-8` styling as the Near Me / Open Now chips
- The `AdminStatusFilter` component currently uses `motion.button` with `px-3 py-1.5 rounded-lg` styling
- Update `AdminStatusFilter` to match the chip style: `inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide`

#### 5. List view behavior

- When `viewMode === 'list'` and `nearMeActive`:
  - Use `useNearMe` results (includes `distance_km`) mapped via `adaptNearMeResult` (already sets `distanceKm`)
  - `DiscoveryResultsGrid` already renders distance when items carry `distanceKm` (via `enableDistance` prop)
- When `viewMode === 'list'` and NOT `nearMeActive`:
  - Use paginated search results from `useInfiniteQuery` (existing behavior)

### Code removed

- `SearchContextBar` import and usage
- URL-based near-me state derivation (`nearLatParam`, `nearLonParam`, `nearRadiusParam`, `isNearMeMode` from URL)
- Effects that sync near-me to URL params
- `selectedCategoryLabel` computation (HomeSearchInput doesn't need it)
- `peopleSummary` from searchParams (HomeSearchInput doesn't display it)
- Category label query (only needed for SearchContextBar display)

### Code added

- `dynamic` import for `SearchMap`
- Local state: `viewMode`, `nearMeActive`, `radiusKm`, `isOpenNow`
- `allRows` state + supabase query for map pins (copied from RootPageContent)
- `pins` memoization from `allRows` (copied from RootPageContent)
- `adaptMapPinToDiscoveryItem` function (copied from RootPageContent, for list fallback when near-me inactive)
- Floating map/list toggle button JSX
- `headerRef` + `headerHeight` state for list view offset

## Verification

- `npx tsc --noEmit` passes
- `npm run build` passes
- Manual: navigate from `/search` to `/food`, see HomeSearchInput, DiscoveryFilterBar with Near Me/Open Now chips, map/list toggle
- Manual: tap Near Me on `/food`, see geolocation prompt, then list with distance in cards
- Manual: toggle to map view, see SearchMap with pins
- Manual: admin user sees status filter chips inline with Near Me/Open Now

## Changelog

| Date | Agent | Action | Notes |
|------|-------|--------|-------|
| 2026-08-29 | Planner | Plan created | Grilling decisions D1-D7 settled |
