---
ID: 122
Origin: 122
UUID: a3f7c82d
Status: Resolved
---

# Critique 122 — Plan 122: Category Image Unification (Supabase Storage)

**Artifact**: `agent-output/planning/122-category-image-unification-plan.md`
**Date**: 2026-05-03
**Status**: Resolved
**Verdict**: APPROVED

## Changelog

| Date (UTC)         | Handoff          | Request                    | Summary                                                    |
| ------------------ | ---------------- | -------------------------- | ---------------------------------------------------------- |
| 2026-05-03T18:15Z  | Planner → Critic | Initial review of Plan 122 | Full critique completed; 1 MEDIUM, 5 LOW findings; verdict APPROVED |
| 2026-05-03T18:27Z  | Critic → Planner | Revision requested         | Plan revised: F1–F6 all addressed; D8+D9 added; callsite list corrected; test inventory expanded |
| 2026-05-03T18:32Z  | Planner → Critic | Revision 2 re-review       | All 6 findings verified RESOLVED; deployment ordering risk added to plan; critique closed |

---

## Value Statement Assessment

**PASS** — The value statement is clear, in correct user story format, and directly addresses the Master Product Objective. The dual-system fragility was proven by a production break (v0.12.5 hotfix) — this is not speculative refactoring but addressing a demonstrated structural defect. The "So that" outcomes are concrete and verifiable: no code change for image updates, no Docker rebuild, no UUID mismatch risk, and binary bloat elimination.

Value is delivered directly (unified system replaces two competing systems), not deferred.

---

## Overview

Plan 122 is a focused refactor that eliminates a fragile hardcoded UUID-to-static-file mapping (`categoryImages.ts`) and unifies on the existing DB-driven approach (`categories.category_images` JSONB + Supabase Storage `category-images` bucket). The plan has clear lineage from the Plan 119 post-release hotfix (v0.12.5), making the motivation well-documented.

The five milestones are correctly sequenced: upload → populate DB → rewire code → delete static files → release. Dependencies are linear, which simplifies execution.

---

## Architectural Alignment

**PASS** — The plan aligns with UFlow's core principles:

| Principle | Assessment |
|---|---|
| **Postgres-first** | ✅ Reuses existing `category_images` JSONB column and `category-images` bucket — no new services or infrastructure |
| **No premature services** | ✅ Removes complexity rather than adding it |
| **Server/client separation** | ✅ All callsites are client components; image URL resolution stays client-side via existing patterns |
| **Supabase Storage** | ✅ Consolidates on a single, already-public bucket with proven access patterns |
| **Binary bloat reduction** | ✅ Removes ~7.2MB from the repository; D6 correctly avoids `git filter-repo` risk |

The plan is consistent with prior architectural decisions from Plan 055 (category image 400 bugfix), Plan 098 (category gallery redesign), and Plan 119 (provider image UX).

---

## Scope Assessment

**PASS** — The scope is appropriately bounded. The plan correctly limits itself to:
- Moving existing images (not creating new ones)
- Rewiring existing callsites (not refactoring the resolution pipeline)
- Deleting the old system (not building new admin tooling)

No feature creep detected. The "Standalone" release strategy is appropriate.

---

## Technical Debt Risks

| Risk | Assessment |
|---|---|
| Dual `parseCategoryImages` implementations | The plan keeps the existing DB path but doesn't note that TWO `parseCategoryImages` exist (one exported from `useImageFallback.ts`, one private in `imageUtils.ts`). Consolidation is not in scope but should be noted for future work |
| Background color coupling | `getCategoryCardBackgroundColor` is hash-based and source-independent — removal of `categoryImages.ts` requires relocating it or deciding to drop it |
| Test maintenance | Multiple test files reference static image paths; understated in plan |

---

## Findings

### F1 — Missing callsite: `UnifiedGallery.tsx` (MEDIUM)

**Status**: RESOLVED
**Issue**: The M3 callsite inventory lists 5 files but the codebase has 6 files importing from `categoryImages.ts`. `src/components/shared/UnifiedGallery.tsx` imports `isCategoryStaticImageUrl` (line 11) and `getCategoryCardBackgroundColor` (line 10) — these are used at lines 63 and 65 to detect category images and apply background colors.

**Impact**: The implementer will miss this file during M3, causing a build failure when `categoryImages.ts` is deleted.

**Recommendation**: Add `src/components/shared/UnifiedGallery.tsx` to the M3 callsite list. Note that it uses `isCategoryStaticImageUrl()` to detect the `/images/categories/` path prefix — this detection logic must be replaced or removed when images move to Supabase Storage URLs.

---

### F2 — Background color strategy is ambiguous (MEDIUM)

**Status**: RESOLVED
**Issue**: M3 Task 4 says "Preserve the category-aware background color behaviour (or simplify it)." The parenthetical "or simplify it" leaves the implementer without a clear decision. `getCategoryCardBackgroundColor()` is used in 5 consumer files and is functionally independent of the image source — it's a deterministic hash of `providerId` into 4 pastel colors. It will be deleted with `categoryImages.ts` unless relocated.

**Impact**: Ambiguity leads to implementation-time design decisions, which should be made at planning time.

**Recommendation**: Decide one of: (a) move `getCategoryCardBackgroundColor` and `CARD_BACKGROUND_COLORS` to `imageUtils.ts` (or a new utility), (b) inline the logic at each callsite, or (c) remove it entirely and use a single default background. Option (a) is recommended — it's 8 lines of code.

---

### F3 — American images: unresolved open question (LOW)

**Status**: RESOLVED
**Issue**: The M1 upload mapping table has a row for "American" with a note: "American images need category mapping confirmation — there is no 'American' category in the DB. These may map to an existing category or be deferred." This is an implicit OPEN QUESTION — no decision is recorded.

**Impact**: The implementer must make a judgment call during M1, or the 4 American images are silently dropped.

**Recommendation**: Resolve explicitly: either (a) map to the closest existing category (e.g., `burgers-sandwiches` `673805db-...` if it exists), (b) skip upload and discard, or (c) defer to a future plan that creates the category. Any option is acceptable — just document the decision.

---

### F4 — `isCategoryStaticImageUrl` replacement not addressed (LOW)

**Status**: RESOLVED
**Issue**: `UnifiedGallery.tsx` uses `isCategoryStaticImageUrl()` to detect whether an image URL is a category static image (by checking the `/images/categories/` prefix). After migration, category images will be Supabase Storage URLs. The plan doesn't specify whether the gallery needs a replacement detection mechanism (e.g., checking for the `category-images` bucket URL prefix) or if the category-image-specific styling can simply be dropped.

**Impact**: Minor — if not addressed, category images in the gallery will lose their pastel background styling. This may or may not be desirable.

**Recommendation**: Clarify whether `UnifiedGallery` category-image styling should be preserved (with a new URL-prefix check) or removed.

---

### F5 — Test file inventory understated (LOW)

**Status**: RESOLVED
**Issue**: The Testing Strategy section mentions updating 3 test files (`parseCategoryImages.test.ts`, `ProviderCard.test.tsx`, `useImageFallback.hierarchy.test.ts`). However, `UnifiedGallery.test.tsx` also mocks `useImageFallback` and may need fixture updates. Additionally, `ProviderCard.test.tsx` line 105 explicitly asserts `getCategoryStaticImageUrl` behavior by checking for `/images/categories/food/turkish/` path patterns — this test will fail and must be rewritten, not just updated.

**Impact**: Low — the implementer will discover these during test runs, but explicit listing prevents surprise.

**Recommendation**: Add `UnifiedGallery.test.tsx` to the testing list. Note that `ProviderCard.test.tsx` lines 105–134 contain a test case that must be fundamentally rewritten (not just fixture-swapped) because it asserts on the static file path pattern.

---

### F6 — Dual `parseCategoryImages` not documented (LOW)

**Status**: RESOLVED
**Issue**: There are two independent `parseCategoryImages` implementations: (1) exported from `useImageFallback.ts` (tested via `parseCategoryImages.test.ts`), and (2) a private function in `imageUtils.ts` used by `getAllTrustedImageUrlsWithFallback`. The plan references `parseCategoryImages()` as if it's a single function. The `imageUtils.ts` variant is already used by `ProviderDetailPage.tsx` and `CommunityServiceDetailModal.tsx` via `getAllTrustedImageUrlsWithFallback`, which resolves category images from DB JSONB.

**Impact**: Informational — not a blocker, but the implementer should know both exist to avoid confusion during rewiring. The `imageUtils.ts` path is already doing what the plan wants, just for a different codepath.

**Recommendation**: Note both implementations in the plan background or M3 tasks so the implementer has full awareness.

---

## Hotfix Scenario Assessment

**"How will this plan result in a hotfix after deployment?"**

- **Supabase Storage outage**: If the `category-images` bucket becomes unavailable, all category fallback images break simultaneously. The old static-file system was immune to this (served from Docker container). Mitigation: Supabase CDN is reliable and the bucket has been public for months. Severity: LOW likelihood, MEDIUM impact. No rollback procedure documented, but reverting the PR would restore static files.
- **JSONB data corruption**: If `category_images` JSONB is accidentally overwritten (e.g., admin action, migration), fallback images break. Mitigation: `parseCategoryImages` already handles null/empty gracefully (returns `[]`, falls through to placeholder). Severity: LOW.
- **Deployment timing**: M1/M2 (Storage upload + DB population) must happen BEFORE M3/M4 (code change + file deletion) reaches production. If deployment ordering is wrong, images 404. The plan's sequential milestones address this, but the implementer must ensure M1/M2 are applied to production before the M3/M4 code deploys.

No high-risk hotfix scenarios identified. The existing `parseCategoryImages` graceful degradation (null → empty → placeholder) provides a safety net.

---

## Duration Estimates

**PRESENT** — 3–5 hours total with per-phase breakdown. Estimates appear reasonable for the scope. The "Key driver: number of callsites needing update" note is accurate, though the actual callsite count is 6 files (not 5).

---

## Open Question Check

**1 unresolved open question detected**: American image category mapping (F3 above).

This is non-blocking — the 4 American images are inert (no providers use them) and can be silently skipped without affecting the plan's value delivery. However, the plan should document the explicit decision.

---

## Decision Record Check

All 7 decisions (D1–D7) are marked `[RESOLVED]` with rationale. No `[OPEN]` or `[DEFERRED]` decisions detected.

---

## Risk Assessment

The risk table is present and adequate. The identified risks are realistic with appropriate severity ratings. One additional risk worth noting:

- **Deployment ordering**: M1/M2 are infra/DB operations that must be applied before M3/M4 code deploys. If CI/CD deploys code before the operator runs M1/M2 manually, category images 404. The plan's milestone dependency diagram captures this, but an explicit "Operator must complete M1+M2 before merging M3+M4 PR" note would strengthen it.

---

## Recommendations

1. **(SHOULD)** Add `UnifiedGallery.tsx` to M3 callsite inventory and address `isCategoryStaticImageUrl` replacement (F1, F4).
2. **(SHOULD)** Resolve background color strategy — recommend relocating `getCategoryCardBackgroundColor` to `imageUtils.ts` (F2).
3. **(MAY)** Explicitly resolve American images: skip, map, or defer with owner/trigger (F3).
4. **(MAY)** Note dual `parseCategoryImages` implementations for implementer awareness (F6).
5. **(MAY)** Expand test file list and note `ProviderCard.test.tsx` rewrite requirement (F5).

---

## Verdict

**APPROVED** — Plan 122 is well-structured, properly scoped, and architecturally sound. The value statement is proven by a prior production incident. All decisions are resolved. The findings are advisory (1 MEDIUM, 5 LOW) — none are blockers. The missing `UnifiedGallery.tsx` callsite (F1) and background color ambiguity (F2) are the most impactful but will surface naturally during implementation.

The plan may proceed to implementation. Planner may optionally address F1–F2 before handoff, or the implementer can resolve them during M3 execution.
