---
ID: 194
Origin: 194
UUID: 29f9feea
Status: Active
---

# Plan 194 — Reorder Sections in ProviderDetailSections

## Summary

Move the "Halal Check" (`ProofTier`) section to appear first (above "Values & Amenities") in `ProviderDetailSections.tsx`. Pure JSX reorder — no logic, state, or layout changes.

## Current Order (lines ~213–312)

1. **Values & Amenities** (line 214, `defaultOpen`)
2. **Menu/Offers** (line 231)
3. **Opening Hours** (line 257)
4. **Halal Check / ProofTier** (line 261)
5. **Locations** (line 274, conditional)
6. **TrustBadgesSection** (line 292)
7. **Nearby** (line 294)

## Desired Order

1. **Halal Check / ProofTier** (moved here, first section)
2. **Values & Amenities** (`defaultOpen` stays here)
3. **Menu/Offers**
4. **Opening Hours**
5. **Locations** (conditional)
6. **TrustBadgesSection**
7. **Nearby**

## Edit Instructions

Two cuts + two pastes in `src/features/providers/components/ProviderDetailSections.tsx`:

### Step 1: Remove Halal Check block

**Cut lines 260–272** (the `ExpandSection` for `proofTier.sectionTitle` and its content):

```
      <ExpandSection title={t('providerDetail.proofTier.sectionTitle')}>
        <div className="space-y-3 pt-3">
          <ProofTierCard
            hasCertificate={provider.has_certificate}
            listingType={provider.listing_type}
            noAlcohol={provider.no_alcohol}
            noGambling={provider.no_gambling}
            noPork={provider.no_pork}
            verificationMethod={provider.verification_method}
          />
        </div>
      </ExpandSection>
```

### Step 2: Paste after line 212 (inside the returned flex container, before Values & Amenities)

Insert the cut block **after line 212** (`<div className="flex flex-col gap-8 self-stretch">`) and **before line 214** (the Values & Amenities `ExpandSection`).

### Step 3: Verify final structure

The returned JSX should be:

```tsx
  return (
    <div className="flex flex-col gap-8 self-stretch">
      <ExpandSection title={t('providerDetail.proofTier.sectionTitle')}>
        <div className="space-y-3 pt-3">
          <ProofTierCard ... />
        </div>
      </ExpandSection>

      <ExpandSection defaultOpen title={t('providerDetail.sections.valuesAmenities')}>
        ...
      </ExpandSection>
      ...
    </div>
  );
```

## `defaultOpen` Recommendation

**Keep `defaultOpen` on Values & Amenities.** There's no UX requirement for Halal Check to be expanded by default. Values & Amenities is the broader intro section and should remain the default-open accordion.

## Test Guidance

No test changes needed. All tests in `src/__tests__/features/providers/ProviderDetailSections.test.tsx`:

- Find elements by accessible name (`getByRole('button', { name: ... })`) or text content — not by DOM position
- Do not assert on section order, DOM index, or `firstChild` at the section level
- The nearby and menu tests that use positional selectors (`closest('div')`, `firstElementChild`) check within individual items, not across sections

All existing tests will pass without modification.

## Branch Name

`refactor/194-halal-check-on-top`
