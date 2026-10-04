---
ID: 154
Origin: 154
UUID: f7d2e4b1
Status: Active
---

# Plan: Remove Deprecated "Wir bieten / Wir suchen" Sections

## Context

The combined "Wir bieten" (weOffer) / "Wir suchen" (weAreLookingFor) accordion section is deprecated. It appears in 4 locations across the codebase. The replacement UI is in `ProviderDetailSections.tsx`, which already has Menu (for food) and Angebote (for store) sections.

## Files to Modify

1. **`src/components/providers/ProviderDetailPage.tsx`** — 2 occurrences:
   - Mobile section (lines ~542–618): `<div className="mx-6 mt-4 rounded-2xl bg-white shadow-sm">` — remove entire block
   - Desktop section (lines ~985–1061): `<div className="rounded-2xl bg-white shadow-sm">` — remove entire block

2. **`src/components/providers/ProviderDetailModal.tsx`** — 1 occurrence (lines ~695–767):
   - Offers & Needs section inside the outline card — remove entire block

3. **`src/components/community-services/CommunityServiceDetailModal.tsx`** — 1 occurrence (lines ~521–597):
   - Offers & Needs section — remove entire block

4. **`src/translations/de.ts`** — Remove unused keys:
   - `weOffer`: "Wir bieten"
   - `weNeed`: "Wir brauchen"
   - `weAreLookingFor`: "Wir suchen"

## What to Preserve

- **Menu section** in `ProviderDetailSections.tsx` (line 231): `<ExpandSection title={t(provider.listing_type === 'store' ? 'providerDetail.sections.offers' : 'providerDetail.sections.menu')}>`
- **Angebote section** in `ProviderDetailSections.tsx` — same component, different label for store listings

## Changes Summary

### ProviderDetailPage.tsx (mobile)
Remove the `{/* Combined Offers & Needs Section */}` block including its wrapping conditional `{((provider.offers && provider.offers.length > 0) || ...) && (...)}`.

### ProviderDetailPage.tsx (desktop)
Remove the `{/* Combined Offers & Needs Section */}` block similarly — the second occurrence inside the desktop right column.

### ProviderDetailModal.tsx
Remove the `{/* Offers Section */}` + divider + `{/* Needs Section */}` block from within the outline card. This includes the wrapping conditionals for offers and needs.

### CommunityServiceDetailModal.tsx
Remove the `{/* Offers & Needs Section */}` block the same way.

### Translation keys
After component changes are done, verify `weOffer`, `weNeed`, and `weAreLookingFor` are no longer referenced in any `.tsx` or `.ts` files, then remove from `de.ts`.

## Verification

1. `npm run type-check` — must pass
2. `npx tsc --noEmit` — must pass
3. Related tests run: `npx vitest run src/components/providers/ src/components/community-services/` — must pass
4. Search for remaining references to `weOffer`, `weNeed`, `weAreLookingFor` in `.tsx`/`.ts` files — must be 0
