---
ID: 212
Origin: 212
UUID: 4c9e1a7d
Status: Planned
---

# Analysis 212 — Near Me Toggle Active but Map Viewport Not Updating (iPhone SE PWA)

## Changelog

| Date (UTC)        | Agent   | Change                                                                            |
| ----------------- | ------- | --------------------------------------------------------------------------------- |
| 2026-08-16T00:00Z | analyst | Analysis created; primary root cause identified at L1 Proven; 6 findings documented |
| 2026-08-16T00:30Z | planner | Status → Planned; plan 212-near-me-pwa-fix-plan.md created; GitHub issue #316 |

---

## Value Statement and Business Objective

Mobile users on iPhone SE in PWA (standalone) mode tap "Near Me" — the chip
activates but the map remains centered on the Germany centroid (zoom 6) instead
of panning to their actual location. The feature is effectively broken on the
primary mobile platform and iOS device class for UFlow users.

---

## Context

**Plan 211** (just merged) fixed grey map tiles on iPhone by:
- Narrowing the SW `runtimeCaching` image regex to Supabase host only
- Removing `crossOrigin: 'anonymous'` from the tile layer in `SearchMap.tsx`
- Correcting the CSP `connect-src` tile domain (`.org` → `.de`)

None of these changes touch geolocation code. The viewport-pan bug is
**pre-existing** and was **masked** by Plan 211's own breakage: with grey tiles
the user had no visual reference to know the map hadn't panned. Post-211, tiles
render, making the stale center/zoom obvious.

**Prior analysis referenced**: `agent-output/analysis/196-near-me-open-restaurants-search-analysis.md` — RPC and open-now design decisions for the `/providers` path.

---

## Methodology

1. Code inspection of all `getCurrentPosition()` call sites (2 found: `useGeolocation.ts`, `SearchMap.tsx`)
2. Code inspection of `HomeSearchBar.tsx` click handler — traced toggle signal flow
3. Cross-reference `useGeolocation.ts` options vs `SearchMap.tsx` options
4. Dependency array audit on all three `useEffect` blocks in `SearchMap.tsx`
5. `SearchMap.test.tsx` coverage audit — identified missing `isNearMe` test
6. `useNearMeToggle.ts` dep-array audit for stale closure risk
7. Attempted `vitest run` — node_modules absent in this worktree; test runner unavailable for live execution. All findings are L1/L2 from code inspection.
8. Variant scan: `grep getCurrentPosition src/**/*.{ts,tsx}` — two call sites only

---

## Affected Code Paths

Two distinct Near Me paths exist. Only **Path A** uses `SearchMap`.

| Path | Entry point | Toggle mechanism | Uses SearchMap? |
|------|-------------|------------------|-----------------|
| A — Home page map | `RootPageContent.tsx` → `HomeSearchBar` → `setIsNearMe(true)` → `SearchMap isNearMe={isNearMe}` | Simple boolean state, no geolocation guard | **Yes** — viewport bug lives here |
| B — /providers results | `ProvidersContent.tsx` → `useNearMeToggle` → URL params | `useGeolocation` hook with proper options | No — renders `NearMeResultsGrid` instead |

---

## Findings

### F1 [L1 Proven]: `SearchMap` calls `getCurrentPosition()` with no timeout — infinite default on iOS

**File**: `src/features/search/components/SearchMap.tsx`, lines 88–101

```typescript
useEffect(() => {
  if (!isNearMe) return;
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14);
    },
    () => {
      // Permission denied or unavailable — no-op
    },
    // ← NO third options argument
  );
}, [isNearMe]);
```

The Web Geolocation API spec defines the default `timeout` as `Infinity` when
no `PositionOptions` object is passed. On iOS Safari WKWebView in standalone
PWA mode:

- Indoor GPS acquisition (most restaurant/mosque searches) takes 10–60+ seconds
- With `timeout = Infinity` the success callback never fires until the GPS
  hardware delivers a fix — which may not happen for the duration of the user
  session
- Result: success callback never executes, `setView()` never called, map stays
  at Germany centroid (zoom 6)
- The chip **appears active** (React state is already `true` before the callback
  runs) creating the exact symptom reported: "toggle state = ON, map
  center unchanged"

**Contrast — `useGeolocation.ts` line 57** (the correct call used in Path B):
```typescript
navigator.geolocation.getCurrentPosition(
  successCb,
  errorCb,
  { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
);
```

`SearchMap` diverges from the established project contract: no timeout → infinite
wait → silent non-update on iOS.

**Evidence**: `getCurrentPosition` with no options confirmed at `SearchMap.tsx:93`
via grep; `useGeolocation.ts:57` confirmed with all three options. No device
needed — spec behavior is deterministic.

---

### F2 [L1 Proven]: `HomeSearchBar` fires toggle with no geolocation guard — chip activates before location is obtained

**File**: `src/features/search/components/HomeSearchBar.tsx`, line 105

```typescript
onClick={() => onNearMeChange?.(!isNearMe)}
```

This fires `setIsNearMe(true)` in `RootPageContent` **synchronously on click**,
making the chip appear active immediately. No call to `requestLocation()` or
check of `geolocation.status` occurs before flipping state.

Downstream effect:
1. `isNearMe=true` propagates to `<SearchMap isNearMe={true} />`
2. `SearchMap.useEffect([isNearMe])` fires
3. `getCurrentPosition()` is called with no timeout (F1)
4. Map stays at Germany centroid; chip remains active

The chip's visual state and the map's viewport state are **permanently
de-synchronized** because the chip is driven by a React boolean and the map
is driven by an async OS/GPS callback that may never complete.

Contrast: Path B's `useNearMeToggle.onToggleNearMe()` calls
`geolocation.requestLocation()` before setting `nearMeActive=true`, then
syncs the URL only after `geolocation.status === 'granted'`.

---

### F3 [L1 Proven]: `mapRef.current?.setView()` is silently swallowed if map unmounts before callback fires

**File**: `src/features/search/components/SearchMap.tsx`, line 95

```typescript
(pos) => {
  mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14);
},
```

The `?.` optional chaining means if `mapRef.current` is null (component has
unmounted, or the map cleanup ran), the call is a no-op with no error, no log,
no retry.

Scenario where this fires in practice:
- User taps Near Me on home page → GPS request starts (slow: Infinity timeout)
- User navigates away (e.g., taps a category row) before GPS delivers a fix
- `SearchMap` cleanup runs: `map.remove(); mapRef.current = null`
- GPS eventually delivers a fix
- Callback fires → `null?.setView(...)` → silent no-op
- User returns to home page → map re-mounts at saved `sessionStorage` position,
  not at user location

This is a **secondary contributor** compounding F1: even if `getCurrentPosition()`
eventually delivers a fix, it may arrive after the component is gone.

---

### F4 [L1 Proven]: Zero test coverage for `isNearMe → map.setView()` in `SearchMap`

**File**: `src/features/search/components/SearchMap.test.tsx`

The test file covers two cases only:
1. Container renders after data loads
2. Marker click navigates to provider detail

No test asserts that passing `isNearMe={true}` to `SearchMap` causes the Leaflet
mock's `mapInstance.setView` to be called with user coordinates. The Leaflet mock
captures `setView` calls but none are asserted.

This explains how the bug persisted — any fix (or reintroduction) of the viewport
pan would be invisible to the test suite.

---

### F5 [L2 Observed]: `useNearMeToggle` `useEffect` missing `syncUrl` in deps — stale closure risk (Path B only)

**File**: `src/features/search/hooks/useNearMeToggle.ts`, lines 118–126

```typescript
useEffect(() => {
  if (nearMeActive && geolocation.status === 'granted' && geolocation.coords) {
    syncUrl({ active: true, lat: ..., lon: ... });
  }
}, [geolocation.status, geolocation.coords]);  // syncUrl NOT listed
```

`syncUrl` is a `useCallback` with deps `[searchParams, nearMeActive, radiusKm, openNowActive, geolocation.coords, router, pathname]`.
Since `geolocation.coords` is in both the `syncUrl` deps AND the `useEffect`
deps, in practice `syncUrl` is always recreated before this effect re-fires —
so the stale closure risk is mostly theoretical. However, it is a React exhaustive-
deps lint violation that could produce subtle URL writes in edge cases (e.g.,
radius change happening simultaneously with coords arriving).

**Scope**: Path B only. Does not affect `SearchMap` viewport behavior.

**Confidence L2**: The mitigation (`coords` in both dep lists) may not cover all
code paths under concurrent state updates.

---

### F6 [L1 Proven]: Plan 211 is orthogonal — not a regression

Files changed in Plan 211:
| File | Change | Relation to geolocation |
|------|--------|------------------------|
| `next.config.js` | SW regex scoped to Supabase host; CSP tile domain fixed | None — SW intercepts image requests, not geolocation API calls |
| `src/features/search/components/SearchMap.tsx` | Removed `crossOrigin: 'anonymous'` from tile layer | None — `crossOrigin` is a fetch-mode attribute for `<img>`, not related to `navigator.geolocation` |
| `src/__tests__/regression/plan211-map-tiles-iphone.test.ts` | Regression test added | Tests tile config only |

`getCurrentPosition()` and `mapRef.current.setView()` were **not touched** by
Plan 211. The viewport bug existed before Plan 211; grey tiles masked it.

---

## Root Cause

**Primary root cause**: `SearchMap.useEffect([isNearMe])` calls
`navigator.geolocation.getCurrentPosition()` without a `timeout` option
(default = `Infinity`). On iPhone SE iOS Safari WKWebView standalone PWA, GPS
acquisition for indoor/urban environments takes 10–60+ seconds. With an
infinite timeout the success callback never fires within a typical user
interaction window, so `setView()` is never called and the map stays at the
Germany centroid.

**Contributing root cause**: `HomeSearchBar` fires `onNearMeChange(true)` on
chip click without requesting or awaiting geolocation permission, causing the
chip to appear active before any location data exists. This creates the exact
reported symptom: toggle ON, map unchanged.

**Determination**: Pre-existing bug, not a Plan 211 regression. L1 Proven from
code inspection.

---

## System Weaknesses (Architecture / Code / Process)

| # | Weakness | Risk Mechanism |
|---|----------|----------------|
| 1 | **Duplicate geolocation logic** — `SearchMap` has its own `getCurrentPosition()` call, separate from `useGeolocation`. Two call sites mean they can diverge (as they have). | Future changes to geolocation options in `useGeolocation` won't be reflected in `SearchMap`. |
| 2 | **Chip visual state decoupled from geolocation state** — `HomeSearchBar` toggles a plain boolean; there's no feedback loop telling it whether location was actually obtained. | Users see "active" chip but broken map with no error path. |
| 3 | **Silent failures** — `SearchMap`'s error callback is `() => {}` and `mapRef.current?.setView()` uses optional chaining. No log, no user feedback, no retry. | Geolocation failures (timeout, denial, unmount race) all produce the same UX: nothing happens. |
| 4 | **Zero test coverage for viewport pan** — `SearchMap.test.tsx` doesn't assert `setView()` was called. | Any fix or regression to the pan behavior is invisible to CI. |

---

## Instrumentation Gaps

| Gap | Type | What to add | Normal or Debug |
|-----|------|-------------|-----------------|
| Geolocation success/failure from `SearchMap` | Missing entirely | Log at warn/error level: `[SearchMap] geolocation {success\|error}: code, elapsed_ms` | Normal (low-volume, actionable for triage) |
| `getCurrentPosition` options used | Missing | Log options object at call site | Debug (only needed during investigation) |
| Map viewport set vs skipped | Missing | Log `[SearchMap] setView called / skipped (mapRef null)` | Normal |

---

## Analysis Recommendations (Next Steps for Planner)

1. **Fix `SearchMap.getCurrentPosition()` options** — add `{ timeout: 10000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }` to match `useGeolocation.ts`. This is the minimum fix; may be sufficient to resolve the reported symptom.

2. **Evaluate whether `SearchMap` should own geolocation at all** — alternatively, `RootPageContent` could use `useGeolocation` hook and pass `userCoords` as a prop to `SearchMap`, letting `SearchMap` call `setView()` on prop change instead of making its own `getCurrentPosition()` call. This eliminates duplicated geolocation logic and aligns with how Path B works.

3. **Coordinate chip state with geolocation status** — `HomeSearchBar.onNearMeChange` should not fire until at least a permission request is in progress; or `RootPageContent` should pass `geoStatus` to `HomeSearchBar` to show a loading/denied state on the chip.

4. **Add `isNearMe → setView` regression test** — `SearchMap.test.tsx` needs a test that asserts `mapInstance.setView` is called with user coordinates when `isNearMe` prop changes from `false` to `true`. Use the existing Leaflet mock structure.

5. **Fix `useNearMeToggle` deps array** (low priority, Path B only) — add `syncUrl` to the `useEffect` dependency array or use `useRef` to stabilize the reference.

---

## Open Questions / Remaining Gaps

| # | Unknown | Required Action | Owner |
|---|---------|-----------------|-------|
| 1 | Does the bug also reproduce on the `/search` page's `SearchMap`? | `/search/page.tsx` passes no `isNearMe` prop → that path never triggers the geolocation effect. Needs a product decision: is near-me map panning expected on `/search`? | Planner / PO |
| 2 | Is there a permission-prompt visibility issue in iOS PWA mode (prompt hidden behind keyboard/safe-area)? | Requires on-device verification. Not resolvable from code inspection. | QA (on-device) |
| 3 | Does fixing `timeout: 10000` resolve on iPhone SE in practice, or is 10 s still too short for first-launch GPS on iOS? | Requires on-device QA validation. Plan 211 also required on-device QA — pattern established. | QA (on-device) |

---

## Files to Modify (Candidate List for Planner)

| File | Reason |
|------|--------|
| `src/features/search/components/SearchMap.tsx` | Add `PositionOptions` to `getCurrentPosition()` call; optionally replace self-contained geolocation with a `userCoords` prop |
| `src/features/search/components/HomeSearchBar.tsx` | Guard `onNearMeChange` against firing before permission requested, OR lift geolocation to `RootPageContent` |
| `src/components/shared/RootPageContent.tsx` | Optionally use `useGeolocation` hook and wire `geoStatus` / `coords` to `SearchMap` |
| `src/features/search/components/SearchMap.test.tsx` | Add `isNearMe → setView` coverage |
