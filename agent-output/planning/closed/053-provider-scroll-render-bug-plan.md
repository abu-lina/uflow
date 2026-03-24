---
ID: 053
Origin: 053
UUID: e7b3d91a
Status: Released
---

# Plan 053 — Provider scroll render bugfix

**Target Release**: next available patch after current `origin/main` version; confirm at DevOps Stage 1  
**Epic Alignment**: Master Product Objective support through providers discovery reliability and trust-preserving browse UX  
**Status**: Active  
**Related Issues**: None

## Release Strategy

Standalone (no other known active plans targeting this version in `agent-output/planning/`).

Pre-flight note: fetched tags currently extend through `v0.8.21`. The required `origin/main:package.json` version command did not return a version line in this session, while the local workspace `package.json` reports `0.8.7`. DevOps Stage 1 must reconcile the authoritative current development version before selecting the exact next patch number.

## Changelog

| Date (UTC) | Agent | Change | Rationale |
| --- | --- | --- | --- |
| 2026-03-23T21:00Z | planner | Created plan from Analysis 053 | Convert verified RCA into implementation-ready bugfix scope without widening into unrelated performance work |
| 2026-03-23T22:00Z | implementer | Status → In Progress | Implementation started; TDD cycle initiated |
| 2026-03-23T22:15Z | code-reviewer | Status → Code Review Approved | APPROVED: no Critical/High/Medium findings; 2 Low test-hygiene notes, non-blocking |
| 2026-03-23T23:10Z | qa | Status → QA Complete | Targeted regression, full suite, type-check, and delta lint passed; manual browser validation deferred due missing env |
| 2026-03-23T23:30Z | uat | Status → UAT Approved | APPROVED FOR RELEASE: all 5 UAT scenarios pass; value statement delivered; manual browser validation deferred with owner/fallback |
| 2026-03-24T00:00Z | devops | Status → Committed | Stage 1 complete: version bumped to 0.8.22, all docs closed; committed locally for release v0.8.22 |
| 2026-03-24T00:10Z | devops | Status → Released  | Stage 2 complete: tag v0.8.22 pushed; branch pushed to origin; commit 38a3c04 |

## Value Statement and Business Objective

As a service seeker browsing providers, I want provider cards to keep a stable, readable layout no matter how far I scroll, so that I can confidently discover and compare Muslim businesses without broken visuals or blocked actions.

## Context

Analysis 053 verified that the bug is not a generic CSS issue. It is caused by a runtime layout-mode switch in [src/components/providers/SearchResultsList.tsx](src/components/providers/SearchResultsList.tsx) after the accumulated result count crosses the virtualization threshold. The current browse architecture remains aligned with [src/app/(public)/providers/page.tsx](src/app/(public)/providers/page.tsx) and [src/app/(public)/providers/ProvidersContent.tsx](src/app/(public)/providers/ProvidersContent.tsx): server-rendered first page, React Query infinite pagination on the client, and provider-card rendering via [src/components/providers/ProviderCard.tsx](src/components/providers/ProviderCard.tsx).

This plan keeps the value-delivering architecture intact while removing the rendering-path fragility that breaks after 3 to 4 scroll cycles on both desktop and mobile.

## Objective

Eliminate the post-scroll provider-card rendering corruption on `/providers` by restoring a stable rendering contract for long result lists, preserving infinite-scroll behavior, and adding regression coverage for the exact threshold-crossing bug path.

## Decision Record

- [RESOLVED] The bugfix scope is limited to the providers discovery rendering pipeline on `/providers`, because the verified defect lives in list rendering and pagination-trigger behavior rather than in backend search or provider data.
- [RESOLVED] Correctness and layout stability take precedence over virtualization for this fix, because a fast but broken rendering mode directly damages the primary browse journey and user trust.
- [RESOLVED] The server-first initial page and API-backed client pagination introduced by Plan 010 stay in place, because they align with current architecture guidance and are not the source of the defect.
- [RESOLVED] Regression coverage must exercise the client-side threshold-crossing path, because the bug only appears after accumulated client pagination and would not be caught by SSR-only coverage.
- [DEFERRED: DevOps, version divergence requires source-of-truth reconciliation, target release exact patch number confirmed at DevOps Stage 1] Exact release number assignment.
- [DEFERRED: Implementer, low-risk instrumentation only if it fits within bugfix scope and schedule, target release same plan/version] Optional debug telemetry for render-mode and pagination-trigger diagnostics.

## Assumptions

- The verified root cause in Analysis 053 is sufficient to plan implementation without additional analyst experimentation.
- Fixing the rendering contract does not require API shape changes, database migrations, or search-query changes.
- A safe outcome may involve removing, disabling, or restructuring the current virtualization path if it cannot meet the existing responsive card layout requirements.

## Plan

1. Stabilize the rendering contract for long provider result sets
Owner: Implementer

Objective: Remove the current mid-session layout-mode switch that changes the list from responsive grid rendering to a broken fixed-size virtual list after additional pages load.

Acceptance criteria:
- The providers list no longer changes into a different visual layout contract solely because accumulated result count crossed a client-side threshold.
- Desktop and mobile layouts remain visually consistent before and after the 50+ item mark.
- The chosen approach preserves maintainability and keeps the rendering model understandable for future bugfixes.

Dependencies:
- Analysis 053 verified RCA.

2. Fix long-list spacing and stacking behavior at the actual card-size envelope
Owner: Implementer

Objective: Ensure whichever long-list rendering path remains in use allocates enough vertical space for real provider-card content variation, including badges, effects, and action controls.

Acceptance criteria:
- Provider cards do not overlap after repeated pagination on desktop or mobile.
- Category badges, metadata rows, and action controls stay within their card bounds.
- The list layout remains responsive and visually stacked as intended across common breakpoints.

Dependencies:
- Milestone 1.

3. Align pagination triggering with the active scroll container
Owner: Implementer

Objective: Remove the conflicting load-more behavior that allows pagination triggers to fire from an observer that is not aligned with the active scroll mechanics.

Acceptance criteria:
- The active rendering path uses one clear and correct load-more trigger strategy for its scroll context.
- Reaching the long-list path does not cause immediate or cascading page fetches without user scroll intent.
- Infinite scroll remains functional and bounded after the bugfix.

Dependencies:
- Milestone 1.

4. Add bug-path regression coverage and implementation evidence
Owner: Implementer

Objective: Make the threshold-crossing defect visible to automated checks and handoff artifacts so the same class of regression is caught before release.

Acceptance criteria:
- Automated coverage exercises the actual client-side bug path, including the threshold-crossing behavior or equivalent logic boundary that previously triggered the bad render mode.
- Regression naming makes the bug path explicit.
- Bugfix handoff completeness is satisfied for implementation artifacts, evidence, and scope rationale.

Dependencies:
- Milestones 1 through 3.

5. Update release artifacts after DevOps confirms the exact patch version
Owner: DevOps

Objective: Ship the bugfix under the correct next patch release with consistent version metadata and release notes.

Acceptance criteria:
- DevOps Stage 1 confirms the authoritative next patch version with no tag collision.
- Release artifacts are updated consistently for the confirmed patch version.
- The changelog describes the provider scroll rendering fix in user-facing terms.

Dependencies:
- Implementation approved for release.

## Testing Strategy

- Component and logic-level coverage for the providers list rendering boundary and long-list pagination state transitions.
- Integration-level verification that the providers page still supports server-first initial content plus client pagination without layout regression.
- Responsive browser verification focused on desktop and mobile browse flows after repeated scroll pagination.
- Static quality gates for type safety and lint discipline.

## Validation

- `npm run type-check`
- `npm run lint`
- Relevant `vitest` coverage for providers discovery rendering and pagination behavior
- Local browser verification on `/providers` with repeated scroll pagination on desktop and mobile viewport sizes
- UAT confirmation on the real hosted browse page before release handoff

## Risks

- Virtualization may have been added as a performance optimization with incomplete constraints; removing or changing it could alter long-list performance characteristics.
- The current provider-card height varies with content, so any retained size-based list strategy risks future regressions if sizing remains implicit.
- Infinite scroll changes can create duplicate-fetch or stalled-pagination regressions if trigger ownership is not explicit.

## Rollback Considerations

- Roll back the providers-list rendering changes as a single unit if browse pagination or layout stability regresses in UAT.
- Avoid mixing unrelated provider-card UI refactors into this bugfix so rollback remains narrow.
- Preserve the current API pagination contract to keep rollback isolated to the client rendering layer.

## Duration Estimates

- Analysis: complete via Analysis 053
- Planning: 0.5h
- Implementation: 0.5 to 1.5 days
- QA: 0.5 day
- UAT: 0.25 day
- DevOps: 0.25 day

Uncertainty drivers: whether the safest fix is to simplify away virtualization versus retain it with a different rendering contract; how much regression coverage is already present around providers discovery scrolling.

## Handoff Notes

- Use Analysis 053 as the authoritative root-cause reference.
- Keep scope on the `/providers` browse defect; do not expand into generic card redesign or unrelated performance work.
- If implementation reveals that the exact release-number source of truth remains inconsistent, escalate at DevOps Stage 1 rather than guessing the patch version.
