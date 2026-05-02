---
ID: 119
Origin: 119
UUID: e5c1d7a4
Status: Active
---

# Implementation 119 — Provider Image UX: Engaging Fallbacks + Image Enrichment

## Plan Reference

- Plan: `agent-output/planning/119-provider-image-ux-plan.md`
- Scope in this phase: M1 (Fallback UX) + M1b (Ornament Placeholder Redesign) + M3 (Unsplash category-based image enrichment)

## Date

- 2026-05-02

## Changelog

| Date (UTC) | Handoff / Request | Summary |
| --- | --- | --- |
| 2026-05-02T12:12Z | Implementer start | Started M1 implementation with TDD-first workflow; plan marked In Progress |
| 2026-05-02T13:48Z | M1 execution | Added dynamic `ProviderImageFallback`, integrated in `ProviderCard`, replaced runtime placeholder string literals with shared constant, completed lint/type-check/tests; build blocked by missing env var |
| 2026-05-02T14:45Z | M3 execution | Implemented Unsplash category-based enrichment foundation: new image enrichment helper module + tests, image enrichment migration, `scripts/enrich-images.ts` (`--curate`/`--assign`), admin approval support for image candidates with append-only `provider_images`, environment template updates, and full gate validation (lint/type-check/tests/build). |
| 2026-05-02T16:35Z | Code review remediation | Addressed pre-QA review findings: removed download-tracking bypass, added idempotent candidate staging guard for assign writes, replaced hardcoded image labels with i18n keys in touched UI files, added direct script regression tests, and re-ran full gates. |
| 2026-05-02T17:11Z | M1b execution | Implemented M1b ornament placeholder redesign per Figma (node 460:2818): exported two static SVG assets from Figma, rewrote `ProviderImageFallback` visual rendering (4-layer ornament design), adapted ProviderImageFallback and ProviderCard tests. Full gates: lint 0 errors, type-check clean, 1222 tests passed. |

## Implementation Summary

M1 remains complete and unchanged from prior handoff.

M3 core implementation is now in place:
- Added `scripts/enrich-images.ts` with required modes:
	- `--curate` (search Unsplash, track download endpoint, upload category image pool to Supabase Storage, write pool manifest)
	- `--assign --dry-run` (preview deterministic image assignment per provider)
	- `--assign --write` (stage image candidates in `enrichment_candidates`)
- Added `src/lib/enrichment/image-enrichment.ts` with approved 20-category query mapping, deterministic image selection, and candidate payload shaping.
- Extended admin enrichment approval flow to support image candidates (`enrichment_type='image'`) while preserving append-only semantics for `provider_images`.
- Added migration `088_plan_119_image_enrichment_columns.sql` to extend `enrichment_candidates` with image-specific metadata.
- Added `UNSPLASH_ACCESS_KEY` to environment templates and local `.env.local` placeholder key entry.
- Remediated code-review findings before QA:
	- Removed `--allow-untracked-downloads` behavior from `scripts/enrich-images.ts`; curate now fails closed on download-tracking errors.
	- Added import-safe CLI/module split in `scripts/enrich-images.ts` and exported `stageImageCandidate` with active-status dedupe guard (`pending`/`approved`/`applied`) before insert.
	- Replaced hardcoded user-facing image/error text in `ProviderImageFallback`, `CategoryGallery`, and `CommunityServiceGallery` with translation keys via `t(...)`.
	- Added targeted script regression tests for duplicate prevention and successful staging path.

TDD was followed for all newly introduced feature behavior in this phase:
- Red: new helper module tests failed with module-resolution error before implementation.
- Red: admin enrichment image-approval test failed because `provider_images` candidates were previously rejected.
- Green: implemented helper module + admin service image branch; all targeted tests passed.

## Baseline & Measurements

N/A for M1 (visual fallback feature; no explicit performance target in plan).

## Milestones Completed

- [x] M1 — Fallback UX
- [x] M1b — Ornament Placeholder Redesign (Figma-spec, 4-layer ornament design)
- [x] M3 — Enrichment Integration (Unsplash category-based workflow)
- [ ] M4 — Version & Release Artifacts

## Files Modified

| Path | Change | Lines +/- |
| --- | --- | --- |
| `src/components/providers/ProviderCard.tsx` | Integrated `ProviderImageFallback` for no-image render path; removed static placeholder fallback in normal path | +27 / -16 |
| `src/__tests__/components/ProviderCard.test.tsx` | Updated no-image assertion to dynamic fallback expectation | +4 / -3 |
| `src/app/(public)/profile/ProfileContent.tsx` | Replaced hardcoded placeholder literals with `PLACEHOLDER_IMAGE` constant | +4 / -4 |
| `src/components/providers/ProviderCardModal.tsx` | Replaced hardcoded placeholder usage with shared constant | +2 / -4 |
| `src/components/providers/ProviderCardLegacy.tsx` | Replaced hardcoded placeholder returns with shared constant | +4 / -3 |
| `src/components/providers/ProviderDetailModal.tsx` | Switched to shared `PLACEHOLDER_IMAGE` constant | +1 / -2 |
| `src/components/shared/CategoryGallery.tsx` | Switched placeholder padding/comparison to shared constant | +3 / -2 |
| `src/components/shared/CommunityServiceGallery.tsx` | Switched placeholder padding/comparison to shared constant | +3 / -2 |
| `src/components/shared/MobileProfileProviderCard.tsx` | Switched no-image fallback to shared constant | +2 / -1 |
| `src/components/shared/UnifiedGallery.tsx` | Removed local placeholder literal, imported shared constant | +1 / -2 |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | Replaced local placeholder literal constant with shared import | +5 / -3 |
| `agent-output/planning/119-provider-image-ux-plan.md` | Updated status to In Progress and appended implementer start changelog row | +2 / -1 |
| `src/services/admin/enrichment.ts` | Added image candidate fields, selected-query projection, and append-only image approval branch (`enrichment_type='image'`) | +69 / -14 |
| `src/__tests__/services/admin-enrichment.test.ts` | Added regression test for image-candidate approval append semantics | +78 / 0 |
| `scripts/enrich-images.ts` | Refactored to import-safe CLI/module boundary, removed tracking bypass, added idempotent candidate staging guard | +179 / -90 |
| `src/components/shared/CategoryGallery.tsx` | Replaced hardcoded labels/errors with i18n keys via `useLanguage` | +6 / -5 |
| `src/components/shared/CommunityServiceGallery.tsx` | Replaced hardcoded labels/errors with i18n keys via `useLanguage` | +6 / -4 |
| `src/components/providers/ProviderCard.tsx` | Injected translated fallback labels into `ProviderImageFallback` props | +6 / 0 |
| `src/features/providers/components/ProviderImageFallback.tsx` | Added i18n-ready `anonymousName` + `fallbackImageAriaLabel` props | +5 / -2 |
| `src/features/providers/__tests__/ProviderImageFallback.test.tsx` | Added regression for injected i18n fallback labels | +14 / 0 |
| `src/features/providers/components/ProviderImageFallback.tsx` | **M1b**: Rewrote visual rendering to 4-layer ornament design; removed `TONE_PALETTE`, `CATEGORY_ICON_MAP`, initials, Iconify; added `stockImageUrl` prop | +40 / -75 |
| `src/features/providers/__tests__/ProviderImageFallback.test.tsx` | **M1b**: Replaced M1 initials/tone/icon assertions with ornament/logo-mark/stock-image assertions; retained no-throw and aria-label tests | +55 / -45 |
| `src/__tests__/components/ProviderCard.test.tsx` | **M1b**: Updated `should render dynamic fallback when no images available` to assert ornament+logo-mark instead of initials text | +3 / -1 |
| `src/translations/en.ts` | Added provider image-label translation keys | +8 / 0 |
| `src/translations/de.ts` | Added provider image-label translation keys | +8 / 0 |
| `src/translations/ar.ts` | Added provider image-label translation keys | +8 / 0 |
| `src/translations/tr.ts` | Added provider image-label translation keys | +8 / 0 |
| `src/translations/ur.ts` | Added provider image-label translation keys | +8 / 0 |
| `src/translations/ps.ts` | Added provider image-label translation keys | +8 / 0 |
| `package.json` | Added `enrich:images` script | +1 / 0 |
| `env.local.template` | Added `UNSPLASH_ACCESS_KEY` | +4 / 0 |
| `env.template` | Added `UNSPLASH_ACCESS_KEY` | +4 / 0 |
| `env.uat.template` | Added `UNSPLASH_ACCESS_KEY` | +4 / 0 |
| `env.production.template` | Added `UNSPLASH_ACCESS_KEY` | +4 / 0 |

## Files Created

| Path | Purpose |
| --- | --- |
| `agent-output/implementation/119-provider-image-ux-implementation.md` | Implementation execution log and evidence |
| `src/features/providers/components/ProviderImageFallback.tsx` | New dynamic no-image provider fallback component |
| `src/features/providers/__tests__/ProviderImageFallback.test.tsx` | TDD-first unit coverage for fallback rendering, distinction, and no-throw edge cases |
| `src/lib/enrichment/image-enrichment.ts` | Plan 119 category query map + deterministic pool selection + image candidate payload builder |
| `src/__tests__/lib/enrichment/image-enrichment.test.ts` | TDD coverage for category map, query fallback, deterministic selection, and candidate payload shape |
| `src/__tests__/scripts/enrich-images.test.ts` | TDD regression coverage for assign staging dedupe + staging success path |
| `scripts/enrich-images.ts` | New M3 CLI runner with `--curate` and `--assign` workflows |
| `supabase/migrations/088_plan_119_image_enrichment_columns.sql` | Adds image enrichment columns and index to `enrichment_candidates` |
| `public/images/ornament-mask.svg` | **M1b**: Islamic geometric ornament overlay SVG from Figma node 460:2819 (viewBox 0 0 163 163) |
| `public/images/uflow-logo-mark.svg` | **M1b**: UFlow inner crescent/leaf logo mark SVG from Figma node 460:2823 (viewBox 0 0 25.33 19.22) |

## Deployment Path Audit

N/A — no deployment surface files changed (`Dockerfile`, deploy scripts, workflows, nginx, env plumbing unchanged).

## Code Quality Validation

- [x] `npm run lint` (0 errors, warnings present in unrelated files)
- [x] `npm run type-check`
- [x] `npm run build`
- [x] `npx vitest run` (full suite)

## Local Verification

Local verification: N/A for this M3 step. Current work is schema + script + admin service logic and does not introduce direct UI/CSS changes requiring browser interaction. CLI live-run verification against Unsplash/Supabase is pending valid runtime credentials and operator execution.

## Value Statement Validation

Original value statement: replace generic placeholders with identity-bearing provider visuals.

Implementation delivery:
- `ProviderCard` no-image path now shows a deterministic branded fallback (initials + tone + icon) instead of static placeholder art.
- Runtime hardcoded placeholder strings were centralized to the shared constant path, reducing brittle literal duplication and aligning fallback behavior.
- Category-based enrichment can now stage image candidates end-to-end with deterministic per-provider selection and admin-reviewed apply flow.
- Admin approval now safely supports image candidates by appending to `provider_images` rather than overwriting existing URLs.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `ProviderImageFallback` | `src/features/providers/__tests__/ProviderImageFallback.test.tsx` | ✅ Yes | ✅ Yes | Import resolution failure (`Failed to resolve import ... ProviderImageFallback`) | ✅ Yes |
| `resolveCategoryImageQueries` | `src/__tests__/lib/enrichment/image-enrichment.test.ts` | ✅ Yes | ✅ Yes | Import resolution failure (`Failed to resolve import ... image-enrichment`) | ✅ Yes |
| `selectDeterministicPoolImage` | `src/__tests__/lib/enrichment/image-enrichment.test.ts` | ✅ Yes | ✅ Yes | Import resolution failure (`Failed to resolve import ... image-enrichment`) | ✅ Yes |
| `createImageCandidatePayload` | `src/__tests__/lib/enrichment/image-enrichment.test.ts` | ✅ Yes | ✅ Yes | Import resolution failure (`Failed to resolve import ... image-enrichment`) | ✅ Yes |
| `approveCandidate` image branch | `src/__tests__/services/admin-enrichment.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Assertion failure (`expected false to be true`) for `provider_images` image candidate approval | ✅ Yes |
| `stageImageCandidate` | `src/__tests__/scripts/enrich-images.test.ts` | ✅ Yes | ✅ Yes | Module import side-effect exited early (`process.exit unexpectedly called with "1"`) before import-safe refactor | ✅ Yes |
| `ProviderImageFallback` i18n label injection | `src/features/providers/__tests__/ProviderImageFallback.test.tsx` | ✅ Yes | ✅ Yes | Assertion failure: expected injected aria label (`Fallback-Bild fuer Anbieter`) but received hardcoded default | ✅ Yes |
| `ProviderImageFallback` M1b ornament redesign | `src/features/providers/__tests__/ProviderImageFallback.test.tsx` | ✅ Yes | ✅ Yes | 3 tests failed: `provider-fallback-ornament`, `provider-fallback-logo-mark`, `provider-fallback-stock-image` testids not found in M1 DOM | ✅ Yes |

## Test Coverage

- Unit: `ProviderImageFallback` (initials rendering, name-based distinct tone, category-based icon distinction, no-throw edge cases)
- Component regression: `ProviderCard` no-image scenario switched to dynamic fallback
- Gallery regression: `UnifiedGallery` maintained placeholder behavior through shared constant refactor
- Unit: `image-enrichment` helper module (20-category map coverage, category query fallback, deterministic pool selection, candidate payload shape)
- Service regression: `approveCandidate` supports image candidate application with append-only semantics
- Script regression: `stageImageCandidate` duplicate-prevention and successful staging paths
- i18n regression: injected fallback aria labels and translated gallery alt/error strings in touched components

### Applicability Checks

- Search/Filter Client-Interaction Trace: N/A — no search handler, URL param builder, or mixed-entity inline action changes in this scope.
- Multi-Plan State Audit: N/A — no prior-plan `useEffect`/hydration state extension modified in this scope.
- API Route Coverage Gate: N/A — no `src/app/api/**/route.ts` changes.

## Test Execution Results

| Command | Result | Issues |
| --- | --- | --- |
| `npx vitest run src/features/providers/__tests__/ProviderImageFallback.test.tsx` (pre-impl) | ❌ Failed as expected | `Failed to resolve import "@/features/providers/components/ProviderImageFallback"` |
| `npx vitest run src/features/providers/__tests__/ProviderImageFallback.test.tsx` (post-impl) | ✅ Passed (4/4) | None |
| `npx vitest run src/features/providers/__tests__/ProviderImageFallback.test.tsx src/__tests__/components/ProviderCard.test.tsx src/__tests__/components/UnifiedGallery.test.tsx` | ✅ Passed (51/51) | None |
| `npx vitest run src/__tests__/lib/enrichment/image-enrichment.test.ts src/__tests__/services/admin-enrichment.test.ts` (pre-impl) | ❌ Failed as expected | Missing module `@/lib/enrichment/image-enrichment` + image approval assertion failure in `approveCandidate` |
| `npx vitest run src/__tests__/lib/enrichment/image-enrichment.test.ts src/__tests__/services/admin-enrichment.test.ts` (post-impl) | ✅ Passed (10/10) | None |
| `npm run test -- src/__tests__/scripts/enrich-images.test.ts` (pre-impl) | ❌ Failed as expected | `process.exit unexpectedly called with "1"` when importing `scripts/enrich-images.ts` before import-safe refactor |
| `npm run test -- src/features/providers/__tests__/ProviderImageFallback.test.tsx` (pre-impl label injection) | ❌ Failed as expected | Missing injected aria label (`Fallback-Bild fuer Anbieter`) due to hardcoded fallback label |
| `npx vitest run src/__tests__/scripts/enrich-images.test.ts src/features/providers/__tests__/ProviderImageFallback.test.tsx` | ✅ Passed (7/7) | None |
| `npm run lint` | ✅ Passed with warnings | 57 warnings (pre-existing/unrelated), 0 errors |
| `npm run type-check` | ✅ Passed | None |
| `npx vitest run` | ✅ Passed | 1219 passed, 18 skipped |
| `npx vitest run src/features/providers/__tests__/ProviderImageFallback.test.tsx` (M1b pre-impl) | ❌ Failed as expected | 3 tests failing: `provider-fallback-ornament`, `provider-fallback-logo-mark` testids not found; stock-image testid not found — M1 component still in place |
| `npx vitest run src/features/providers/__tests__/ProviderImageFallback.test.tsx` (M1b post-impl) | ✅ Passed (8/8) | None |
| `npx vitest run` (M1b full suite) | ✅ Passed | 1222 passed, 18 skipped |
| `npm run type-check` (post-M1b) | ✅ Passed | None |
| `npm run lint` (post-M1b) | ✅ Passed | 0 errors, 57 warnings (all pre-existing) |
| `npm run build` | ✅ Passed | Dynamic route warnings (`DYNAMIC_SERVER_USAGE`) emitted but build completed successfully |

## Outstanding Items

- Live Unsplash/Supabase execution of `scripts/enrich-images.ts --curate --write` is pending operator credentials and controlled runtime execution.
- Live dry-run/write staging validation on real provider rows is pending operator execution (`--assign --dry-run` then `--assign --write`).
- **M1b F10 (resolved)**: `stockImageUrl` is intentionally omitted in `ProviderCard` for now. Layer 2 (stock photo) is shown only when a caller explicitly passes the URL. Graceful degradation (mint + ornament + logo mark) is the current default — polished without stock photos. Future: once M3 admin approvals populate `provider_images`, those providers hit the `hasImage=true` path (normal image), not the fallback. The `stockImageUrl` prop remains available for any caller that wants to show a category-representative preview before individual enrichment.
- M4 release/version tasks pending.

## Next Steps

1. Run migration `088_plan_119_image_enrichment_columns.sql` in target Supabase environment.
2. Execute `npm run enrich:images -- --curate --write --per-category 5` with valid `UNSPLASH_ACCESS_KEY`.
3. Execute `npm run enrich:images -- --assign --dry-run` and then `--assign --write` after operator review.
4. Proceed to Code Review then QA for M3 gate validation.
