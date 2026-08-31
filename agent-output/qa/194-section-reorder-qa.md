---
ID: 194
Origin: 194
UUID: f3d48832
Status: Active
---

# QA Report: Section Reorder (Plan 194)

## What was checked

1. Section order in `src/features/providers/components/ProviderDetailSections.tsx`
2. Test suite for `ProviderDetailSections`
3. Git diff for unintended changes

## Section order confirmed

| # | Section | Line | Notes |
|---|---------|------|-------|
| 1 | Halal Check (Proof Tier) | 214 | `ExpandSection` with proofTier title |
| 2 | Values & Amenities | 227 | `ExpandSection` with `defaultOpen` |
| 3 | Menu/Offers | 244 | Conditional on listing_type |
| 4 | Opening Hours | 270 | `ExpandSection` with openingHours title |
| 5 | Locations | 274-290 | Conditional on locations length |
| 6 | Trust Badges | 292 | `TrustBadgesSection` component |
| 7 | Nearby | 294 | `ExpandSection` with nearby title |

Order: Halal Check → Values & Amenities (defaultOpen) → Menu/Offers → Opening Hours → Locations → TrustBadges → Nearby — **correct**.

## Test results

- Test file: `src/__tests__/features/providers/ProviderDetailSections.test.tsx`
- **12 tests passed**, 0 failed (Vitest 3.2.6, 1.94s)

## Git diff summary

The diff for `ProviderDetailSections.tsx` shows exactly one change:
- Proof Tier section moved from after Opening Hours (old) to before Values & Amenities (new)
- **No other lines in this file were modified**

Other files in the diff belong to unrelated Plans (192, 193) — not part of this reorder.

## Verdict: PASSED
