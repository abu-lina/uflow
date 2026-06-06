---
ID: 149
Origin: 149
UUID: b2c3d4e5
Status: Active
---

# Plan: Provider Edit Form - Store-specific fixes

## Changelog
| Date | Agent | Description |
|------|-------|-------------|
| 2026-06-06 | Planner | Created implementation plan for 4 issues |

## Value Statement
Make the admin provider edit form correctly support store-type providers by fixing data loss during sub-page navigation, filtering categories by section, fixing review_status persistence, and adapting form fields for stores vs food providers.

## Implementation Steps

### Milestone 1: Fix inline field persistence + reorder listing_type
**Files**: `src/components/providers/ProviderEditForm.tsx`

**1a. Reorder listing_type and review_status fields**
- Move the listing_type `<select>` block (lines 516-551) from between Category and Review Status to right after the Description `<textarea>` (after line 496)
- Move the Review Status `<select>` block (lines 553-574) to right after the listing_type block
- Both remain inside the `{expandedSections.basics && (...)}` block

**1b. Add inline field persistence to localStorage**
- Create a new function `saveInlineFieldsToLocalStorage` that saves providerName, providerDescription, listingType, street, zipCode, city, country, isOnlineBusiness, showAddress, website, instagram, email, phone to `{prefix}edit_inline_{pid}` key in localStorage
- Call it before every `router.push()` to sub-pages (category, images, social, menu, halal, delivery, hours, values, enrichment)
- In `syncFromLocalStorage`, add reading of `{prefix}edit_inline_{pid}` to restore these fields

**Acceptance**: 
- [ ] Listing_type select appears directly under Description
- [ ] Review Status select appears directly under listing_type
- [ ] Editing name/description, then clicking Category, selecting a category, and navigating back preserves the inline edits

### Milestone 2: Filter categories by listing_type
**Files**: `src/app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx`

- Before loading categories, fetch the provider's `listing_type` from localStorage (key: `admin_edit_inline_{id}`) or from the admin API
- Pass the `listingType` to `getProviderCategories(listingType)` to scope the results
- The `getProviderCategories` function in `src/services/categories.ts` already supports section-scoped filtering

**Acceptance**:
- [ ] When editing a food provider, only food-related categories are shown
- [ ] When editing a store provider, only store/business categories are shown

### Milestone 3: Fix review_status initialization
**Files**: `src/components/providers/ProviderEditForm.tsx`

- Change line 165 from `reviewStatus: undefined` to `reviewStatus: provider.review_status || 'pending'`
- The Provider type already has `review_status?` field

**Acceptance**:
- [ ] The Review Status dropdown shows the provider's stored value on initial load
- [ ] Existing providers with no review_status default to "Pending"

### Milestone 4: Adapt fields for stores vs food
**Files**: 
- `src/components/providers/ProviderEditForm.tsx`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/values/page.tsx`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/halal/page.tsx`

**4a. ProviderEditForm.tsx — Conditional Provider Details section**
- "Menu" button: already conditional on `listingType === 'food'` ✅
- Add "Offers" button for stores: shown when `listingType === 'store'`, navigates to `${editBaseUrl}/offers`
- "Delivery Links": rename display label. Show "Delivery Links" for food, "Order Links" for stores
- Keep Halal Check always available but label it differently based on listing_type
- Keep Opening Hours and Values always available

**4b. Values page — Conditional sections**
- Fetch provider listing_type from localStorage or API
- Show "Food-specific" group (noAlcohol, noPork) only when listing_type === 'food'
- Show "Store-specific" group (noGambling) only when listing_type === 'store'

**4c. Halal page — Read store_providers**
- If `json.data?.food_providers` is null/undefined, fall back to `json.data?.store_providers`
- Store providers only have verification_method, has_certificate, certificate_url (no no_alcohol/no_pork)

**Acceptance**:
- [ ] Food providers see Menu + Delivery Links + Halal Check
- [ ] Store providers see Offers + Order Links + Halal Check (without food-specific attestations)
- [ ] Values page hides food/store-specific groups based on listing_type
- [ ] Halal page reads from store_providers for store-type providers

## Risk Assessment
- Low: Translations for "Offers" and "Order Links" may need adding if not already present
- Low: The Offers sub-page doesn't exist for admin context yet — will need a basic admin offers page if we want to link to it
- Medium: localStorage key changes need to be backward compatible
- Low: Existing tests (ProviderEditForm.regression.test.tsx) still pass after changes
