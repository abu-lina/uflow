---
ID: 149
Origin: 149
UUID: a1b2c3d4
Status: Active
---

# Analysis: Provider Edit Form - Store-specific fixes

## Changelog
| Date | Agent | Description |
|------|-------|-------------|
| 2026-06-06 | Analyst | Initial analysis of 4 issues with provider edit form for stores |

## Value Statement & Objective
Fix the admin provider edit form to properly support store-type providers (currently still labeled as "Business" in the listing_type dropdown). The form currently has bugs and missing features that make editing store providers incomplete.

## Context
The admin edit form at `/dashboard/providers/[id]/edit` has 4 issues:

1. **Listing_type field position + edits lost on category navigation** — The listing_type select (Section/Bereich) is between Category and Review Status. It should be directly under Description. When clicking Category to select a category, all unsaved inline edits are lost.

2. **Category filtering** — The category selection page doesn't filter by listing_type, showing all categories regardless of section.

3. **Review status not persisting** — The review_status select always shows "Pending" even if the provider has a different stored value.

4. **Store-specific fields** — Menu is food-only (good), but Delivery Links, Halal Check, and Values page don't adapt for stores. Stores need: Offers instead of Menu, Order Links instead of Delivery Links, listing_type-aware Halal check, and conditional food/store sections in Values.

## Methodology
Code inspection of the following files:
- `src/components/providers/ProviderEditForm.tsx` — Main edit form
- `src/app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx` — Category sub-page
- `src/app/(dashboard)/dashboard/providers/[id]/edit/values/page.tsx` — Values sub-page
- `src/app/(dashboard)/dashboard/providers/[id]/edit/halal/page.tsx` — Halal sub-page
- `src/services/categories.ts` — Category service with section-scoped filtering
- `src/services/admin/providerEdit.ts` — Admin edit service
- `src/types/adminProvider.ts` — StoreProviderExtension only has no_gambling

## Findings

### Finding 1: Listing_type field position (Proven)
Lines 516-551 in ProviderEditForm.tsx place the listing_type select between Category and Review Status. It should be right after Description (line 496).

### Finding 2: Edits lost on sub-page navigation (Proven)
`syncFromLocalStorage` (lines 177-244) only restores sub-page fields (category, social, images, menu, delivery, hours, halal, values). Inline fields (providerName, providerDescription, street, etc.) are NOT saved to localStorage. When navigating to category sub-page, the component unmounts and inline state is lost.

### Finding 3: Category page doesn't filter by listing_type (Proven)
Line 28 in `edit/category/page.tsx`: `getProviderCategories()` is called without arguments, returning ALL categories. Should filter by the provider's `listing_type`.

### Finding 4: Review status initialized as undefined (Proven)
Line 165: `reviewStatus: undefined` instead of reading `provider.review_status`. The Provider type DOES include `review_status?`.

### Finding 5: Delivery Links not conditional (Proven)
Lines 909-923: Delivery Links is always shown. Should be renamed to "Order Links" for stores, and ideally be conditional on listing_type.

### Finding 6: Values page shows food/store groups unconditionally (Proven)
Lines 133-145: Food-specific group (noAlcohol, noPork) and Store-specific group (noGambling) are always shown regardless of listing_type.

### Finding 7: Halal page only reads food_providers (Proven)
Line 69: Only reads `json.data?.food_providers`, not `store_providers`. For stores, halal data comes from `store_providers`.

## Remaining Gaps
None — all issues identified.

## Analysis Recommendations
Proceed to planning with the following scope:
1. Reorder listing_type field to after Description
2. Save inline fields to localStorage before sub-page navigation
3. Filter categories by listing_type on the category page
4. Fix review_status initialization from provider data
5. Make Delivery Links conditional / rename for stores
6. Make Values page groups conditional on listing_type
7. Fix Halal page to read store_providers for store-type providers
