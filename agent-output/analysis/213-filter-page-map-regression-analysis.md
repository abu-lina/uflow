---
ID: 213
Origin: 213
UUID: 9d4a1f3c
Status: Planned
---

# Analysis 213 — Filter Page Map Regression (UAT, iPhone SE PWA)

## Changelog

| Date              | Agent   | Change                                                         |
| ----------------- | ------- | -------------------------------------------------------------- |
| 2026-08-16T18:00Z | analyst | Analysis created; root cause identified L1 Proven via git diff |
| 2026-08-16T18:35Z | planner | Status updated to Planned; plan 213 created                    |

---

## Value Statement and Business Objective

On UAT, mobile users navigating to `/search?section=food` (the filter/search setup page) see a full-screen map instead of the filter controls (Was / Wo / Wer / Filter accordions). This blocks a core user journey: users cannot set category, distance, or audience filters before executing a food search. Root cause must be identified so @Planner can scope a minimal fix.

---

## Context

- **Affected URL**: `https://uat.ummahflow.com/search?section=food` (and `/search` with no params — food is the default)
- **Device**: iPhone SE PWA (viewport ~375px, well under the 768px `md` breakpoint)
- **Symptom**: Food/Ummah/Stores tab bar visible at top; map renders in the content area; no filter controls visible; no way to access the filter panel from this view
- **Plans in scope**: Plan 208 (mobile search map, v0.15.10, 2026-08-15) and Plan 211 (iPhone tile fix, v0.15.13, 2026-08-16) per the session brief; Plan 212 (Near Me viewport fix, v0.15.14, 2026-08-16) also investigated

---

## Methodology

1. Read `src/app/(public)/search/page.tsx` in full to understand current render logic
2. Read `src/hooks/useIsMobile.ts` to understand `isMobile` initialization and value
3. Ran `git show 4c10e903 --stat` and grep on the diff to identify what Plan 208 changed in `search/page.tsx`
4. Ran `git show 31f16b63 --stat` and `git show 5b69d740 --stat` to confirm Plans 211 and 212 file scope
5. Read `agent-output/planning/closed/208-mobile-search-map.md` M3 milestone to confirm intended design
6. Read `src/components/shared/RootPageContent.tsx` to locate the existing map/list toggle (home page)
7. Grepped the codebase for any filter toggle on the search page

---

## Findings

### F1 — The Conditional (L1 Proven)

**File**: `src/app/(public)/search/page.tsx`, line 591  
**Introduced by**: Plan 208, commit `4c10e903`, v0.15.10, 2026-08-15

```typescript
const isMobileFoodMapMode = isMobile && selectedSection === 'food';
```

When `isMobileFoodMapMode` is `true`, three things happen:

| Location | Behaviour |
|---|---|
| Line 764 | `PageHeader` (back button + "Suchen" title) is **hidden** |
| Lines 782–788 | `accordionBody` (Was/Wo/Wer/Filter stack) is **replaced** by `<SearchMap>` |
| Line 792 | Fixed bottom bar (Clear All + Search button) is **hidden** |

On iPhone SE (375px viewport), `useIsMobile()` returns `true`. `selectedSection` defaults to `'food'` when the URL has `?section=food` or no section param. Therefore `isMobileFoodMapMode` is always `true` for this device + URL combination — the map renders unconditionally and the entire filter UI is inaccessible.

### F2 — No Filter Access Mechanism on the Search Page (L1 Proven)

There is no button, route, or state toggle on `search/page.tsx` that allows a mobile food user to access the filter accordion. The `ErrorBoundary` fallback (`fallback={accordionBody}`) only fires if the map component throws — not as a user-triggered toggle.

The map/list toggle that does exist in `RootPageContent.tsx` (lines 392–411, `viewMode: 'map' | 'list'` state + floating toggle button) is implemented on the **home page** (`/`) only. It was never ported to `search/page.tsx`.

### F3 — Plan 208 Design Intent (L1 Proven)

Plan 208 planning document, M3 milestone, explicitly states:

> "When `useIsMobile()` returns `true` AND `selectedSection === 'food'`: Render `<SearchMap>` instead of the Was/Wo/Wer/Filter accordion stack"

No mechanism for filter access in this mode was specified or implemented. The commit message mentions "Map/list toggle controls" i18n'd — but this refers to `map.switchToList` / `map.switchToMap` keys that live in `RootPageContent.tsx`, not in `search/page.tsx`.

### F4 — Plan 211 Did Not Introduce the Regression (L1 Proven)

`git show 31f16b63 --stat` confirms Plan 211 changed only:

- `src/features/search/components/SearchMap.tsx` — 1 line removed (`crossOrigin: 'anonymous'`)
- `next.config.js` — SW regex fix + CSP host correction

`search/page.tsx` was **not touched**. The conditional guard has been unchanged since Plan 208.

### F5 — Plan 212 Did Not Introduce the Regression (L1 Proven)

`git show 5b69d740 --stat` confirms Plan 212 changed:

- `src/features/search/components/SearchMap.tsx` — geolocation prop: `isNearMe` → `userCoords`
- `src/components/shared/RootPageContent.tsx` — centralized geolocation
- Test files

`search/page.tsx` was **not touched**.

### F6 — Why the Regression Was Only Noticed After v0.15.14 (L2 Observed)

The filter-inaccessibility bug has existed since Plan 208 shipped (v0.15.10, 2026-08-15). It became visible to the reporter because:

1. **Plan 211** (v0.15.13): Fixed grey tile rendering on iPhone — the map now renders correctly instead of showing a broken grey screen. Before this fix, iPhone users likely ignored or closed the broken map view.
2. **Plan 212** (v0.15.14): Fixed the Near Me viewport on iPhone SE — the overall iPhone map experience is now functional and credible, making the absent filter controls undeniable.

This is a "fixed display reveals hidden regression" pattern: the underlying design gap was always there; fixing the visible brokenness made it obvious.

### F7 — `useIsMobile` Hydration Flash (L2 Observed, Secondary)

`useIsMobile` initializes to `false` (SSR-safe):

```typescript
const [isMobile, setIsMobile] = useState(false);
```

The real value is set in `useEffect` after the first client paint. This means the filter accordion renders briefly before `isMobile` becomes `true` and the map takes over. This is a secondary flash UX issue, not the root cause of filter inaccessibility.

### F8 — State-Machine Branch Coverage (L1 Proven)

Per the Analyst instruction to enumerate all reachable branches before handoff:

| Branch | Condition | Filter Accessible? | Status |
|---|---|---|---|
| `food` + mobile (`isMobile=true`) | `isMobileFoodMapMode=true` | **No** | **Broken** (this bug) |
| `ummah` + mobile | `isMobileFoodMapMode=false` | Yes — accordion renders | Working |
| `store` + mobile | `isMobileFoodMapMode=false` | Yes — accordion renders (minus `wer`) | Working |
| `food` + desktop (`isMobile=false`) | `isMobileFoodMapMode=false` | Yes — accordion renders | Working |
| `ummah` + desktop | `isMobileFoodMapMode=false` | Yes — accordion renders | Working |
| `store` + desktop | `isMobileFoodMapMode=false` | Yes — accordion renders (minus `wer`) | Working |

Only the `food + mobile` branch is broken. All other branches are unaffected.

---

## Root Cause

**L1 Proven** — directly verified via git diff, file read, and plan document.

Plan 208 (`4c10e903`, v0.15.10) introduced `isMobileFoodMapMode = isMobile && selectedSection === 'food'` in `src/app/(public)/search/page.tsx` (line 591). This condition is `true` on any mobile viewport (< 768px) when the food section is active — which is both the default and the explicit `?section=food` state. When true, `<SearchMap>` renders unconditionally and the entire filter accordion stack is hidden with no toggle, back route, or access point. The regression went unnoticed until Plans 211/212 made the map functionally visible on iPhone.

**Root cause is NOT** in Plan 211 (tile fix) or Plan 212 (viewport fix). Neither touched `search/page.tsx`.

---

## System Weaknesses

| # | Weakness | Risk Mechanism |
|---|---|---|
| W1 | Map/filter toggle implemented on home page only, not on search page | Inconsistent navigation architecture; mobile food users have no path to filter controls |
| W2 | Plan 208 M3 acceptance criteria did not include "filter controls remain accessible on mobile food" | Gap in acceptance criteria allowed the regression to pass QA |
| W3 | `useIsMobile` initializes `false` then flips to `true` after hydration | Causes content flash on mobile; filter panel briefly appears then disappears |
| W4 | UAT on-device validation for Plan 208 did not cover the filter accessibility user journey | Validation focused on map rendering, not on what was removed |

---

## Instrumentation Gaps

| Gap | Type | Why needed |
|---|---|---|
| No analytics event for mobile users reaching `/search?section=food` vs completing a search | Normal | Would surface abandonment rate; quantify business impact |
| No client error logging when `isMobileFoodMapMode` hides filter controls | Normal | Would allow monitoring of affected session volume |

---

## Analysis Recommendations

1. **Verify the fix vector in `RootPageContent.tsx`** — the home page implementation of `viewMode: 'map' | 'list'` with a floating toggle button is the proven pattern. Confirm whether the same pattern is appropriate for `search/page.tsx`, or whether default-to-filter-with-map-opt-in is preferred UX.
2. **Confirm `useIsMobile` flash is acceptable post-fix** — if the filter accordion becomes the default view again, the current `useState(false)` initialization means mobile users briefly see the filter panel before any switch. Consider whether the initial value should be derived from `navigator.userAgent` or left as-is.
3. **Check Plan 208 UAT record** — verify whether filter accessibility was tested on mobile food in the original Plan 208 UAT gate, or whether it was a blind spot.

---

## Open Questions

| # | Question | Status |
|---|---|---|
| OQ1 | Should the map be the default on mobile food with filter accessible via toggle, or should filter be the default with map accessible via toggle? | For Planner to decide with user |
| OQ2 | Should the fix also add a "Near Me" chip to `search/page.tsx` map mode (currently only on home page map)? | Out of scope for this analysis; note for Planner |

---

## Remaining Gaps

None — root cause is L1 Proven. All state-machine branches analyzed. Fix vector is clear for Planner to scope.
