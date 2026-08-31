---
ID: 195
Origin: 195
UUID: a7b93d2c
Status: Active
---

# Plan 195 — Single-Open Accordion for ProviderDetailSections

## Summary

Convert all `ExpandSection` instances in `ProviderDetailSections.tsx` to controlled mode so only one section can be open at a time (accordion behavior). Halal Check is default-open on page load and placed as the first section.

## Changes

### File: `src/features/providers/components/ProviderDetailSections.tsx`

1. **Add state**: `const [openSection, setOpenSection] = useState<string | null>('halal');`
2. **Reorder**: Move Halal Check `ExpandSection` to be the first section
3. **Convert all 6 ExpandSections to controlled mode** with `isOpen`/`onToggle`
4. **Remove `defaultOpen`** from Values & Amenities
5. **TrustBadgesSection** stays outside the accordion (always visible)

## Section Order

1. Halal Check (`'halal'`) — default open
2. Values & Amenities (`'values'`)
3. Menu/Offers (`'menu-offers'`)
4. Opening Hours (`'opening-hours'`)
5. Locations (`'locations'`)
6. Nearby (`'nearby'`)

## Branch

`refactor/195-accordion-behavior`
