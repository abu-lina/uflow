---
ID: 011
Origin: 011
UUID: 3c8f1d7a
Status: Committed
---

# Implementation: Plan 011 — Repo Structure Refactor

## Plan Reference

- Plan: [agent-output/planning/011-repo-structure-refactor-v0.6.0.md](../planning/011-repo-structure-refactor-v0.6.0.md)
- Architecture: [agent-output/architecture/011-repo-structure-architecture-findings.md](../architecture/011-repo-structure-architecture-findings.md)
- Critique: [agent-output/critiques/011-repo-structure-refactor-critique.md](../critiques/011-repo-structure-refactor-critique.md)

## Date

2026-02-23

## Changelog

| Date | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-23T08:15Z | Critic → Implementer | Implement Plan 011 | All 5 milestones completed; 0 regressions |

## Implementation Summary

Delivered the repo-structure cleanup defined in Plan 011:

1. **Confirmed migration authority** (M1): Audited all deploy scripts and CI workflows. `sql/migrations/` is NOT executed in any automated pipeline — it's referenced only in manual docs. `supabase/migrations/` is the sole authoritative source.

2. **Consolidated scripts** (M2): Moved `language-detection-test.ts` and `transformSvg.ts` from `src/scripts/` to root `scripts/`. Removed the empty `src/scripts/` directory. Fixed stale `tsconfig.json` reference to non-existent `bundle-icons.mts`. Updated import path in `transformSvg.ts`.

3. **Clarified SQL folder purpose** (M3): Rewrote `sql/README.md` header with a prominent notice that `supabase/migrations/` is authoritative and `sql/` is reference-only. Created `scripts/README.md` describing what belongs (and doesn't) in the scripts folder.

4. **Documented folder responsibilities** (M4, addressing Critic F1+F2): Created `src/components/README.md`, `src/features/README.md`, and `docs/guides/PLACEMENT_RUBRIC.md`. The placement rubric covers 18 file categories (exceeding the F1 recommendation of ≥6). Updated `.github/copilot-instructions.md` to reference the rubric, distinguish shared vs domain UI, and document migration/script authority rules.

5. **CHANGELOG entry** (M5): Added `[Unreleased]` section for Plan 011 with Changed/Added/Developer Notes sections. Included semver rationale per Critic F3.

**How this delivers the Value Statement**: Contributors now have a single, concrete answer to "where should I add this file?" via the placement rubric, folder READMEs, and updated copilot instructions. The script and migration authority confusion is eliminated.

## Milestones Completed

- [x] M1: Confirm DB migration authority
- [x] M2: Consolidate scripts (remove `src/scripts/`)
- [x] M3: Clarify SQL folder purpose
- [x] M4: Document and reinforce folder responsibilities
- [x] M5: Update CHANGELOG

## Critic Findings Addressed

| Finding | Severity | Action Taken |
| --- | --- | --- |
| F1: M4 acceptance criteria too vague | MEDIUM | Placement rubric covers 18 categories (exceeds ≥6 requirement) |
| F2: Copilot instructions update missing | MEDIUM | Updated `.github/copilot-instructions.md` with placement rubric link + domain-UI migration guidance |
| F3: Semver rationale missing | MEDIUM | Added "Developer Notes" in CHANGELOG explaining minor-bump rationale |
| F4: Root markdown clutter not acknowledged | LOW | Noted as out-of-scope in plan; no action needed |
| F5: Planner chatmode file missing | LOW | Process note only; no action needed |

## Files Modified

| Path | Changes | Lines |
| --- | --- | --- |
| `tsconfig.json` | Removed stale `src/scripts/bundle-icons.mts` include | 1 |
| `scripts/transformSvg.ts` | Updated import path from `../utils/` to `../src/utils/` | 1 |
| `sql/README.md` | Rewrote header to clarify non-authoritative status | ~15 |
| `.github/copilot-instructions.md` | Updated folder structure section with rubric link, domain-UI direction, migration/script rules | ~15 |
| `CHANGELOG.md` | Added `[Unreleased]` Plan 011 section | ~18 |
| `agent-output/planning/011-repo-structure-refactor-v0.6.0.md` | Status → In Progress, added changelog entry | 2 |

## Files Created

| Path | Purpose |
| --- | --- |
| `scripts/README.md` | Describes scripts folder responsibility; states scripts are not runtime modules |
| `src/components/README.md` | Clarifies shared-only UI scope; identifies legacy domain folders; links to placement rubric |
| `src/features/README.md` | Describes feature-module intent; shows structure convention |
| `docs/guides/PLACEMENT_RUBRIC.md` | 18-category decision table for "where should I add this file?" |

## Files Moved

| From | To | Reason |
| --- | --- | --- |
| `src/scripts/language-detection-test.ts` | `scripts/language-detection-test.ts` | Consolidate into single scripts location |
| `src/scripts/transformSvg.ts` | `scripts/transformSvg.ts` | Consolidate into single scripts location |

## Files Deleted

| Path | Reason |
| --- | --- |
| `src/scripts/` (directory) | Empty after moves; eliminated to prevent re-accumulation |

## Code Quality Validation

- [x] `npm run type-check` — exits 0 (no errors)
- [x] `npm run lint:check` — pre-existing 6820 errors in untouched files (e.g., `public/fallback-development.js`); 0 new errors from Plan 011 changes
- [x] `npm test` (`vitest run`) — 147 passed, 18 skipped, 0 failures
- [x] `npm run build` — exits 0; production build succeeds

## Value Statement Validation

**Original**: As a contributor, I want a predictable repository structure with clear folder responsibilities, so that I can ship features quickly with lower regression risk and less time spent hunting code.

**Delivered**: Contributors now have:
- A single, concrete placement rubric covering 18 file categories
- Folder READMEs at the three key decision points (`components/`, `features/`, `scripts/`)
- Updated copilot instructions (the primary AI/contributor reference) with domain-UI migration direction
- Eliminated script location ambiguity (one folder, one purpose)
- Eliminated migration authority ambiguity (explicit "authoritative" vs "reference" labelling)

## TDD Compliance

This plan involved **no new functions or classes** — only file moves, documentation, and configuration cleanup. TDD is not applicable for this implementation.

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| N/A — docs + moves only | N/A | N/A | N/A | N/A | N/A |

## Test Coverage

- **Unit/Component**: 147 tests passing (existing suite; no new tests needed for doc-only changes)
- **Integration**: N/A (no runtime behavior changes)
- **Regression**: Type-check + build confirm no import breakage from file moves

## Test Execution Results

| Command | Result | Issues | Coverage |
| --- | --- | --- | --- |
| `npx tsc --noEmit` | Exit 0 | None | N/A |
| `npx eslint . --max-warnings 0` | 6820 pre-existing errors; 0 new | None introduced | N/A |
| `npx vitest run` | 147 passed, 18 skipped | None | Existing |
| `npm run build` | Exit 0 | None | N/A |

## Outstanding Items

- **Roadmap update**: Roadmap agent should add Plan 011 to the v0.6.0 release batch.
- **Version bump**: DevOps should bump `package.json` version to `0.6.0` at release time (not per-plan).
- **Pre-existing lint debt**: 6820 ESLint errors exist in files not touched by this plan (primarily `public/fallback-development.js`). These are not regressions.

## Assumptions Documented

| Assumption | Rationale | Risk | Validation |
| --- | --- | --- | --- |
| `sql/migrations/` is not executed in CI/CD | Grep of `.github/workflows/` returned 0 hits; README says "copy-paste in SQL Editor" | Low — could change if someone adds a script | Milestone 1 audit evidence |
| `src/scripts/` files are dev-only utilities | Neither file is imported in `src/` runtime code | Very low | tsconfig excludes `scripts/**/*.ts`; build passes |

## Next Steps

1. **Code Review** (⑥ Code Reviewer) — verify the changes are correct and complete
2. **QA** — validate against plan acceptance criteria
3. **DevOps** — commit, version bump, and release as part of v0.6.0
