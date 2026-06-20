---
ID: 195
Origin: 195
UUID: b4e81c3f
Status: Active
---

# Implementation 195 — Single-Open Accordion for ProviderDetailSections

## Summary

Converted all `ExpandSection` instances to controlled mode so only one section can be open at a time. Halal Check is default-open on page load (since it's the primary/standard section).

Also moved Halal Check to be the first section, above Values & Amenities.

## Files Changed

- `src/features/providers/components/ProviderDetailSections.tsx`
  - Added `useState` import
  - Added `openSection` state (default `'halal'`)
  - Moved Halal Check `ExpandSection` to be the first section
  - Converted all 6 `ExpandSection` instances to controlled mode via `isOpen`/`onToggle`
  - Removed `defaultOpen` from Values & Amenities

- `src/__tests__/features/providers/ProviderDetailSections.test.tsx`
  - Removed explicit `fireEvent.click` on Halal Check (it's open by default)
  - Updated menu test to open Values & Amenities first (was closed)
  - Removed stale container-based assertion that assumed both sections rendered

## Section Order

1. Halal Check (`'halal'`) — default open
2. Values & Amenities (`'values'`)
3. Menu/Offers (`'menu-offers'`)
4. Opening Hours (`'opening-hours'`)
5. Locations (`'locations'`)
6. Nearby (`'nearby'`)

TrustBadgesSection remains outside the accordion (always visible).

## TDD Compliance

| Check | Result |
|-------|--------|
| type-check (tsc) | ✅ Passed |
| lint | ✅ No errors |
| test (ProviderDetailSections) | ✅ 12/12 passed |
