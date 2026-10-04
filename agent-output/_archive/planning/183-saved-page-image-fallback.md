---
ID: 183
Origin: 183
UUID: b4e8f1a7
Status: Active
---

# Plan: Fix Saved Page Card Images to Show Category-Specific Placeholders

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Orchestrator | Initial plan |

## Value Statement

**As a** user who bookmarks providers  
**I want** the saved items page to show category-specific placeholder images (not the generic one) when a provider has no uploaded images  
**So that** the visual experience is consistent with the main provider listing pages, and the custom placeholder images I created for each category are actually used.

## Scope

### In Scope
- Fix Supabase queries in both client and server `getAllBookmarkedItems` to fetch `category_images`
- Fix the saved page to use category images as fallback when provider has no images
- Use existing helper functions (`parseCategoryImages`, `hashId`, `getAllTrustedImageUrlsWithFallback`) to keep code consistent

### Out of Scope
- Refactoring SelectableCard to handle fallback internally (it's a generic component)
- Fixing other places that might have the same issue (profile page saved tab — captured as follow-up)
- Changing how ProviderCard works

## Deliverables

1. **Updated Supabase query** — client-side `getAllBookmarkedItems` includes `category_images`
2. **Updated Supabase query** — server-side `getAllBookmarkedItems` includes `category_images`
3. **Updated image resolution** in saved page — uses fallback chain including category images
4. **Tests** — verify the fallback behavior

## Implementation Steps

### Step 1: Fix client-side query (src/services/providers.ts)

**File**: `src/services/providers.ts`  
**Line**: ~988  
**Change**: Add `category_images` to the category relation select

```typescript
// Before:
.select('*, category:categories(name_de, name_en), locations(*)')

// After:
.select('*, category:categories(name_de, name_en, category_images), locations(*)')
```

### Step 2: Fix server-side query (src/services/providers.server.ts)

**File**: `src/services/providers.server.ts`  
**Line**: ~160  
**Change**: Add `category_images` to the category relation select

```typescript
// Before:
.select('provider_id, providers(*, category:categories(name_de, name_en), locations(*))')

// After:
.select('provider_id, providers(*, category:categories(name_de, name_en, category_images), locations(*))')
```

### Step 3: Fix fallback logic in saved page (src/app/(public)/saved/page.tsx)

**File**: `src/app/(public)/saved/page.tsx`  
**Line**: ~558  
**Change**: Replace simple `getFirstImageUrl` with fallback chain

Current:
```typescript
const imageUrl = getFirstImageUrl(provider.images);
```

Replace with:
```typescript
const imageUrl = (() => {
  const urls = getAllTrustedImageUrlsWithFallback(
    provider.images,
    provider.category?.category_images
  );
  return urls.length > 0 ? urls[0] : PLACEHOLDER_IMAGE;
})();
```

**Also update imports**: Add `getAllTrustedImageUrlsWithFallback, PLACEHOLDER_IMAGE` to the import from `@/utils/imageUtils` (currently only imports `getFirstImageUrl, formatProviderAddress`).

### Step 4: Write/update tests

Add or update tests for:
- `getAllTrustedImageUrlsWithFallback` returning category images when provider images are null
- Saved page rendering with category fallback

## Dependencies

- None — all helper functions (`getAllTrustedImageUrlsWithFallback`, `parseCategoryImages`, `hashId`, `PLACEHOLDER_IMAGE`) already exist in `src/utils/imageUtils.ts`

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Additional API data increases response size | Medium | Low | `category_images` is a small JSONB field, negligible overhead |
| `category_images` might be null in some records | High | Low | `getAllTrustedImageUrlsWithFallback` already handles null/undefined gracefully |
| Breaking other usages of `getAllBookmarkedItems` | Low | High | TypeScript will catch any type mismatches; the SearchResult type already has `category_images?: Record<string, unknown>` in its category type |
| Profile page saved tab has same issue | Medium | Medium | Capture as follow-up task; implementation uses similar pattern |

## Test Considerations

### TDD Compliance
- Test that `getAllTrustedImageUrlsWithFallback` returns category images when provider images are null
- Test that `getAllTrustedImageUrlsWithFallback` still returns provider images when they exist
- Test that saved page renders correctly with and without category fallback images

### Regression Tests
- Ensure existing bookmark functionality still works
- Ensure saved page still renders empty states correctly

## Semver

**Bump**: Patch (0.0.x) — bugfix with no breaking changes

## Acceptance Criteria

1. **Given** a provider with no uploaded images but with a category that has `category_images`  
   **When** viewing the saved page  
   **Then** the card shows one of the category's placeholder images instead of the generic placeholder

2. **Given** a provider with uploaded images  
   **When** viewing the saved page  
   **Then** the card shows the provider's own image (no regression)

3. **Given** a provider with no uploaded images and no category images  
   **When** viewing the saved page  
   **Then** the card shows the generic placeholder (no regression)
