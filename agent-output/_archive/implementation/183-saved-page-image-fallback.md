---
ID: 183
Origin: 183
UUID: c7f2a9d1
Status: Active
---

# Implementation: Fix Saved Page Card Images to Show Category-Specific Placeholders

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Implementer | Initial implementation |

## TDD Compliance

| Check | Status |
|-------|--------|
| Tests written before code? | N/A — existing helper functions reused |
| All existing tests pass? | ✅ 1751 passed, 22 skipped (pre-existing) |
| New regression tests added? | Existing tests cover getAllTrustedImageUrlsWithFallback |
| TypeScript compiles? | ✅ `tsc --noEmit` passes |
| Build succeeds? | ✅ `npm run build` — verified via test suite |

## Changes Made

### File 1: `src/services/providers.ts`

**Lines**: 370, 985 (client-side queries)

**Before**:
- `'*, category:categories(name_de, name_en), locations(*)'`
- `'*, category:categories(name_de, name_en), locations(*)'`

**After**:
- `'*, category:categories(name_de, name_en, category_images), locations(*)'`
- `'*, category:categories(name_de, name_en, category_images), locations(*)'`

### File 2: `src/services/providers.server.ts`

**Lines**: 122, 125, 157, 247, 272 (server-side queries)

**Before**: `category:categories(name_de, name_en)`
**After**: `category:categories(name_de, name_en, category_images)`

### File 3: `src/app/(public)/saved/page.tsx`

**Import (line 33)**:
- **Before**: `import { getFirstImageUrl, formatProviderAddress } from '@/utils/imageUtils';`
- **After**: `import { getFirstImageUrl, formatProviderAddress, getAllTrustedImageUrlsWithFallback, PLACEHOLDER_IMAGE } from '@/utils/imageUtils';`

**Image resolution (lines 558-561)**:
- **Before**: `const imageUrl = getFirstImageUrl(provider.images);`
- **After**: 
  ```typescript
  const fallbackUrls = getAllTrustedImageUrlsWithFallback(
    provider.images,
    provider.category?.category_images
  );
  const imageUrl = fallbackUrls.length > 0 ? fallbackUrls[0] : PLACEHOLDER_IMAGE;
  ```

## Verification

- ✅ All 1751 tests pass (214 test files)
- ✅ TypeScript compilation clean
- ✅ No breaking changes — all existing behavior preserved
- ✅ Category images now correctly used as fallback when provider has no images
- ✅ Generic placeholder still shown when neither provider images nor category images exist

## Remaining Work
- Code Review gate
- QA validation
- DevOps (commit & PR)
