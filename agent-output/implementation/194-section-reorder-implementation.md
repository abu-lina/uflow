---
ID: 194
Origin: 194
UUID: d0f41a7b
Status: Active
---

# Implementation 194 — Section Reorder: Halal Check on Top

## Summary

Moved the "Halal Check" (`ProofTier`) `ExpandSection` to be the first section in `ProviderDetailSections.tsx`, above "Values & Amenities". Pure JSX reorder — no logic, state, or layout changes.

## Files Changed

- `src/features/providers/components/ProviderDetailSections.tsx` — Cut `ProofTier` `ExpandSection` block (previously lines 261-272) and pasted it immediately after the opening `<div className="flex flex-col gap-8 self-stretch">` (line 213). Removed the duplicate at the original location.

## TDD Compliance

| Check | Result |
|-------|--------|
| type-check | ✅ Passed |
| lint | ✅ No new errors |
| test | ✅ 12/12 passed |

## Before/After Section Order

**Before (lines 213-312):**
1. Values & Amenities (`defaultOpen`)
2. Menu/Offers
3. Opening Hours
4. Halal Check / ProofTier
5. Locations (conditional)
6. TrustBadgesSection
7. Nearby

**After:**
1. Halal Check / ProofTier
2. Values & Amenities (`defaultOpen` remains here)
3. Menu/Offers
4. Opening Hours
5. Locations (conditional)
6. TrustBadgesSection
7. Nearby
