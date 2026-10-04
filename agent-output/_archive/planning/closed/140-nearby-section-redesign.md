---
ID: 140
Origin: 140
UUID: b8e2f4a1
Status: Released
---

# Plan: Nearby Section Redesign — Use DetailListItem

## Changelog
| 2026-06-04 | DevOps | Document closed | Status: Released |

## Summary
Replace plain `<p>` tags in the "In der Nähe" (Nearby) section with `DetailListItem` components (matching the Menu section's visual pattern), using the `MapPin` icon.

## Tasks

### Task 1: Add `MapPin` import
- **File**: `src/features/providers/components/ProviderDetailSections.tsx`
- **Action**: Add `MapPin` to the existing `lucide-react` import (line 4-11)
- **Change**:
  ```tsx
  // Before (line 4-11):
  import {
    CircleParking,
    HandHeart,
    HeartHandshake,
    Moon,
    UtensilsCrossed,
    Users,
  } from 'lucide-react';

  // After:
  import {
    CircleParking,
    HandHeart,
    HeartHandshake,
    MapPin,
    Moon,
    UtensilsCrossed,
    Users,
  } from 'lucide-react';
  ```

### Task 2: Replace nearby item rendering with DetailListItem
- **File**: `src/features/providers/components/ProviderDetailSections.tsx`
- **Action**: Replace lines 235-239 (`<p>` tag loop) with `DetailListItem` using `MapPin` icon
- **Change**:
  ```tsx
  // Before (lines 235-239):
            nearbyProviders.map((nearby) => (
              <p key={nearby.provider_id} className="text-sm text-content-heading">
                {nearby.provider_name}
              </p>
            ))

  // After:
            nearbyProviders.map((nearby) => (
              <DetailListItem
                key={nearby.provider_id}
                icon={<MapPin aria-hidden="true" className="h-6 w-6" />}
                label={nearby.provider_name}
              />
            ))
  ```

## Files Modified
- `src/features/providers/components/ProviderDetailSections.tsx` (only file)

## New Files
None.

## Dependencies
None — all changes are isolated to one file.

## Verification
1. `npm run type-check` — no type errors
2. `npm run lint:check` — no lint errors
3. `npm test` — all 8 existing tests pass (they mock `data: []`, so the nearby data branch is never exercised)

## TDD Compliance Note
This is a pure design change. No new tests are needed — existing tests cover the nearby section loading and empty states. Implementation order: change component → run tests → confirm pass.
