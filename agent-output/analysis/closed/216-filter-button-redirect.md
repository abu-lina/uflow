---
ID: 216
Origin: 216
UUID: b56d488e
Status: Committed
---

# Analysis 216: Filter Button Redirects to Map Instead of Filter Page

## Changelog

| Date | Agent | Action | Notes |
|------|-------|--------|-------|
| 2026-08-17 | Analyst | Document created | RCA for filter-button → map redirect (mobile + desktop report) |

---

## Value Statement and Business Objective

Users who tap the filter (sliders) button on the home searchbar expect to reach the filter page (the `/search` accordion UI where they can refine "Wo / Was / Wer / Filter"). Instead, on mobile the app lands on a full-screen map with no path to the filters, blocking core search refinement. This degrades the primary search funnel and was reported on both iPhone and desktop.

**Objective**: Determine the exact navigation handler(s) that route the filter button, identify why the destination renders a map instead of the filter accordions, and confirm whether a dedicated filter route exists and what its correct path is.

---

## Context

- UFlow is a Next.js 15 App Router app. Public routes live under `src/app/(public)/`.
- The home screen searchbar (`HomeSearchBar`) is a mobile-only component rendered inside `RootPageContent` (`md:hidden`).
- Plan 208 (commit `4c10e903`, "feat(search): Add mobile map view with restaurant pins (#307)") introduced a mobile map view: on mobile, the Food section of `/search` now renders a Leaflet `SearchMap` instead of the filter accordions.
- Feature flags at the time of writing: `isAppLaunched = false`, `skipWaitlist = true` (`src/config/feature-flags.ts`).
- No dedicated `/filter` route exists. The "filter page" is the `/search` route, which renders filters inline via accordions.

## Methodology

- Static code tracing of the filter button click handler → destination route → conditional render.
- Git archaeology (`git log`, `git show 4c10e903`) to identify when the regression was introduced.
- Grep sweep for every `SlidersHorizontal` / `/search` navigation to enumerate all entry points.
- Review of the Plan 208 feature diff, regression test (`plan208-mobile-search-map-switch.test.tsx`), and retrospective.
- No DB verification required — this is a pure client-side routing/conditional-render bug (no data validation, enums, or column constraints involved).

## Findings

### F1 (L1 Proven) — The filter button navigates to `/search?section=food`

`src/features/search/components/HomeSearchBar.tsx:79-81`

```ts
const handleSlidersClick = () => {
  router.push(`/search?section=${activeSection}`);
};
```

Wired to the sliders button at `HomeSearchBar.tsx:100-107` (`aria-label={t('home.searchFiltersAriaLabel')}`, `onClick={handleSlidersClick}`).

The active section defaults to `'food'` in `RootPageContent.tsx:74` (`useState<Section>('food')`), so the destination is effectively `/search?section=food`.

This behavior predates Plan 208 (unchanged since Plan 090). Test `src/__tests__/features/search/HomeSearchBar.test.tsx:71-75` asserts `mockPush` is called with `/search?section=food`.

### F2 (L1 Proven) — On mobile, `/search?section=food` renders a map, not the filters

`src/app/(public)/search/page.tsx:591`

```ts
const isMobileFoodMapMode = isMobile && selectedSection === 'food';
```

`src/app/(public)/search/page.tsx:782-788`

```tsx
{isMobileFoodMapMode ? (
  <ErrorBoundary fallback={accordionBody}>
    <SearchMap pins={mapPins} />
  </ErrorBoundary>
) : (
  accordionBody
)}
```

When `isMobile` (viewport `< 768px`, `useIsMobile.ts:14`) and `section === 'food'`, the filter accordions (`accordionBody` — the Wo/Was/Wer/Filter sections) are replaced by `SearchMap`. Additionally:

- The back button / title header is hidden: `search/page.tsx:764` (`!isMobileFoodMapMode && <PageHeader …/>`).
- The bottom "Clear all / Suchen" bar is hidden: `search/page.tsx:792` (`!isMobileFoodMapMode ? … : null`).

Net effect on mobile Food: the user is dropped onto a full-screen map with no back button and no filter controls. The `SectionSelector` remains visible, but Ummah/Stores are inactive (`SECTION_META` → toast "coming soon"), so there is no escape route back to the filters for Food.

### F3 (L1 Proven) — The regression was introduced by Plan 208

`git log -S "isMobileFoodMapMode"` → single hit: `4c10e903 feat(search): Add mobile map view with restaurant pins (#307)`.

Before that commit, `/search` always rendered `accordionBody`; the filter button correctly reached the filter UI. Plan 208's intent was "mobile users visiting the Search page Food section see a map instead of category tiles" (commit message), but it did not account for the home searchbar filter button's purpose: its whole reason for navigating to `/search` is to expose the filter accordions.

### F4 (L1 Proven) — A second, identical entry point exists on the results page

`src/features/search/components/SearchContextBar.tsx:130-137`

```tsx
<button
  aria-label={editLabel}
  …
  onClick={() => router.push(`/search?section=${section}`)}
>
  <SlidersHorizontal … />
</button>
```

Rendered via `ProvidersPageHeader.tsx:59-66`, which is `sm:hidden` (mobile-only). Same bug path: mobile Food results → filter button → `/search?section=food` → map.

### F5 (L1 Proven) — The filter page route exists and its correct path is `/search`

There is no dedicated `/filter` route. The filter UI is `accordionBody` inside `src/app/(public)/search/page.tsx` (Wo/Was/Wer/Filter `ExpandSection`s, lines 593-759). The correct path for the Food filter page is `/search?section=food` — which is exactly where the button navigates. The bug is therefore not a wrong URL; it is that the destination page renders the wrong content (map) for mobile Food.

### F6 (L1 Proven) — On a genuine desktop viewport, the reported repro does not reproduce via the identified code path

- `HomeSearchBar` and `SearchContextBar` are both rendered only inside `md:hidden` / `sm:hidden` containers (`RootPageContent.tsx:315`, `ProvidersPageHeader.tsx:26`). They are not present on desktop.
- `isMobileFoodMapMode` requires `isMobile` (`window.innerWidth < 768`), which is `false` on desktop, so `/search?section=food` renders `accordionBody` (the filter page) — the regression test asserts exactly this (`plan208-mobile-search-map-switch.test.tsx:126-133`, "does not render map on desktop").
- The desktop header `SearchBar` (`src/components/layout/Header.tsx:259`) has a "Filter" pill that opens an in-place dropdown (`SearchBar.tsx:456-542`) and does **not** navigate to `/search` or a map.

**Conclusion for the desktop report**: the described behavior is not reproducible on a desktop-sized viewport through any discovered code path. See Gap G1.

### F7 (L2 Observed) — The mobile home screen is already a map, compounding the confusion

`RootPageContent.tsx:76` defaults `viewMode` to `'map'`, and `RootPageContent.tsx:370-381` renders `SearchMap` behind the search header. So the mobile home is itself a map. Tapping the filter button then navigates to `/search?section=food`, which is another map. The user experiences "I tapped filter and got a map again" with no visible filter UI.

## Root Cause

**Confidence: High (L1 Proven).**

The filter button is correctly wired to navigate to the filter page (`/search?section=food`). The regression is in the destination: Plan 208 (`4c10e903`) made `/search` render a full-screen `SearchMap` for `isMobile && section === 'food'`, replacing the filter accordions (`search/page.tsx:591` + `:782-788`). Because the home searchbar defaults to the Food section, the filter button now lands on the map instead of the filters, with the back button and bottom action bar also hidden (`search/page.tsx:764`, `:792`).

The fix is not a wrong URL, but a content-routing collision: the same `/search` route was repurposed as a mobile map view without preserving the "open filters" entry path that depends on it.

## System Weaknesses

1. **Single-route dual purpose** (architecture): `/search?section=food` is simultaneously (a) the filter page and (b) the mobile map view, distinguished only by `useIsMobile()` + section. Any component navigating to it for filtering purposes silently breaks when the viewport crosses the 768px threshold.
2. **Entry points not enumerated when repurposing the route** (process): Plan 208 changed `/search`'s mobile rendering but did not inventory every in-app navigation to `/search` (there are at least two filter buttons: `HomeSearchBar` and `SearchContextBar`).
3. **No explicit intent signal in the URL** (code): the filter button and the map view cannot be told apart by the destination; the page infers intent from device width rather than an explicit parameter (e.g., `?view=map` vs `?view=filters`).
4. **Missing escape hatch in map mode** (UX/code): in `isMobileFoodMapMode`, there is no back button and no way to reach the filter accordions (only the ErrorBoundary fallback would show them, and only on map failure).

## Instrumentation Gaps

No telemetry currently distinguishes "user intended filters" from "user intended map" on `/search`.

| Need | Type | Rationale |
|------|------|-----------|
| Log `search_page_render_mode` with `mode: 'map' | 'filters'`, `section`, `isMobile`, `referrer` | normal | Confirms which entry points land in map vs filter mode; cheap, low-volume, structured. |
| Log `filter_button_click` with `source: 'home' | 'context'`, `section` | debug | Confirms the real-world click path (especially the unresolved desktop report in G1). |
| `uflow_map_view` sessionStorage is already written (`SearchMap.tsx:84-87`) but is not tagged with how the user arrived. Adding a `arrivedVia` field would help correlate map sessions with entry point. | debug | Optional; helps attribute map sessions to the filter button. |

## Gap Tracking Table

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| G1 | How does the **desktop** report reproduce? On desktop (`≥768px`) `HomeSearchBar`/`SearchContextBar` are not rendered and `/search?section=food` shows the filter accordions (F6). | Cannot reproduce via code inspection; no desktop telemetry. | Reproduce on desktop at a window width `< 768px` (split-screen / devtools responsive). If it reproduces, it is the same mobile path at narrow viewport; if not, clarify with the reporter which exact button/page they used. Add the `filter_button_click` debug log (Instrumentation Gaps) to capture the source. | QA/UAT |
| G2 | Is the desktop Header `SearchBar` "Filter" pill implicated? It opens an in-place dropdown and does not navigate (F6). | Needs clarification from reporter. | Confirm whether the reporter's "filter button" is the header filter pill or the home sliders button. | UAT |

## Analysis Recommendations (next investigative steps, not solutions)

1. **Reproduce at the two breakpoints**: iPhone width (mobile, `<768px`) and a desktop browser resized below 768px. Confirm both land on the map. This collapses G1 fastest.
2. **Trace the ErrorBoundary fallback**: confirm that if `SearchMap` throws, `accordionBody` (the filters) is actually reachable — i.e., whether the filters are recoverable at all in map mode on mobile.
3. **Confirm the escape-hatch gap**: on mobile Food `/search`, verify no back button / bottom bar / filter toggle is present (F2), and record the exact set of visible controls (SectionSelector only).
4. **Enumerate all `/search` entry points** before any fix: `HomeSearchBar` (home) and `SearchContextBar` (results) are the two confirmed filter buttons; also account for `handleSubmit` empty-query path (`HomeSearchBar.tsx:66`) and `suchen` redirect.

## Open Questions

1. What is the intended UX for the filter button on mobile Food after Plan 208 — open the filter accordions, or is a map acceptable? This determines whether the fix is on the button side, the `/search` rendering side, or both.
2. Is the mobile map view intended to have any filter affordance at all, or is filtering deliberately deferred on mobile Food?

| 2026-08-17 | DevOps | Document closed | Status: Committed |
---

*Status: Active. This document is the origin of chain 216. Planner inherits ID/Origin 216 when creating the plan.*
