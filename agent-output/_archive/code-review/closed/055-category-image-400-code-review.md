---
ID: 055
Origin: 055
UUID: b7e4a3f1
Status: Released
---

# Code Review 055 — Home page category gallery image HTTP 400 bugfix

**Plan Reference**: `agent-output/planning/055-category-image-400-plan.md`
**Implementation Reference**: `agent-output/implementation/055-category-image-400-implementation.md`
**Date**: 2026-03-24
**Reviewer**: Code Reviewer

## Changelog

| Date (UTC)        | Agent Handoff               | Request                        | Summary                                                                  |
| ----------------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| 2026-03-24T12:10Z | Implementer → Code Reviewer | Review Plan 055 implementation | Full review completed — APPROVED; one fix-in-review applied to migration |
| 2026-03-24T13:00Z | devops | Document closed | Status: Committed — Stage 1 complete for v0.8.25 |

## Architecture Alignment

**System Architecture Reference**: `docs/architecture/ARCHITECTURE_OVERVIEW.md`
**Alignment Status**: ALIGNED

The implementation stays strictly within the architectural contract:

- Media remains in Supabase Storage; no new storage service introduced
- `next/image` optimization path is preserved (no CDN changes)
- `next.config.js` is untouched — correctly identified not to be the problem
- No new external dependencies added
- The data correction is tracked in `supabase/migrations/` in line with repo conventions
- Client component pattern is correct: `'use client'` in `UnifiedGallery`, `useState` for UI state only

The deployment CI pipeline (`deploy-hetzner.yml`) does not auto-apply Supabase migrations, which is consistent with how all other migrations in this project are managed. Migration 061 is a manual-apply step before or alongside deployment. The implementation doc correctly flags this.

## TDD Compliance Check

**TDD Table Present**: ✅ Yes  
**All Rows Complete**: ✅ Yes  
**Assessment**:

| Function                            | Test First? | Red Verified?                                                  | Green after impl? |
| ----------------------------------- | ----------- | -------------------------------------------------------------- | ----------------- |
| `UnifiedGallery` `onError` fallback | ✅ Yes      | ✅ Yes — `AssertionError: src unchanged after fireEvent.error` | ✅ Yes            |
| `parseCategoryImages` (regression)  | ⚠️ Post-fix | N/A — bug path regression on existing function                 | ✅ Yes            |

The `[pre-fix FAILS]` / `[post-fix PASSES]` test naming convention from `.github/copilot-instructions.md` is followed correctly. The `[pre-fix FAILS]` test for `UnifiedGallery` now passes because the fix is in place — this is the correct expected behavior.

The `parseCategoryImages` regression tests are post-fix by nature (the function already existed), which is acceptable per the bugfix handoff checklist. They cover the exact production data path documented in Analysis 055.

## Findings

### Critical

None.

### High

None.

### Medium

None.

### Low

**[LOW] Test infrastructure divergence — local `next/image` mock**

- **Location**: `src/__tests__/components/UnifiedGallery.test.tsx:L6-L29`
- **Issue**: The test defines its own `next/image` mock rather than using the shared `src/__tests__/utils/test-utils.tsx` pattern. The divergence is _necessary_ because the shared mock omits `onError` forwarding — but it creates a maintenance split point: future changes to the shared mock won't propagate here.
- **Recommendation**: Add an inline comment explaining why the local mock is required. Consider a follow-up to add `onError` to the shared test-utils mock so this local override becomes unnecessary.

**[LOW] `parseCategoryImages` exported solely for testability**

- **Location**: `src/hooks/useImageFallback.ts:L132`
- **Issue**: The function was internal and is now a named export. This expands the public API surface without a documented consumer contract.
- **Recommendation**: Add a JSDoc `@internal` comment or note that the export exists for test access only. Not urgent — single consumer, zero blast radius.

**[LOW] Test group name in `parseCategoryImages.test.ts` is slightly misleading**

- **Location**: `src/__tests__/hooks/parseCategoryImages.test.ts:L52`
- **Issue**: `describe('[pre-fix FAILS] broken URL handling...')` implies the function was broken pre-fix, but `parseCategoryImages` is correct — it extracts whatever URL is stored. The bug was upstream (storage object missing). The inner test comment explains this accurately, but the describe-level name could mislead at a glance.
- **Recommendation**: Rename the describe block to `'broken URL handling — the exact production bug path'` for clarity. Not a defect — logic is correct.

### Fix-in-Review Applied

**[LOW → FIXED] Migration 061 — no `RETURNING` clause**

- **Location**: `supabase/migrations/061_fix_clothing_category_image_reference.sql`
- **Issue**: The `UPDATE` had no `RETURNING` clause. If the `WHERE` matched 0 rows (e.g., wrong environment, already-applied migration), there would be no visible indication of success or failure.
- **Fix applied**: Added `RETURNING id, category_id, name_de, category_images` so the operator running this migration sees the updated row immediately and can confirm the change took effect. Qualifies for fix-in-review: 1 line, zero test requirement, no behavioral change, low blast radius.
- **Verification path**: QA / DevOps should confirm the migration output shows exactly 1 row returned with `name_de = 'Kleidung & Mode'` and `category_images` pointing to `clothing.jpg`.

### Info

**[INFO] `failedIndexes` not reset on `categoryId`/`category` prop change**

- **Location**: `src/components/shared/UnifiedGallery.tsx:L30`
- **Issue**: `failedIndexes` state persists within a component instance. If `categoryId` changes without a component remount, previously-failed indexes would carry over.
- **Status**: Not a defect in practice. Each category in `CategoryGallerySection` renders its own `UnifiedGallery` via `key={categoryId}` on the parent div — React remounts the component on `key` change, resetting state. No action needed.

**[INFO] Migration 061 is manual — must be applied before deploy takes effect**

- **Location**: `.github/workflows/deploy-hetzner.yml` (no `supabase db push` step)
- **Status**: Confirmed. The production data fix requires a manual migration run. This is consistent with all other migrations in this project and is correctly flagged in the Implementation doc's Outstanding Items section. DevOps must apply migration 061 to production before/alongside the app deployment.

## Positive Observations

1. **Excellent TDD execution**: Test written first, failure recorded with the exact assertion error, implementation then proceeded. The test evidence is captured in the implementation doc. This is a model TDD run.

2. **Minimal change footprint**: ~20 LOC changed across 3 production files. No unrelated code touched. Exactly what a tight bugfix looks like.

3. **`PLACEHOLDER_IMAGE` constant**: Extracting the magic string `/images/placeholder.jpg` to a named constant eliminates duplication between the array-fill loop and the `onError` handler. Clean KISS application.

4. **Guard against infinite re-render**: `!failedIndexes.has(index)` in the `onError` handler correctly prevents a second state update if the placeholder itself fails to load. This is thoughtful defensive coding.

5. **Migration dual-condition safety**: `WHERE category_id = '...' AND name_de = 'Kleidung & Mode'` — using both the UUID and a human-readable guard reduces the risk of mis-targeting in a wrong-environment scenario.

6. **Data strategy is principled**: Replacing the stale URL with the confirmed live `clothing.jpg` asset restores the intended category image while retaining the newly added fallback guard for any future broken URLs.

7. **Full test suite unaffected**: 314 tests passing, 0 regressions introduced.

## Required Actions

None (APPROVED). The fix-in-review change to migration 061 is already applied.

Optional follow-ups (no block on QA):

1. Add inline comment to `UnifiedGallery.test.tsx` explaining why `next/image` is mocked locally
2. Update shared test-utils mock to forward `onError` to eliminate the local override need
3. Add `@internal` JSDoc tag to `parseCategoryImages` export
4. Rename the misleading `describe` block in `parseCategoryImages.test.ts`
5. Track "upload a proper Clothing & Fashion category image" as a product backlog item

## Verdict

**Status**: APPROVED  
**Rationale**: No CRITICAL, HIGH, or MEDIUM findings. All LOW findings are minor documentation/clarity issues with no behavioral impact. The fix-in-review (migration RETURNING clause) is already applied. TDD compliance is verified. Full test suite passes (314/314). Type-check and lint pass clean. The implementation correctly addresses both the immediate data defect and the systemic UI weakness identified in Analysis 055.

## Next Steps

Handing off to QA agent for test execution.
