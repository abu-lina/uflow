---
ID: 183
Origin: 183
UUID: a8f3d2c4
Status: Active
---

# Analysis: Saved Page Images Show Generic Placeholder Instead of Category-Specific Placeholder Images

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Orchestrator | Initial analysis |

## Value Statement & Objective

The user created custom category-specific placeholder images (stored in `categories.category_images`). On the main provider listing pages (via `ProviderCard`), these images correctly show as fallbacks when a provider has no uploaded images. However, on the `/saved` page, cards only show the generic `/images/placeholder.jpg` regardless of whether `category_images` exist.

**Objective**: Determine why category placeholder images are missing on the saved page and how to fix it consistently with the existing pattern used by ProviderCard.

## Context

- **Page**: `/saved` (`src/app/(public)/saved/page.tsx`) — lists a user's bookmarked providers
- **Card component**: `SelectableCard` (`src/components/shared/SelectableCard.tsx`) — receives `imageUrl` as a prop, renders it with `<Image>`
- **Data source**: `getAllBookmarkedItems()` from `src/services/providers.ts`
- **Comparison**: `ProviderCard` (`src/components/providers/ProviderCard.tsx`) — handles fallback correctly

## Methodology

1. Code inspection of the saved page's data fetching and image resolution
2. Comparison with ProviderCard's fallback chain
3. Type definition tracing through SearchResult → Provider → category relation
4. Verification of Supabase query scope in both client and server data functions

## Findings

### Finding 1: Supabase query does not fetch `category_images` (Proven, Level 1)

**File**: `src/services/providers.ts`, line 988

```typescript
.select('*, category:categories(name_de, name_en), locations(*)')
```

The query selects `name_de` and `name_en` from categories but omits `category_images`. Even when the fallback logic is added, the data won't be available.

**Same issue exists in server version**: `src/services/providers.server.ts`, line 160:

```typescript
.select('provider_id, providers(*, category:categories(name_de, name_en), locations(*))')
```

### Finding 2: `getFirstImageUrl` doesn't use category fallback (Proven, Level 1)

**File**: `src/app/(public)/saved/page.tsx`, line 558:

```typescript
const imageUrl = getFirstImageUrl(provider.images);
```

**File**: `src/utils/imageUtils.ts`, `getFirstImageUrl()` function:

```typescript
export function getFirstImageUrl(providerImages: ProviderImages): string {
  if (!providerImages) return PLACEHOLDER_IMAGE;
  // ... parses provider images only ...
  if (imagesData.urls && imagesData.urls.length > 0) {
    return imagesData.urls[0];
  }
  return PLACEHOLDER_IMAGE;
}
```

This function only checks the provider's own images. It never considers `category_images` as a fallback source.

### Finding 3: ProviderCard uses a complete fallback chain (Proven, Level 1)

**File**: `src/components/providers/ProviderCard.tsx`, lines 304-309:

```typescript
const categoryUrls = parseCategoryImages(category?.category_images ?? null);
const fallbackStockImageUrl =
  categoryUrls.length > 0
    ? categoryUrls[hashId(`${category_id ?? ''}-${provider_id}`) % categoryUrls.length]
    : null;
const displayImageUrl = providerImageUrl || fallbackStockImageUrl || PLACEHOLDER_IMAGE;
```

ProviderCard includes a deterministic hash-based selection from category images. The saved page has no equivalent logic.

### Finding 4: `useImageFallback` hook exists but is not used by SelectableCard (Proven, Level 2)

**File**: `src/hooks/useImageFallback.ts`

A dedicated hook for fallback image resolution exists and accepts `category.category_images`, but `SelectableCard` doesn't use it — it just renders whatever `imageUrl` it receives as a prop.

### Finding 5: Helper functions already exist (Proven, Level 1)

In `src/utils/imageUtils.ts`:
- `getAllTrustedImageUrlsWithFallback(providerImages, categoryImages)` — returns URLs with category fallback
- `parseCategoryImages(categoryImages)` — parses category images from various formats
- `hashId(id)` — deterministic hash for stable selection

These can be reused rather than reimplementing the fallback logic.

## Gap Tracking

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Is `SelectableCard` used elsewhere with the same issue? | Time | Check other callers of SelectableCard | Analyst |
| 2 | Does the Profile page's saved tab have the same bug? | Time | Check src/app/(public)/profile/ProfileContent.tsx | Analyst |

## Analysis Recommendations

### Fix 1: Add `category_images` to the Supabase query

**`src/services/providers.ts`** line 988:
- Change: `'*, category:categories(name_de, name_en), locations(*)'`
- To: `'*, category:categories(name_de, name_en, category_images), locations(*)'`

**`src/services/providers.server.ts`** line 160:
- Change: `.select('provider_id, providers(*, category:categories(name_de, name_en), locations(*))')`
- To: `.select('provider_id, providers(*, category:categories(name_de, name_en, category_images), locations(*))')`

### Fix 2: Update saved page to use category image fallback

In `src/app/(public)/saved/page.tsx`, replace:

```typescript
const imageUrl = getFirstImageUrl(provider.images);
```

With:

```typescript
const imageUrl = getFirstImageUrl(provider.images) === PLACEHOLDER_IMAGE && provider.category?.category_images
  ? (() => {
      const urls = parseCategoryImages(provider.category?.category_images);
      if (urls.length > 0) {
        return urls[hashId(`${provider.category_id ?? ''}-${provider.id}`) % urls.length];
      }
      return PLACEHOLDER_IMAGE;
    })()
  : getFirstImageUrl(provider.images);
```

Or simpler — use the existing `getAllTrustedImageUrlsWithFallback` and take the first result (aligning with the pattern in `ProviderDetailPage.tsx`):

```typescript
const urls = getAllTrustedImageUrlsWithFallback(provider.images, provider.category?.category_images);
const imageUrl = urls.length > 0 ? urls[0] : PLACEHOLDER_IMAGE;
```

### Fix 3 (if applicable): Check Profile page saved tab

Profile page `src/app/(public)/profile/ProfileContent.tsx` may have the same issue at lines 831-832 where saved providers are rendered.

## Open Questions

1. Is the inconsistency intentional? SelectableCard is a generic shared component, while ProviderCard is provider-specific.
2. Should SelectableCard itself handle fallback logic, or should the page pass the resolved URL? Current architecture passes URL as prop, so the resolution should happen at the page level.

## Next Immediate Steps

1. Apply Fix 1 (query change) — required before Fix 2 can work
2. Apply Fix 2 (fallback logic in saved page)
3. Verify the fix on UAT: https://uat.ummahflow.com/saved
4. Write/update tests to cover the fallback behavior
