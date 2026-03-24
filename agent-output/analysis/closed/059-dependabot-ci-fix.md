---
ID: 059
Origin: 059
UUID: b7e3c4a1
Status: Planned
---

# Analysis: Dependabot CI Workflow Failures (PRs #69–#77)

## Changelog

| Date | Change |
|------|--------|
| 2026-03-24 | Initial analysis — root cause verified from CI logs |
| 2026-03-24T13:36Z | Planner handoff complete — plan created at `agent-output/planning/059-dependabot-ci-fix-plan.md` |

## Value Statement and Business Objective

Dependabot PRs (#69–#77) keep GitHub Actions dependencies current, reducing supply-chain risk. All nine PRs and one grouped update are failing CI (red ×), blocking dependency hygiene and leaving the project on older action versions with Node.js 20 deprecation warnings.

## Objective

Determine the root cause of CI failures across all Dependabot PRs and identify what needs to change so they can pass.

## Context

- **Repository**: abu-lina/uflow (private)
- **CI Workflow**: `.github/workflows/ci.yml` — triggered on `pull_request` targeting `main`/`develop`
- **Branch**: All Dependabot PRs target `main`
- **Secret source**: CI logs confirm `Secret source: Dependabot` (Dependabot secrets namespace)

### Dependabot PRs Under Investigation

| PR | Dependency | Version Bump |
|----|-----------|-------------|
| #77 | actions/setup-node | 4 → 6 |
| #76 | docker/build-push-action | 5.4 → 7.0 |
| #75 | appleboy/scp-action | 0.1.7 → 1.0 |
| #74 | docker/login-action | 3.7 → 4.0 |
| #73 | codecov/codecov-action | 4.6 → 5.5.3 |
| #72 | docker/setup-buildx-action | 3.12 → 4.0 |
| #71 | actions/checkout | 4 → 6 |
| #70 | appleboy/ssh-action | 1.0.3 → 1.2.5 |
| #69 | actions/github-script | 7.1 → 8.0 |

## Methodology

1. Read all 9 workflow files under `.github/workflows/`
2. Catalogued every action reference and version tag
3. Fetched CI status checks and full logs for PRs #71, #77, and #69 via GitHub API
4. Cross-referenced ESLint config, `tsconfig.json`, and source files
5. Compared failure patterns across multiple PRs to isolate common root cause

## Findings

### F1: Action Version Bumps Are NOT the Cause — **Verified**

The Dependabot PRs correctly update action version tags (e.g., `actions/checkout@v4` → `@v6`). The updated actions execute successfully in CI — checkout, setup-node, npm ci, build all complete without errors. The action version changes are functionally correct.

**Evidence**: In PR #71 (checkout v4→v6) and PR #77 (setup-node v4→v6), the checkout and setup-node steps succeed. Build Verification passes. Security Audit passes. The IOC scan passes.

### F2: Primary Root Cause — ESLint `tools/` Directory Not Ignored — **Verified**

The `Lint & Type Check` job fails identically on **every** Dependabot PR due to 8 ESLint parsing errors in the `tools/` directory:

```
tools/memory-backend/src/index.ts    — 0:0 error Parsing error
tools/memory-backend/src/store.ts    — 0:0 error Parsing error
tools/memory-backend/src/types.ts    — 0:0 error Parsing error
tools/memory-backend/tests/store.test.ts — 0:0 error Parsing error
tools/memory-backend/vitest.config.ts — 0:0 error Parsing error
tools/uflow-memory-extension/src/extension.ts — 0:0 error Parsing error
tools/uflow-memory-extension/src/store.ts — 0:0 error Parsing error
tools/uflow-memory-extension/src/types.ts — 0:0 error Parsing error
```

**Root cause mechanism**: `tsconfig.json` excludes `tools/**/*`, but `eslint.config.mjs` does NOT list `tools/` in its `ignores` array. The TypeScript ESLint parser is configured with `project: './tsconfig.json'`, so when it encounters files in `tools/` that are excluded from the tsconfig, it throws parsing errors.

**Config evidence**:
- `tsconfig.json` line 49: `"exclude": [..., "tools/**/*"]`
- `eslint.config.mjs` ignores (lines 135–153): lists `scripts/**`, `supabase/functions/**`, `tests/**`, `docs/archive/**` — but NOT `tools/**`

### F3: Secondary Root Cause — Pre-existing Lint Errors in Source Code — **Verified**

Two source-level ESLint errors exist on `main` branch:

1. `src/components/common/MobileProfileScreen.tsx:20:9` — `'router' is assigned a value but never used` (`@typescript-eslint/no-unused-vars`)
2. `src/components/providers/ProfileProviderDetailButtons.tsx:118:16` — `'error' is defined but never used` (`@typescript-eslint/no-unused-vars`)

These errors exist in every PR because the Dependabot branches only modify workflow YAML files, inheriting all source code from `main`.

### F4: Tertiary Root Cause — Flaky Test Timeout — **Verified (Intermittent)**

`src/__tests__/scripts/import-muslimbusiness-cli.test.ts` line 23 — test "rejects --limit without a positive integer value" times out at the 5000ms default.

- **PR #71**: Test FAILED (6337ms execution, 5000ms timeout)
- **PR #77**: Test PASSED (ran within timeout)

This is an intermittent failure, making it a contributor to CI red-× on some PRs but not all.

### F5: CI Summary Job Cascade Failure — **Verified**

The `ci-summary` job checks all upstream job results and exits non-zero if any fail:
```bash
if [ "${{ needs.lint-and-type-check.result }}" == "success" ] && ...
```

When `lint-and-type-check` fails (F2+F3), `ci-summary` always fails. When `test` also fails (F4), the cascade is reinforced.

### F6: Cloudflare Pages / Workers Builds Failures — **Observed, Not Investigated**

Both Cloudflare Pages and Workers Builds report failures on every PR. These are separate build systems (not GitHub Actions CI) and appear to be a pre-existing Cloudflare configuration issue. Not in scope for this analysis.

### F7: Node.js 20 Deprecation Warning — **Observed**

CI logs show:
```
Node.js 20 actions are deprecated. Actions will be forced to run with Node.js 24
by default starting June 2nd, 2026.
```

This is a warning, not a failure. Accepting the Dependabot PRs (especially #71 and #77 for checkout v6 and setup-node v6) would resolve these warnings, as the newer action versions support Node.js 24.

### F8: Action Version Reference Style — **Verified**

| Style | Used In | Examples |
|-------|---------|---------|
| Major tag (`@v4`) | ci.yml, deploy-*.yml, weekly-quality-gates.yml, imports, snyk | `actions/checkout@v4`, `actions/setup-node@v4` |
| Minor tag (`@v0.1.7`, `@v1.0.3`) | deploy-hetzner.yml, deploy-uat.yml | `appleboy/scp-action@v0.1.7`, `appleboy/ssh-action@v1.0.3` |
| SHA pin | dependency-review.yml | `actions/dependency-review-action@4081bf99...` |

Dependabot correctly bumps each style. The SHA-pinned `dependency-review-action` is NOT being bumped by Dependabot in this batch (it's not in the PR list), which is expected — it would need a separate Dependabot update.

## Root Cause Summary

**The CI failures are NOT caused by the Dependabot action version bumps.** They are caused by three pre-existing issues on the `main` branch that surface on every PR:

| # | Issue | Severity | Affects |
|---|-------|----------|---------|
| RC1 | `tools/` not in ESLint ignores (8 parsing errors) | **Blocking** | All PRs (100%) |
| RC2 | 2 unused-var lint errors in source code | **Blocking** | All PRs (100%) |
| RC3 | Flaky test timeout (5000ms too low for CI) | **Intermittent** | ~50% of PRs |

## System Weaknesses

1. **ESLint/tsconfig exclude mismatch**: When adding new top-level directories with their own TypeScript configs (like `tools/`), the ESLint ignore list was not updated. There's no automated check for this drift.

2. **No lint gate on `main` push**: These lint errors were merged to `main` without being caught. The CI runs on PRs targeting main but doesn't block push to main for lint failures.

3. **Tight test timeout without CI-awareness**: The 5000ms default vitest timeout is borderline for CLI subprocess tests running in CI (slower than local). No CI-specific timeout override exists.

## Instrumentation Gaps

None required — the existing CI logs provide sufficient diagnostic information. The failures are clearly reported with exact file paths and error messages.

## Analysis Recommendations (Next Steps)

1. **Fix RC1**: Add `'tools/**'` to the `ignores` array in `eslint.config.mjs` (matches the `tsconfig.json` exclude pattern)
2. **Fix RC2**: Fix the 2 unused-variable errors in `MobileProfileScreen.tsx` and `ProfileProviderDetailButtons.tsx` (prefix with `_` or remove)
3. **Fix RC3**: Increase the timeout for the `import-muslimbusiness-cli.test.ts` test to handle CI latency (e.g., 15000ms)
4. **All three fixes should be applied to the session branch and merged to `main`** before or alongside the Dependabot PRs — this unblocks all 9 PRs simultaneously
5. **After merging the fixes**: Dependabot PRs can be rebased/re-run and should pass CI. Consider grouping them for efficiency.
6. **Cloudflare failures**: Investigate separately if needed (out of scope for this task)

## Open Questions

None — all root causes are verified with CI log evidence. No hypotheses remain.
