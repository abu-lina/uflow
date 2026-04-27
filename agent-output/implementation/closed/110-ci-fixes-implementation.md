---
ID: 110
Origin: 110
UUID: d7a3e1f9
Status: Released
---

# Plan 110 Implementation — CI Pipeline Fixes

## Plan Reference

- Plan: `agent-output/planning/110-ci-fixes-plan.md`
- Analysis: `agent-output/analysis/closed/110-ci-fixes-analysis.md`

## Date

- 2026-04-27T16:20Z (UTC)

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-27T16:20Z | Planner -> Implementer | Implement Plan 110 M1-M3 | Applied CI fixes for SHA, perf budget threshold, and pipefail; executed validation commands |
| 2026-04-27T16:45Z | DevOps | Status → Committed | Stage 1 local commit — all docs moving to closed/ |

## Implementation Summary

Implemented all planned CI fixes for Plan 110:

1. M1: Replaced phantom `dependency-review-action` SHA with verified v4.6.0 commit.
2. M2: Increased `providersDetail` performance budget threshold from 220000 to 260000 bytes.
3. M3: Added `bash` + `set -o pipefail` for the build step to ensure `next build` failures are not masked by `tee`.

Additional minimal lint-gate support changes were made to remove local lint errors that blocked mandatory pre-handoff checks.

## Milestones Completed

- [x] M1: Fix Dependency-Review SHA
- [x] M2: Update Performance Budget
- [x] M3: Harden Build Step with pipefail
- [ ] M4: Update Version/Release Artifacts (DevOps Stage 1 decision per D4)

## Files Modified

| Path | Change Summary | Approx. Lines |
|------|----------------|---------------|
| `.github/workflows/dependency-review.yml` | Updated pinned `actions/dependency-review-action` SHA to `ce3cf9537a52e8119d91fd484ab5b8a807627bf8` | 1 |
| `scripts/perf/budgets.json` | Updated `thresholds.firstLoadJS.providersDetail.max` from `220000` to `260000` | 1 |
| `.github/workflows/ci.yml` | Added `shell: bash` + `set -o pipefail` to Build step pipeline command | 2 |
| `src/components/providers/ProvidersPageHeader.tsx` | Removed unused destructured `onCategoryChange` prop (lint gate support) | 1 |
| `src/features/search/components/FigmaSearchBar.tsx` | Reordered button props to satisfy `react/jsx-sort-props` callback ordering (lint gate support) | 4 |
| `agent-output/planning/110-ci-fixes-plan.md` | Status set to `In Progress`; changelog entry added for implementation start | 2 |

## Files Created

| Path | Purpose |
|------|---------|
| `agent-output/implementation/110-ci-fixes-implementation.md` | Implementation evidence, validation outputs, and handoff notes |

## Deployment Path Audit

- N/A — No deployment workflows/scripts/infra surfaces changed (no `deploy-*`, Dockerfile, nginx, or runtime env wiring changes).

## Code Quality Validation

- [x] `npm run lint` completed with **0 errors** (warnings remain pre-existing and non-blocking)
- [x] `npm run type-check` completed successfully
- [x] `npx vitest run` completed successfully
- [ ] `npm run build` completed successfully
  - Blocked locally by missing required env vars (first failing var: `NEXT_PUBLIC_SUPABASE_URL`) during page-data collection

## Value Statement Validation

Original value statement:

"As a developer, I want CI pipelines to pass on session/PR branches, so that I can merge code with confidence and receive automated dependency security updates."

Implementation delivery:

- Dependency Review now references a valid commit SHA, removing the immediate "Unable to resolve action" failure path.
- Performance budget threshold now matches validated CI baseline plus headroom, removing deterministic failure for `/providers/[provider_id]`.
- Build step now correctly propagates failure exit codes through the build-output pipeline, preventing false positives.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|---------------------|-------------------|----------------|------------------|
| N/A (configuration-only bugfix; no new function/class introduced) | N/A | N/A | ✅ Yes | Proven CI failures from runs `24988927114` (dependency-review SHA) and `24988927127` (perf budget threshold) | ⏳ Pending remote CI rerun |

## Test Coverage

- Unit tests: Existing project suite executed (`npx vitest run`)
- Integration tests: Existing project suite executed (`npx vitest run`)
- CI behavior validation: Pending branch CI rerun after push

## Test Execution Results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run lint` | ✅ Pass (exit 0) | 58 warnings, 0 errors |
| `npm run type-check` | ✅ Pass (exit 0) | `tsc --noEmit` successful |
| `npx vitest run` | ✅ Pass (exit 0) | 131 test files passed, 1 skipped; 1123 tests passed, 18 skipped |
| `npm run build` | ⚠️ Blocked | Local env missing required variables (`NEXT_PUBLIC_SUPABASE_URL`) |

## Compliance and Gate Notes

- Open Question Gate: No unresolved `OPEN QUESTION` items in plan.
- API Route Coverage Gate: N/A (no route handler changes).
- Search/Filter Client-Interaction Trace: N/A (no submit-handler/action wiring changes).
- Multi-Plan State Audit: N/A (no client-state semantics changes).
- Local Verification Gate: N/A (no user-visible UI/CSS/interaction changes).
- Interaction-Layer Audit: N/A.
- Post-UAT Delta Review: N/A.

## Outstanding Items

1. Re-run branch CI after push to confirm remote workflow success for:
   - Dependency Review workflow
   - CI Pipeline build job "Check performance budgets"
2. DevOps Stage 1 decision for D4 (whether CI-only patch receives version bump/tag).
3. Local `npm run build` remains blocked without full required env set.

## Next Steps

1. Code Reviewer: validate implementation scope and quality.
2. QA: run full gate on branch CI after push.
3. DevOps: handle M4 per Stage 1 version decision.
