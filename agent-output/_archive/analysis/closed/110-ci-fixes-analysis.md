---
ID: 110
Origin: 110
UUID: d7a3e1f9
Status: Planned
---

# 110 — CI Pipeline Failures: Root Cause Analysis

## Changelog

| Date       | Agent   | Action                          | Notes                          |
|------------|---------|---------------------------------|--------------------------------|
| 2026-04-27 | Analyst | Created analysis document       | Investigating 3 reported CI failures |
| 2026-04-27 | Analyst | Updated with CI log evidence    | All 3 findings now L1 Proven from actual CI logs |
| 2026-04-27 | Planner | Status → Planned                | Plan created: agent-output/planning/110-ci-fixes-plan.md |

## Value Statement & Business Objective

Every PR/session branch CI run currently fails, blocking the team's ability to merge code with confidence. Fixing these failures restores the CI quality gate and unblocks all active development sessions.

## Context

- **Reporter**: User reports CI fails on every session/PR branch (session/105, session/106, etc.)
- **Scope**: Three failure signals — (1) dependency-review SHA, (2) perf:check-budgets, (3) "Cloudflare workers"
- **Relevant files**: `.github/workflows/ci.yml`, `.github/workflows/dependency-review.yml`, `scripts/perf/check-budgets.js`, `scripts/perf/budgets.json`
- **CI runs examined**:
  - `24988927114` — Dependency Review on session/106-ummah-search (PR #173) → **failed**
  - `24988927127` — CI Pipeline on session/106-ummah-search (PR #173) → **failed** (Build Verification)
  - `24981722623` — CI Pipeline on session/105-filter-wiring (PR #171) → **failed** (Build Verification)
  - `24981722630` — Dependency Review on session/105-filter-wiring (PR #171) → **failed**
  - `24987027214` — "github_actions in /." Dependabot Updates on main → **failed** (Dependabot updater)

## Methodology

- **Code inspection**: Read all workflow YAMLs, budget script, budgets config
- **Upstream tracing**: Verified dependency-review-action SHA against GitHub releases
- **POC execution**: Tested budget-checker regex parsing locally, attempted local build
- **Exhaustive search**: Searched entire repo for Cloudflare Workers/wrangler references

---

## Findings

### Finding 1: dependency-review-action pinned to non-existent SHA

**Confidence: L1 Proven**

**File**: `.github/workflows/dependency-review.yml` line 33

```yaml
uses: actions/dependency-review-action@4081bf99e2866ebe428571c5e1f4bf24092ce0ff # v4.6.0
```

**Root Cause**: The SHA `4081bf99e2866ebe428571c5e1f4bf24092ce0ff` does not exist in the `actions/dependency-review-action` repository. The actual v4.6.0 release commit SHA is `ce3cf9537a52e8119d91fd484ab5b8a807627bf8` (verified via GitHub releases page — tagged April 1 2025 by @brrygrdn, merge of PR #910).

**Evidence**: The v4.6.0 release page explicitly shows `Commit ce3cf95` with full SHA `ce3cf9537a52e8119d91fd484ab5b8a807627bf8`. The currently-pinned SHA `4081bf99...` is a phantom — likely a transient commit that was force-pushed away, or a copy-paste error from another action.

**Impact**: The `dependency-review` workflow fails immediately with "Unable to resolve action" on every PR that modifies `package.json` or `package-lock.json` (the path filter). This blocks the Dependency Review required check.

**Correct SHA**: `ce3cf9537a52e8119d91fd484ab5b8a807627bf8`

---

### Finding 2: perf:check-budgets exit 1 — `/providers/[provider_id]` exceeds budget

**Confidence: L1 Proven**

**Files**: `.github/workflows/ci.yml` (build job, lines 107-122), `scripts/perf/check-budgets.js`, `scripts/perf/budgets.json`

**Root Cause**: The `/providers/[provider_id]` route's First Load JS is **244.0 kB**, exceeding the budget of **220.0 kB** (110.9%). This triggers `process.exit(1)` in the budget checker.

**CI Log Evidence** (run 24988927127, Build Verification job):
```
📊 Performance Budget Check (Plan 033)

✅ Passing budgets:

   /providers: 328.0 kB / 350.0 kB (93.7%)
   Shared JS: 105.0 kB / 120.0 kB (87.5%)

❌ Budget violations:

   🔴 CRITICAL /providers/[provider_id]: 244.0 kB exceeds 220.0 kB (+10.9%)

Found 1 violation(s). Fix before merging.
```

Same failure confirmed on session/105-filter-wiring (run 24981722623).

**Budgets** (from `scripts/perf/budgets.json`, set during Plan 033):
| Route | Budget Key | Max FirstLoadJS | Actual | Status |
|-------|-----------|-----------------|--------|--------|
| `/providers` | providers | 350 kB | 328 kB (93.7%) | ✅ Pass |
| `/providers/[provider_id]` | providersDetail | 220 kB | 244 kB (110.9%) | ❌ Fail |
| Shared JS | shared | 120 kB | 105 kB (87.5%) | ✅ Pass |

**Why the budget is exceeded**: Feature additions since Plan 033 baseline (badges, endorsements, admin panels, enhanced provider detail) have grown the `/providers/[provider_id]` route by ~24 kB beyond the original 220 kB ceiling.

**Additional structural issue (L1 Proven)**: The CI build step uses `npx next build 2>&1 | tee .next-build-output.txt` which masks `next build`'s exit code (returns `tee`'s exit code 0). The subsequent "Check build output" step only verifies `.next/` exists. A full build failure could be silently swallowed. Currently this weakness is latent — the build succeeds in CI — but it's a ticking time bomb.

---

### Finding 3: "Cloudflare Workers failure" = Dependabot `github_actions` updater crash

**Confidence: L1 Proven**

**Run**: `24987027214` — "github_actions in /. - Update #1338512968" on main

**Root Cause**: This is **not a Cloudflare Workers issue**. The workflow name "github_actions in /." is GitHub's Dependabot ecosystem updater for GitHub Actions dependencies. It failed because the Dependabot updater tried to resolve the same phantom SHA `4081bf99e2866ebe428571c5e1f4bf24092ce0ff` from `dependency-review.yml` and crashed:

```
ERROR <job_1338512968> error: no such commit 4081bf99e2866ebe428571c5e1f4bf24092ce0ff
```

The full stack trace shows `PackageDetailsFetcher#find_container_branch` → `latest_commit_for_pinned_ref` failing because the pinned SHA doesn't exist in the `actions/dependency-review-action` repository. Dependabot cannot determine the update status of a dependency pinned to a non-existent commit.

**Misattribution explanation**: The user saw "github_actions in /." fail and may have interpreted "actions" or the Worker ID in the runner metadata (`Worker ID: {2edc332d-a850-42b4-a29b-3b1bd1f74846}`) as "Cloudflare workers". The actual failure is 100% caused by Finding 1 (the phantom SHA).

**Impact**: Dependabot cannot process GitHub Actions dependency updates for this repository until the SHA is corrected. This blocks automated security patching of action versions.

**Key insight**: **Findings 1 and 3 share the same root cause** — the phantom SHA `4081bf99e2866ebe428571c5e1f4bf24092ce0ff`. Fixing Finding 1 also fixes Finding 3.

---

## Summary of Root Causes

| # | CI Failure | Root Cause | Confidence | Fix Complexity |
|---|-----------|------------|------------|----------------|
| 1 | Dependency Review workflow fails | Phantom SHA `4081bf99...` pinned for `dependency-review-action` — correct SHA is `ce3cf95...` | L1 Proven | One-line fix |
| 2 | Build Verification fails (perf:check-budgets) | `/providers/[provider_id]` route at 244 kB exceeds 220 kB budget | L1 Proven | Update budget or reduce bundle |
| 3 | Dependabot `github_actions` updater fails | Same phantom SHA — Dependabot can't resolve the pinned commit | L1 Proven | Fixed by #1 |

**Key insight**: Findings 1 and 3 share the same root cause. Fixing the SHA resolves both.

---

## System Weaknesses

| # | Weakness | Risk Mechanism | Detection |
|---|----------|---------------|-----------|
| 1 | SHA pins in workflows not verified against upstream tags | A single wrong character makes the action unresolvable; no pre-merge validation exists | CI fails immediately — but the error message ("Unable to resolve action") doesn't say which SHA is wrong |
| 2 | Performance budgets are static with no update workflow | Budgets become stale as features are added; every PR fails budget checks indefinitely until someone manually updates `budgets.json` | Persistent CI failures that the team learns to ignore (alert fatigue) |
| 3 | Pipeline exit code masked by `tee` | Build failures could be silently ignored; budget checker would run against partial output | Silent corruption — the budget step may pass when it shouldn't, or fail for the wrong reason |
| 4 | No structured CI step summary from budget checker | Diagnosing budget failures requires reading raw logs instead of the Actions summary tab | Slow diagnosis cycle |

## Instrumentation Gaps

| # | Gap | Type | Purpose |
|---|-----|------|---------|
| 1 | Budget checker should write to `$GITHUB_STEP_SUMMARY` | Normal | Instant visibility of pass/fail per route in Actions UI |
| 2 | Budget checker should support `--json` output | Normal | Machine-parseable results for CI tooling |
| 3 | Build step should use `set -o pipefail` or `bash` with `pipefail` | Normal | Propagate `next build` exit code through pipe to `tee` |

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Status |
|---|---------|---------|-----------------|--------|
| 1 | ~~Actual bundle sizes in CI~~ | — | Retrieved from CI logs | **Resolved** — 244 kB vs 220 kB budget |
| 2 | ~~What "Cloudflare workers" error was~~ | — | Identified as Dependabot github_actions updater | **Resolved** — same phantom SHA |
| 3 | Whether budgets should be updated or bundles reduced | Product decision | Measure post-fix current sizes, decide target | Open — for Planner |

## Analysis Recommendations

1. **Immediate (unblocks all 3 failures)**: Replace dependency-review SHA `4081bf99e2866ebe428571c5e1f4bf24092ce0ff` → `ce3cf9537a52e8119d91fd484ab5b8a807627bf8`. This fixes Finding 1 and Finding 3.
2. **Immediate (unblocks CI)**: Update `scripts/perf/budgets.json` — raise `providersDetail.max` from `220000` to at least `260000` (244 kB actual + ~6% headroom). Alternatively, investigate what added ~24 kB to the provider detail route since Plan 033 and optimize.
3. **Short-term**: Add `set -o pipefail` to the build step shell to prevent exit-code masking: change the build run step to `shell: bash` with pipefail, or use `bash -o pipefail -c '...'`.
4. **Short-term**: Add `$GITHUB_STEP_SUMMARY` output to `check-budgets.js` for instant CI diagnostics.

## Open Questions

1. Was the phantom SHA `4081bf99...` ever valid, or was it a copy-paste error from initial setup?
2. Should the CI pipeline enforce `pipefail` globally (via `defaults: run: shell: bash` at workflow level)?
3. Are the Plan 033 budgets still the right targets, or should they be re-baselined given feature growth?
