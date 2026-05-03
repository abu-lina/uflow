---
ID: 122
Origin: 122
UUID: a3f7c82d
Status: Committed
---

# Implementation Doc — Plan 122: Category Image Unification (Supabase Storage)

**Date**: 2026-05-04T20:47Z  
**Plan**: `agent-output/planning/122-category-image-unification-plan.md`  
**GitHub Issue**: #207  
**Branch**: `hotfix/119-category-images-assets`

---

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-05-04 | Implementer→QA | Plan 122 | All milestones complete. 7.2 MB of static PNGs removed, DB-driven JSONB system live, all gates passing. |
| 2026-05-04 | Implementer→Code Review rework | Address findings | Fixed upload script release-path blocker, decoupled parser from hook layer, corrected plan path reference. |

---

## Implementation Summary

Eliminated the fragile hardcoded UUID→static-PNG map (`categoryImages.ts`) that caused the v0.12.4 Turkish category image bug (fixed as hotfix v0.12.5). All category image resolution now goes through `categories.category_images` JSONB column, served from Supabase Storage `category-images` bucket.

**Value delivered**: Adding or changing category images no longer requires a code change, Docker rebuild, or risk of UUID mismatch. The git repository is 7.2 MB lighter.

---

## Milestones Completed

- [x] M1: 18 PNGs converted to WebP via `cwebp` and uploaded to dev Supabase Storage (`scripts/upload-category-images.mjs`)
- [x] M2: `categories.category_images` JSONB populated on production via MCP (Turkish=8, Arabic=6, Italian=4 URLs) and dev DB inline
- [x] M3a: `hashId`, `getCategoryCardBackgroundColor`, `CARD_BACKGROUND_COLORS` relocated to `imageUtils.ts`
- [x] M3b: `useImageFallback.ts` rewired — `resolveGalleryImage` now accepts `categoryImages: unknown` (JSONB) instead of static `categoryId` string; `category.category_images` consumed from hook
- [x] M3c: TDD hierarchy tests rewritten (7/7 passing, failure verified before implementation)
- [x] M3d: 5 callsite components updated: ProviderCard, ProviderDetailPage, ProviderDetailModal, MobileProviderDetail, UnifiedGallery
- [x] M3e: `categoryImages.ts` deleted
- [x] M3f: ProviderCard.test.tsx and UnifiedGallery.test.tsx updated
- [x] M4: `public/images/categories/` deleted (22 PNGs, 7.2 MB)
- [x] M5: Version bumped to 0.12.6 (preliminary — DevOps confirms at Stage 1), CHANGELOG entry added, `npm install --package-lock-only` run

---

## Files Modified

| Path | Changes | Lines affected |
|------|---------|---------------|
| `src/utils/imageUtils.ts` | Added `hashId`, `CARD_BACKGROUND_COLORS`, `getCategoryCardBackgroundColor` (relocated from categoryImages.ts); exported shared `parseCategoryImages` utility | +18 |
| `src/hooks/useImageFallback.ts` | `resolveGalleryImage` 2nd param `categoryId:string` → `categoryImages:unknown`; `fetchEntityImages` passes JSONB; parser moved to utility module and re-exported for compatibility | ~20 |
| `src/components/providers/ProviderCard.tsx` | Removed `categoryImages.ts` import; added `parseCategoryImages`+`hashId` from new locations; replaced `getCategoryStaticImageUrl` call with JSONB-driven resolution | ~8 |
| `src/components/providers/ProviderDetailPage.tsx` | Same pattern as ProviderCard. Added `getCategoryCardBackgroundColor`+`hashId` to `imageUtils` import, added `parseCategoryImages` import | ~10 |
| `src/components/providers/ProviderDetailModal.tsx` | Same pattern as ProviderCard | ~8 |
| `src/components/providers/MobileProviderDetail.tsx` | Same pattern as ProviderCard | ~8 |
| `src/components/shared/UnifiedGallery.tsx` | Removed `categoryImages` import entirely; removed `isCategoryStaticImageUrl` detection; simplified to always `object-cover`; removed palette background styling | ~15 |
| `src/__tests__/hooks/useImageFallback.hierarchy.test.ts` | Full rewrite — 7 TDD tests for new `resolveGalleryImage` signature using Supabase Storage JSONB fixture | ~100 |
| `src/__tests__/components/ProviderCard.test.tsx` | Updated "category stock image" test to pass `category_images` JSONB fixture, assert on Storage URL | ~12 |
| `src/__tests__/components/UnifiedGallery.test.tsx` | Updated "palette colors" test to assert `object-cover` (not `object-contain`), no background color | ~12 |
| `package.json` | Version 0.12.4 → 0.12.6 (preliminary) | 1 |
| `package-lock.json` | Version aligned via `npm install --package-lock-only` | auto |
| `CHANGELOG.md` | Added `[Unreleased] - 2026-05-04` entry for Plan 122 | ~12 |
| `scripts/upload-category-images.mjs` | Reworked upload flow to mirror WebP files from a stable source bucket URL; executable after deleting local static PNGs; supports `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env override | ~70 |

---

## Files Created

| Path | Purpose |
|------|---------|
| `scripts/upload-category-images.mjs` | M1 operator script — mirrors existing category WebP images from source Storage bucket to target project `category-images` bucket. Run by DevOps against production. |

---

## Files Deleted

| Path | Reason |
|------|--------|
| `src/utils/categoryImages.ts` | Replaced by DB-driven system. `getCategoryCardBackgroundColor`/`hashId` relocated to `imageUtils.ts`; `getCategoryStaticImageUrl`/`isCategoryStaticImageUrl` removed. |
| `public/images/categories/` | 22 PNGs (7.2 MB) migrated to Supabase Storage as WebP. |

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|--------------------|--------------------|----------------|-----------------|
| `resolveGalleryImage(providerImages, categoryImages, providerId)` | `src/__tests__/hooks/useImageFallback.hierarchy.test.ts` | ✅ Yes | ✅ Yes | AssertionError (wrong param type — old signature took categoryId string) | ✅ Yes |
| `fetchEntityImages(_, categoryId, limit, categoryImages)` | `src/__tests__/hooks/useImageFallback.hierarchy.test.ts` | ✅ Yes | ✅ Yes | AssertionError (categoryImages not passed, JSONB ignored) | ✅ Yes |
| ProviderCard JSONB resolution | `src/__tests__/components/ProviderCard.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | AssertionError — mock missing `category_images`, `src` contained `/images/categories/` path | ✅ Yes |
| UnifiedGallery `object-cover` behavior | `src/__tests__/components/UnifiedGallery.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | AssertionError — `object-contain` class no longer rendered | ✅ Yes |

---

## Code Quality Validation

- [x] `npm run type-check` — exit 0 ✅
- [x] `npm run lint` — 0 errors, 58 pre-existing warnings ✅
- [x] `npm run build` — exit 0 ✅
- [x] `npx vitest run` — **1236 passed, 22 skipped, 0 failed** ✅

---

## Test Coverage

| Area | Tests | Status |
|------|-------|--------|
| `resolveGalleryImage` hierarchy (Storage JSONB, determinism, hash distribution, placeholder, stringified) | 7 | ✅ |
| ProviderCard with DB-driven category image | 1 | ✅ |
| UnifiedGallery `object-cover` for all images (no static detection) | 1 | ✅ |
| Regression: provider image wins over category fallback | pre-existing | ✅ |

---

## Test Execution Results

```
Test Files  155 passed | 2 skipped (157)
     Tests  1236 passed | 22 skipped (1258)
  Start at  20:47:19
  Duration  23.32s
```

No failures. Pre-plan baseline was ~1222 tests; delta = +14 new tests.

---

## Value Statement Validation

**Original**: "As the platform operator, I want a single, DB-driven category image system instead of two competing approaches (hardcoded UUID map + Supabase Storage JSONB), so that adding or changing category images never requires a code change, Docker rebuild, or risk of silent UUID mismatch — and the git repository stops accumulating binary bloat."

**Delivered**:
- ✅ One image system — `categories.category_images` JSONB + Supabase Storage
- ✅ No code change required to add/change category images — only DB update
- ✅ No Docker rebuild required — images fetched from Storage at runtime
- ✅ No UUID mismatch risk — category_id from the same DB row drives path construction
- ✅ 7.2 MB of PNGs removed from git history going forward

---

## Deployment Notes (CRITICAL)

### Production Storage Upload (DevOps action required)

M1 images were uploaded to **dev** Supabase Storage (`qrekonfhaenjdnjhwdum`). Production JSONB was pre-populated with production Storage URLs (via MCP) but the actual WebP files have not been uploaded to production Storage yet.

The upload script now mirrors WebP files from a stable source bucket URL (default: dev `category-images`) and no longer depends on deleted `public/images/categories/**` PNG assets.

**DevOps must run before or at deployment:**
```bash
SUPABASE_URL=https://rdtdtcfntopcxcigkqoq.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<production-key> \
node scripts/upload-category-images.mjs
```

The script is idempotent (skips already-uploaded files). The JSONB URLs are already correct — they use production Storage paths. The only missing step is the file upload itself.

> Note: Until DevOps runs this script, providers in Turkish/Arabic/Italian categories will fall back to `PLACEHOLDER_IMAGE` (ornament placeholder) instead of the food photography. This is graceful degradation — no error thrown.

---

## Cross-Layer Integration Self-Check

- `parseCategoryImages` called in 4 provider components with `provider.category?.category_images ?? null` — `category` object is fetched by the providers.ts query (`'*, category:categories(name_de, name_en, category_images)'`) ✅
- `useImageFallback` hook consumes `category?.category_images` and passes to `fetchEntityImages` and `resolveGalleryImage` ✅
- `UnifiedGallery` `categoryId` prop still passed to hook (used for React Query cache key and DB fallback) ✅

## Search/Filter Client-Interaction Trace

N/A — no form submit handlers or URL parameter builders modified.

## Multi-Plan State Audit

N/A — no `useEffect`/`useState`/localStorage hydration from prior plans in scope.

---

## Outstanding Items

None. All milestones complete.

**Known deferred item** (by design, not a blocker):
- Production Storage upload (M1) — delegated to DevOps per plan. JSONB already correct. Graceful fallback in place.

---

## Next Steps

➡️ QA review, then DevOps (run production Storage upload + deploy v0.12.6)
