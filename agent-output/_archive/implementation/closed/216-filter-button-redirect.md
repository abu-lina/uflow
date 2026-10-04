---
ID: 216
Origin: 216
UUID: c91f3a2e
Status: Committed
---

# Implementation 216: Filter Button Redirects to Map Instead of Filter Page

## Changelog

| Date | Agent | Action | Notes |
|------|-------|--------|-------|
| 2026-08-17 | Implementer | Implementation completed | TDD red-green verified; tests/type-check pass; branch fix/216-filter-button-redirect pushed |

---

## Plan Reference

- **Plan**: `agent-output/planning/216-filter-button-redirect-plan.md`
- **Analysis**: `agent-output/analysis/216-filter-button-redirect.md`
- **Branch**: `fix/216-filter-button-redirect`
- **Commit**: `752469f1`

---

## Implementation Summary

The filter button on `HomeSearchBar` and the edit button on `SearchContextBar` both navigate to `/search?section=food`. Plan 208 changed `/search` so that mobile Food always rendered a full-screen map, which replaced the filter accordions and hid the back button / bottom action bar. This fix makes the map an explicit opt-in via `?view=map` while keeping the existing filter-button URLs unchanged.

Changes made:
- `src/app/(public)/search/page.tsx` now reads `urlView = searchParams.get('view')`.
- `isMobileFoodMapMode` now requires `urlView === 'map'` in addition to `isMobile && selectedSection === 'food'`.
- The map-pin fetch effect is gated on the same condition so Supabase is not queried when filters are shown.
- Regression tests in `plan208-mobile-search-map-switch.test.tsx` were extended with a `mockView` param and new tests for the no-view / `view=filters` paths.
- A guard test was added to `HomeSearchBar.test.tsx` asserting the sliders button still pushes exactly `/search?section=food` (no `view=map`).

This restores the primary search-refinement funnel on mobile while preserving the intentional mobile map deep link `/search?section=food&view=map`.

---

## Milestones Completed

- [x] M1 — Regression tests written first and confirmed RED
- [x] M2 — Implemented `view=map` opt-in and pin-fetch gate in `search/page.tsx`
- [x] M3 — Targeted tests GREEN; full `npm test` GREEN; `npm run type-check` GREEN; `npm run build` GREEN
- [x] M4 — Committed and pushed to `fix/216-filter-button-redirect`

---

## Files Modified

| Path | Changes | Lines |
|------|---------|-------|
| `src/app/(public)/search/page.tsx` | Read `urlView`; update `isMobileFoodMapMode`; gate pin-fetch effect; add `urlView` to effect deps | +4 / -3 |
| `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` | Add `mockView`; reset in `beforeEach`; update 2 existing map-positive tests; add 4 new regression tests | +57 / -6 |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | Add guard test asserting sliders button does not append `view=map` | +10 / -0 |

## Files Created

None.

---

## Code Quality Validation

- [x] `npm test` exits 0 — 1910 passed, 24 skipped
- [x] `npm run type-check` exits 0
- [ ] `npm run lint` exits 0 — **fails due to pre-existing uncommitted lint errors in unrelated files** (chat widget, dashboard, API files). The 3 files touched by this plan produce only 1 pre-existing warning in `search/page.tsx:428` (missing `t` dependency) and 0 errors.
- [x] `npm run build` exits 0
- [x] No unintended file modifications staged or committed
- [x] `git status --short` shows only the intended 3 modified files plus pre-existing uncommitted changes left untouched

---

## Value Statement Validation

- Mobile users tapping the filter button now land on the filter accordions (`/search?section=food`) instead of a full-screen map.
- The intentional mobile map view is preserved via `/search?section=food&view=map`.
- All three entry paths (home sliders, results edit button, empty-query submit, legacy `/suchen` redirect) are fixed simultaneously because the predicate is the single source of truth at the destination.
- No Supabase pin query is wasted when the filters UI is shown.

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|---------------------|-------------------|----------------|------------------|
| `SearchPageContent` map predicate (no `view`) | `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` — "mobile food without view param renders filters, not map" | Yes | Yes | `screen.findByText('suchen.accordions.woEmpty')` not found; `search-map` was rendered instead | Yes |
| `SearchPageContent` map predicate (`view=filters`) | `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` — "mobile food with view=filters renders filters, not map" | Yes | Yes | `search-map` unexpectedly in document | Yes |
| `SearchPageContent` map preservation (`view=map`) | `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` — "renders map on mobile food when view=map" | Updated existing | N/A (remained green) | N/A | Yes |
| `SearchPageContent` desktop guard | `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` — "does not render map on desktop even with view=map" | Yes | Yes | N/A — passed before and after | Yes |
| `SearchPageContent` pin fetch gate | `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` — "does not fetch pins when filters shown" | Yes | Yes | `search-map` unexpectedly in document; `mockSupabaseFrom` called with `locations` | Yes |
| `HomeSearchBar.handleSlidersClick` URL guard | `src/__tests__/features/search/HomeSearchBar.test.tsx` — "sliders button does not append a view=map param" | Yes | N/A — passed before and after (regression guard) | N/A | Yes |

**Red evidence (targeted run before implementation)**:

```
❯ src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx (6 tests | 3 failed)
  × [pre-fix FAILS / post-fix PASSES] mobile food without view param renders filters, not map
    → expected document not to contain element, found <div data-testid="search-map">Map</div>
  × [pre-fix FAILS / post-fix PASSES] mobile food with view=filters renders filters, not map
    → expected document not to contain element, found <div data-testid="search-map">Map</div>
  × [post-fix] does not fetch pins when filters shown (mobile food, no view)
    → expected document not to contain element, found <div data-testid="search-map">Map</div>
```

**Green evidence (targeted run after implementation)**:

```
✓ src/__tests__/features/search/HomeSearchBar.test.tsx (20 tests) 183ms
✓ src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx (6 tests) 121ms
Test Files  2 passed (2)
Tests  26 passed (26)
```

---

## Test Coverage

- **Unit/regression**: `plan208-mobile-search-map-switch.test.tsx` now covers all conditional branches:
  - B1: mobile + food + `view=map` → map rendered, pins fetched
  - B2: mobile + food + no view → filters rendered, pins not fetched
  - B3: mobile + food + `view=filters` → filters rendered
  - B6: desktop + food + `view=map` → filters rendered
- **Guard**: `HomeSearchBar.test.tsx` locks the filter-button URL to `/search?section=food`.
- **Related unaffected tests**: `SearchContextBar.test.tsx`, `src/app/(public)/search/page.test.tsx`, `plan212-near-me-viewport.test.tsx` all still pass.

---

## Test Execution Results

### Targeted run (before implementation)

```
Test Files  1 failed | 1 passed (2)
Tests  3 failed | 23 passed (26)
```

### Targeted run (after implementation)

```
Test Files  2 passed (2)
Tests  26 passed (26)
```

### Full suite

```
Test Files  233 passed | 2 skipped (235)
Tests  1910 passed | 24 skipped (1934)
```

### Static gates

| Gate | Result |
|------|--------|
| `npm test` | 0 |
| `npm run type-check` | 0 |
| `npm run build` | 0 |
| `npm run lint` (project-wide) | non-zero due to unrelated pre-existing errors |
| `npx eslint <3 changed files>` | 0 errors, 1 pre-existing warning |

| 2026-08-17 | DevOps | Document closed | Status: Committed |
---

## Outstanding Items

- `npm run lint` project-wide fails because of pre-existing uncommitted lint errors in files outside this plan's scope (chat widget, dashboard, API routes). The 3 files modified for Plan 216 contribute only one pre-existing warning and no errors.
- Analysis gaps G1/G2 (desktop repro) remain carried forward to QA/UAT per plan decision D6; no code path was changed for desktop-width behavior.

---

## Next Steps

- Hand off to the Code Reviewer / Architect for quality review.
- After review approval, DevOps can create/merge the PR from `fix/216-filter-button-redirect`.
