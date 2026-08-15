---
ID: 208
Origin: 208
UUID: e7a3f1b9
Status: Committed
---

# Implementation Doc — Plan 208: Mobile Search Map View

**Plan Reference**: `agent-output/planning/208-mobile-search-map.md`  
**Date**: 2026-07-10

## Changelog

| Date       | Handoff      | Request                                               | Summary                                       |
| ---------- | ------------ | ----------------------------------------------------- | --------------------------------------------- |
| 2026-07-10 | Code Review  | Address second-round REJECTED code review findings    | Fixed all 5 findings: pins data, tile URL, i18n (RootPageContent + search/page), regression tests, impl doc |

---

## Implementation Summary

Plan 208 adds a mobile map view to the `/search` page (food section) showing restaurant pins on a Leaflet map.

**Round 2 fixes** (this document) address all findings from the second REJECTED code review verdict:

1. **PRIMARY VALUE — Real pin data**: Replaced `<SearchMap pins={[]} />` with a live Supabase fetch that queries approved food providers with coordinates, wiring the result into `mapPins` state. The map now shows actual restaurant locations on mobile.
2. **TILE DEVIATION**: Switched from Stadia Maps (`tiles.stadiamaps.com`) to the plan-specified OSM DE tile server (`tile.openstreetmap.de`). Updated attribution to OSM-only.
3. **i18n RootPageContent**: Added `useLanguage` import + `const { t } = useLanguage()` to `RootPageContent.tsx`. Replaced hardcoded `'Switch to list view'` / `'Switch to map view'` / `'List'` / `'Map'` with `t('map.switchToList')`, `t('map.switchToMap')`, `t('map.listViewLabel')`, `t('map.mapViewLabel')`.
4. **i18n search/page.tsx**: Replaced hardcoded `aria-label="Angebote suchen"` with `t()` interpolation against the existing placeholder keys. Replaced hardcoded toast `"is coming soon"` + description with `t('sections.comingSoon', { section: label })` and `t('sections.comingSoonDescription')`.
5. **Translation files**: Added 4 new `map.*` keys + 2 new `sections.*` keys (`comingSoon`, `comingSoonDescription`) to all 6 locale files (en/de/ar/tr/ur/ps) in the **existing** `sections` object.
6. **Regression test (plan208)**: Updated Supabase mock to include `from()` chain (previously missing — would have crashed when real fetch was added). Updated SearchMap mock to capture `pins` prop via hoisted ref. Added 3rd test `[post-fix] passes provider pins to SearchMap when location data is returned` that verifies pins are non-empty when the DB returns location data.

---

## Milestones Completed

- [x] M0 — SearchMap tile URL changed to `tile.openstreetmap.de`
- [x] M1 — Real Supabase pin fetch wired to `<SearchMap pins={mapPins} />`
- [x] M2 — `RootPageContent.tsx` map/list toggle fully i18n'd
- [x] M3 — `search/page.tsx` aria-label + toast strings i18n'd
- [x] M4 — All 6 locale files updated with new keys
- [x] M5 — Regression test extended (Supabase mock + pin capture + new test)
- [x] M6 — Pre-QA gates passed (`npm run type-check`, `npm run lint` — 0 new errors)

---

## Files Modified

| Path | Changes | Lines Changed |
|------|---------|---------------|
| `src/features/search/components/SearchMap.tsx` | Changed tile URL from Stadia to OSM DE; updated attribution | ~3 |
| `src/components/shared/RootPageContent.tsx` | Added `useLanguage` import + `const { t }` init; replaced 3 hardcoded strings | ~5 |
| `src/app/(public)/search/page.tsx` | Added `ProviderMapPin` type import; added `mapPins` state + fetch effect (27 lines); changed `<SearchMap pins={[]}/>` → `<SearchMap pins={mapPins}/>`; fixed `aria-label`; fixed 2 toast strings | ~45 |
| `src/translations/en.ts` | Added `switchToList/Map/listViewLabel/mapViewLabel` to `map` section; added `comingSoon/comingSoonDescription` to existing `sections` object | ~6 |
| `src/translations/de.ts` | Same as en.ts with German values | ~6 |
| `src/translations/ar.ts` | Same as en.ts with Arabic values | ~6 |
| `src/translations/tr.ts` | Same as en.ts with Turkish values | ~6 |
| `src/translations/ur.ts` | Same as en.ts with Urdu values | ~6 |
| `src/translations/ps.ts` | Same as en.ts with Pashto values | ~6 |
| `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` | Added `vi.hoisted` for `capturedPins` + `mockSupabaseFrom`; updated SearchMap mock to capture pins; added `from()` chain to Supabase mock; added 3rd test; added `afterEach(cleanup)` | ~60 |

## Files Created

| Path | Purpose |
|------|---------|
| `agent-output/implementation/208-mobile-search-map-implementation.md` | This document |

---

## Code Quality Validation

- [x] `npm run type-check` — exits 0 (0 errors)
- [x] `npm run lint` — 0 new errors in modified files (53 pre-existing errors in unrelated files unchanged)
- [x] `npx vitest run src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx` — 3/3 pass
- [x] `npx vitest run src/__tests__/features/chat/ChatFloatingWidget.drag.test.tsx` — 4/4 pass

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|---------------------|-------------------|----------------|------------------|
| `mapPins` fetch effect + `<SearchMap pins={mapPins}/>` | `plan208-mobile-search-map-switch.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Pre-fix: `supabase.from is not a function` (mock gap); pins always `[]` — `capturedPins.current.length > 0` assertion fails | ✅ Yes |
| Map/list toggle i18n (`t('map.switchToList')` etc.) | N/A — i18n key substitution, no new API surface | ⚠️ Post-fix (i18n fix, no new function) | ✅ Yes | Hard-coded strings visible in DOM; keys missing from locale files | ✅ Yes |
| `comingSoon`/`comingSoonDescription` toast keys | N/A — template interpolation via existing `t()` | ⚠️ Post-fix (i18n fix) | ✅ Yes | Hard-coded English strings rendered regardless of locale | ✅ Yes |

> **Bugfix regression exception applies**: All rows are fixes to existing behavior (no new API surface). Regression tests exercise the exact pre-fix failure path.

---

## Multi-Plan State Audit

`Multi-Plan State Audit: N/A` — no prior-plan `useEffect` mutations in scope for the new `mapPins` effect. The effect is additive and runs independently of existing state.

## Search/Filter Client-Interaction Trace

`Search/Filter Client-Interaction Trace: N/A` — the `mapPins` fetch effect does not modify URL params or use a form submit handler. It reads `isMobile` and `selectedSection` as inputs only.

## Cross-Layer Integration Self-Check

- New `useEffect` in `search/page.tsx`: calls `supabase.from('locations')...` → passes pins to `<SearchMap>` → Leaflet renders markers. End-to-end traced. ✅

---

## Value Statement Validation

**Original value statement**: Mobile users searching the Food section see a map of nearby approved restaurants instead of an empty map or accordion.

**Implementation delivers**:
- Map is rendered on mobile food section ✅ (Plan 208 M0)
- Map shows real restaurant pins from Supabase ✅ (Round 2 fix — primary value)
- Map uses the OSM DE tile server as specified ✅
- All visible strings are translated via `t()` ✅

---

## Test Execution Results

```
src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx
  ✓ renders map on mobile for food section (24ms)
  ✓ does not render map on desktop (74ms)
  ✓ [post-fix] passes provider pins to SearchMap when location data is returned (6ms)

src/__tests__/features/chat/ChatFloatingWidget.drag.test.tsx
  ✓ [tap] pointerDown + pointerUp with no move → calls router.push on mobile (69ms)
  ✓ [keyboard] click without prior pointer events → calls router.push on mobile (10ms)
  ✓ [drag] pointerMove beyond threshold → button moves to new position, no navigation (14ms)
  ✓ [bounds] dragging beyond viewport clamps x and y to [0, innerDimension - BTN_SIZE] (6ms)

Test Files: 2 passed (2)
Tests: 7 passed (7)
```

---

## Outstanding Items

None. All code review findings resolved.

## Next Steps

→ Code Reviewer to re-review and issue new verdict.  
→ On APPROVED: QA to validate on mobile device/emulator.  
→ On QA pass: UAT on uat.ummahflow.com.
