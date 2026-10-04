---
ID: 055
Origin: 055
UUID: b7e4a3f1
Status: Released
---

# Implementation 055 — Home page category gallery image HTTP 400 bugfix

## Plan Reference

[agent-output/planning/055-category-image-400-plan.md](../planning/055-category-image-400-plan.md)

## Date

2026-03-24

## Changelog

| Date (UTC)        | Handoff               | Request          | Summary                                                             |
| ----------------- | --------------------- | ---------------- | ------------------------------------------------------------------- |
| 2026-03-24T13:00Z | Planner → Implementer | Execute Plan 055 | Implementation completed — all milestones delivered                 |
| 2026-03-24T12:15Z | Code Reviewer         | Fix-in-review    | Added `RETURNING` clause to migration 061 for operator verification |
| 2026-03-24T13:00Z | devops                | Document closed  | Status: Committed — Stage 1 complete for v0.8.25 |

## Implementation Summary

Fixed the production bug where the "Clothing & Fashion" category gallery on the home page rendered broken image placeholders due to a missing Supabase Storage object. Two complementary fixes were delivered:

1. **Data correction**: Replaced the broken `category_images` reference for the Clothing & Fashion category with the confirmed live asset `clothing.jpg`. A tracked Supabase migration (`061`) captures this change.

2. **UI resilience**: Added an `onError` handler to the `<Image>` component in `UnifiedGallery` so that any future broken remote image URL swaps to the local placeholder instead of rendering a broken image tile. This defense-in-depth prevents recurrence even if other category image references become stale.

### Asset Decision (Critique Finding M1)

The deferred asset decision was resolved by **using the confirmed existing replacement asset** `https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/clothing.jpg`. Rationale:

- The original file (`a65-design-2NLeXS3NR5E-unsplash.jpg`) does not exist in the bucket
- `clothing.jpg` is present in the same public `category-images` bucket and returns HTTP `200`
- Using the actual category image provides a better user outcome than degrading to placeholders only

## Milestones Completed

- [x] M1: Confirm asset decision and data target
- [x] M2: Implement data correction (migration 061 + SQL reference file)
- [x] M3: Add gallery fallback hardening (onError handler with TDD)
- [x] M4: Add regression coverage and validations (15 tests)
- [x] M5: Pre-handoff QA gate (vitest, tsc, eslint all pass)

## Files Modified

| Path                                          | Changes                                                                                                      | Lines Changed |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| `src/components/shared/UnifiedGallery.tsx`    | Added `useState` import, `PLACEHOLDER_IMAGE` constant, `failedIndexes` state, `onError` handler on `<Image>` | ~20           |
| `src/hooks/useImageFallback.ts`               | Exported `parseCategoryImages` for testability                                                               | 1             |
| `sql/queries/sync-categories-dev-to-prod.sql` | Changed Clothing & Fashion `category_images` from broken URL to `clothing.jpg`                               | 1             |

## Files Created

| Path                                                                | Purpose                                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `supabase/migrations/061_fix_clothing_category_image_reference.sql` | Tracked migration to replace broken category_images with `clothing.jpg` |
| `src/__tests__/components/UnifiedGallery.test.tsx`                  | Component tests for onError fallback behavior (4 tests)                 |
| `src/__tests__/hooks/parseCategoryImages.test.ts`                   | Unit tests for parseCategoryImages logic (11 tests)                     |

## Code Quality Validation

- [x] `npm test` (vitest run) — 314 passed, 18 skipped, 0 failed
- [x] `npm run type-check` (tsc --noEmit) — 0 errors
- [x] ESLint — 0 errors on production files
- [x] No new dependencies added

## TDD Compliance

| Function/Class                    | Test File                     | Test Written First?             | Failure Verified? | Failure Reason                                                                                | Pass After Impl? |
| --------------------------------- | ----------------------------- | ------------------------------- | ----------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| `UnifiedGallery` onError fallback | `UnifiedGallery.test.tsx`     | ✅ Yes                          | ✅ Yes            | AssertionError: src unchanged after fireEvent.error                                           | ✅ Yes           |
| `parseCategoryImages` (exported)  | `parseCategoryImages.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes            | N/A — existing function, regression tests verify production data formats + the exact bug path | ✅ Yes           |

## Value Statement Validation

**Original**: "As a home page visitor, I want every category gallery on the landing experience to load real images or a graceful fallback, so that UFlow feels trustworthy, polished, and reliable."

**Implementation delivers**:

- The Clothing & Fashion row no longer triggers HTTP 400 — `category_images` now points to the live `clothing.jpg` asset
- Any future broken remote URL in any category gallery is caught by the `onError` handler and swapped to the local placeholder
- Existing working categories (Health & Sports, Community Support) are unaffected

## Test Coverage

### Unit Tests (parseCategoryImages — 11 tests)

- NULL/undefined/empty input handling (3 tests)
- Valid JSONB production formats: `{urls:[...]}`, JSON string, plain array, `{url:"..."}` (4 tests)
- The exact bug path: broken URL from valid JSONB + corrected `clothing.jpg` replacement (2 tests)
- Malformed input graceful degradation (2 tests)

### Component Tests (UnifiedGallery — 4 tests)

- `[pre-fix FAILS]` broken remote image shows broken img instead of placeholder
- `[post-fix PASSES]` broken remote image falls back to placeholder on error
- `[post-fix PASSES]` already-placeholder image does not re-trigger fallback
- Valid images render without modification when no error occurs

## Test Execution Results

```
$ node_modules/.bin/vitest run
Test Files  36 passed | 1 skipped (37)
Tests       314 passed | 18 skipped (332)
Duration    7.36s

$ node_modules/.bin/tsc --noEmit
(exit 0 — no errors)

$ node_modules/.bin/eslint src/components/shared/UnifiedGallery.tsx src/hooks/useImageFallback.ts
(exit 0 — no errors)
```

## Local Verification

`Local verification: ⚠️ Blocked` — No `.env.local` with valid Supabase credentials available in this worktree. The production data fix (migration 061) must be applied to the production database, and the home page gallery verified in a live environment. This is surfaced for QA/UAT.

## Outstanding Items

1. **Migration 061 must be applied to production** — The `category_images` column for Clothing & Fashion needs to be updated to the live `clothing.jpg` URL in the production database. This can be done by running the migration via `supabase db push` or directly in the SQL editor.
2. **Post-deploy smoke check** — After deployment, verify the Clothing & Fashion row on the home page renders `clothing.jpg` instead of broken tiles.

## Next Steps

→ Code Review → QA → UAT → DevOps
