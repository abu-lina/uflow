---
ID: 110
Origin: 110
UUID: d7a3e1f9
Status: Committed
---

# Plan 110 — CI Pipeline Fixes

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Plan ID        | 110                                                                   |
| Target Release | v0.10.37 (patch — CI infrastructure only, no user-facing changes)     |
| Epic Alignment | Developer Experience / CI Reliability                                 |
| Related Issues | None (GitHub issue to be created with this plan)                      |
| Classification | Bugfix                                                                |
| Pipeline       | Focused                                                               |
| GitHub Issue   | (populated after creation)                                            |
| Created        | 2026-04-27T16:01Z                                                     |

## Changelog

| Date                | Agent   | Action                        | Notes                                             |
|---------------------|---------|-------------------------------|-------------------------------------------------  |
| 2026-04-27T16:01Z   | Planner | Created plan document         | Addresses critique CRITICAL-1, MEDIUM-1, MEDIUM-2, LOW-2 |
| 2026-04-27T16:04Z   | Implementer | Status → In Progress      | Implementation started for milestones M1-M3 |
| 2026-04-27T16:23Z   | Code Reviewer | Status → Code Review Approved | No blocking findings; approved with comments for scope hygiene |
| 2026-04-27T16:35Z   | QA | Status → QA In Progress | All local test gates passed (lint/type-check/vitest); pending remote CI validation |
| 2026-04-27T16:40Z   | UAT | Status → UAT Complete | Value delivery verified; CONDITIONAL APPROVAL pending DF-1 (remote CI validation) |
| 2026-04-27T16:45Z   | DevOps | Status → Committed | Stage 1 complete; version bump v0.10.36→v0.10.37 (collision); rebased 2 commits; local commit pending push |

## Value Statement and Business Objective

**"As a developer, I want CI pipelines to pass on session/PR branches, so that I can merge code with confidence and receive automated dependency security updates."**

Every PR/session branch CI run currently fails (confirmed on session/105, session/106). This blocks the team's ability to merge code and prevents Dependabot from processing GitHub Actions dependency updates. Fixing these failures restores the CI quality gate and unblocks all active development sessions.

## Analysis Reference

[agent-output/analysis/110-ci-fixes-analysis.md](../analysis/110-ci-fixes-analysis.md) — All three findings are **L1 Proven** from CI run logs.

## Scope

| # | Item | Files Touched | Complexity |
|---|------|--------------|------------|
| 1 | Fix dependency-review SHA | `.github/workflows/dependency-review.yml` | One-line replacement |
| 2 | Update performance budget | `scripts/perf/budgets.json` | One value change |
| 3 | Add pipefail to build step | `.github/workflows/ci.yml` | One-line addition |

**Boundary**: CI infrastructure files only. No application code, no database changes, no new dependencies.

## Release Strategy

Standalone — no other known plans target v0.10.36.

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Budget fix approach: raise the `providersDetail` ceiling to 260,000 bytes (244 kB actual + ~6% headroom) rather than optimizing the bundle | [RESOLVED] — Bundle optimization is a separate effort; the Plan 033 budget is stale from organic feature growth (badges, endorsements, admin panels). Re-baselining is the correct immediate action. |
| D2 | Use the verified v4.6.0 SHA `ce3cf9537a52e8119d91fd484ab5b8a807627bf8` rather than upgrading to a newer version | [RESOLVED] — Minimizes scope; version upgrades are Dependabot's responsibility once the SHA is fixed and Dependabot can process updates again. |
| D3 | Add `pipefail` only to the build step, not workflow-wide `defaults` | [RESOLVED] — Scoped change reduces blast radius; workflow-wide pipefail can be a follow-up if the team adopts it as a standard. |
| D4 | No version bump needed for CI-only changes (no application code) | [DEFERRED: DevOps — confirm at Stage 1 whether a patch tag is warranted for CI-only fixes or if this merges without a version bump] |

## Milestones

### M1: Fix Dependency-Review SHA (unblocks Findings 1 + 3)

**Objective**: Replace the phantom commit SHA in `dependency-review.yml` with the verified v4.6.0 release SHA.

**Where**: `.github/workflows/dependency-review.yml`, line 33

**What**: Replace SHA `4081bf99e2866ebe428571c5e1f4bf24092ce0ff` → `ce3cf9537a52e8119d91fd484ab5b8a807627bf8`

**Acceptance**:
- The Dependency Review workflow resolves the action without error
- Dependabot `github_actions` updater can process dependency-review-action (Finding 3 resolved as a side-effect)

### M2: Update Performance Budget (unblocks Finding 2)

**Objective**: Raise the `/providers/[provider_id]` First Load JS budget ceiling to accommodate current bundle size.

**Where**: `scripts/perf/budgets.json` → `thresholds.firstLoadJS.providersDetail.max`

**What**: Change value from `220000` to `260000`

**Acceptance**:
- `npm run perf:check-budgets` passes against a current build
- All three budget checks pass (providers at 328/350 kB, detail at 244/260 kB, shared at 105/120 kB)

### M3: Harden Build Step with pipefail

**Objective**: Prevent `next build` exit code from being masked by `tee` piping.

**Where**: `.github/workflows/ci.yml`, build job → "Build application" step

**What**: Add `shell: bash` with `set -o pipefail` so that a non-zero exit from `next build` propagates through the pipe to `tee`

**Acceptance**:
- Build step uses `bash` shell with pipefail
- A simulated build failure would cause the step to fail (verifiable by code inspection)

### M4: Update Version and Release Artifacts

**Objective**: Update CHANGELOG and version artifacts if DevOps confirms a version bump is warranted (see D4).

**Where**: `CHANGELOG.md`, potentially `package.json`

**What**: Add entry documenting the CI fixes. Version bump only if DevOps Stage 1 confirms.

**Acceptance**:
- CHANGELOG entry describes all three fixes
- Version artifacts consistent if bumped

## Verification

- Push branch and observe CI Pipeline and Dependency Review workflows pass on the PR
- Confirm Dependabot `github_actions` updater no longer crashes (may require waiting for next scheduled run)
- Confirm budget checker output in CI logs shows all routes passing

## Duration Estimates

| Phase | Estimate | Uncertainty |
|-------|----------|-------------|
| Implementation (M1–M3) | 15–30 minutes | Low — all changes are one-liners with known values |
| CI Verification | 10–15 minutes | Low — standard CI run time |
| DevOps (M4) | 10–15 minutes | Low — CHANGELOG + optional version bump |
| **Total** | **35–60 minutes** | Low overall |

## Risks and Rollback

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| The v4.6.0 SHA `ce3cf95...` becomes stale if upstream force-pushes | Very Low | Same failure mode returns | Dependabot will propose SHA updates once it can process the action again |
| Budget ceiling raise permanently accepts larger bundles | Low | Marginal performance regression | 260 kB is ~6% above current actual (244 kB); bundle optimization can be a separate plan if growth continues |
| pipefail change breaks another step sharing the build job | Very Low | Build job fails | pipefail is scoped to one step only (D3); other steps use default shell |

**Rollback**: `git revert` the merge commit. CI returns to current (broken) state — no worse than today. All changes are additive/corrective with no destructive side-effects.

## Testing Strategy

- **Unit tests**: Not applicable — no application code changes
- **Integration**: CI pipeline itself is the integration test — push to PR branch and observe all workflows pass
- **Regression**: Verify that passing routes (`/providers`, shared JS) remain within budget after the change

## Open Questions

All resolved. No blocking open questions remain.

Analysis open questions acknowledged:
1. *Was the phantom SHA ever valid?* — Informational only, does not block implementation.
2. *Should CI enforce pipefail globally?* — Addressed by D3 (scoped to build step).
3. *Are Plan 033 budgets still the right targets?* — Addressed by D1 (raise ceiling, defer optimization).
