---
ID: 56
Origin: 56
UUID: c4e91a7b
Status: Released
---

# Code Review: 056 — GitHub Actions Supply Chain Remediation

**Plan Reference**: `agent-output/planning/056-gha-supply-chain-remediation-plan.md`
**Implementation Reference**: `agent-output/implementation/056-gha-supply-chain-remediation.md`
**Date**: 2026-03-24
**Reviewer**: Code Reviewer

## Changelog

| Date       | Agent Handoff  | Request               | Summary                                          |
| ---------- | -------------- | --------------------- | ------------------------------------------------ |
| 2026-03-24 | Implementer    | Review SHA-pinning PR | Full review of 7 workflow files + dependabot.yml |
| 2026-03-24 | DevOps | Document closed | Status: Committed |

## Architecture Alignment

**System Architecture Reference**: Supply-chain hardening described in Security Audit `agent-output/security/056-gha-supply-chain-audit.md`

**Alignment Status**: ALIGNED

The implementation matches the architectural intent exactly: workflow-only SHA pinning, no changes to deployment topology, secrets architecture, trigger paths, or application code. The addition of `dependabot.yml` is within scope per Plan Decision 5. The deferred item (replacing `appleboy/*` with native SSH/SCP) remains correctly deferred.

## Independent Verification

The following checks were run independently of the implementation doc's self-reported evidence.

| Check | Command | Result |
| ----- | ------- | ------ |
| Mutable refs remaining | `grep -rnE 'uses:.*@(v[0-9]\|master\|main\b)' .github/workflows/` | **0 matches** |
| SHA-pinned refs total | `grep -rnE 'uses:.*@[a-f0-9]{40}' .github/workflows/` | **43 matches** |
| Diff integrity | `git diff --stat .github/workflows/` | **42 insertions, 42 deletions** (1:1 replacement) |
| SHA format | Manual audit of all 12 action SHAs in the pin reference table | All are 40-character lowercase hex ✅ |
| Version comments | grep confirmed each `@<sha>` is followed by `# vX.Y.Z` | 100% coverage ✅ |
| Deploy path alignment | Cross-checked 5 shared deploy actions across prod/UAT | All 5 match exactly ✅ |

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Concerns**: None — TDD waiver is correctly justified. This PR modifies declarative YAML configuration files only. No application functions, classes, or logic were created or modified. The `uses:` pin substitution is structurally equivalent to a configuration value change, not a behavioral change. Waiver is accepted.

## Checklist Audit Results

### Path Refactor / File-Move Checklist
Not triggered — no files were moved or renamed.

### Agent Spec / Cross-Workspace Path Checklist
Not triggered — no `.github/agents/` files modified; no cross-workspace path references introduced.

### Deployment Path Audit Checklist
**Triggered** — changes touch `deploy-hetzner.yml` and `deploy-uat.yml`.

The implementer documented a deployment path audit table in the implementation doc. I independently verified:
- Searched for `docker run`, `--volume`, `-v` flags in `.github/workflows/`, `scripts/`, `deploy/` — none found (Docker is invoked via GitHub Actions, not raw `docker run` CLI)
- All 5 shared deploy action SHAs are aligned between prod and UAT: `scp-action`, `ssh-action`, `setup-buildx-action`, `login-action`, `build-push-action`
- No missed deployment entrypoints discovered

**Result**: Deployment path audit PASSES.

### Outbound Data-Flow Cross-Trace Checklist
Not triggered — no `router.push()` / `Link href` / API route changes.

### Interaction-Layer Audit Checklist
Not triggered — no CSS `pointer-events`, overlay, or positioning changes.

## Findings

### Critical
None.

### High
None.

### Medium
None.

### Low / Info

**[INFO] Documentation**: Minor occurrence-count discrepancy in implementation doc SHA table

- **Location**: `agent-output/implementation/056-gha-supply-chain-remediation.md` — SHA Pin Reference table
- **Issue**: The SHA table lists `actions/setup-node` as 9 occurrences. Cross-referencing the "Files Modified" table (ci.yml ×4, deploy-uat.yml ×1, snyk-pr-verification.yml ×1, weekly-quality-gates.yml ×4) yields 10. The total of 43 SHA-pinned lines confirmed by terminal grep is correct — the count column for one row is off by 1. This is a documentation artefact with no impact on the remediation itself.
- **Recommendation**: Update the occurrence count for `actions/setup-node` from 9 to 10 in the SHA Pin Reference table. Fix-in-review applied below.

**[INFO] Supply chain**: `@lhci/cli@0.12.x` installed via `npm install -g` in a `run:` step

- **Location**: [.github/workflows/weekly-quality-gates.yml](.github/workflows/weekly-quality-gates.yml#L54)
- **Issue**: `npm install -g @lhci/cli@0.12.x` uses a mutable npm semver range inside a `run:` step. This is outside the scope of the current remediation (which targets `uses:` action references, not `run:` shell commands), but is a related supply chain surface: a compromised or yanked `@lhci/cli` minor version would silently run untrusted code on the runner.
- **Recommendation**: Defer to a future plan scoped to `run:`-step dependency pinning. This is explicitly out of scope for Plan 056 per the plan's scope definition. No action required for this review cycle.

## Fix-in-Review Applied

**F-FIR-001** — Corrected `actions/setup-node` occurrence count from `9` → `10` in the implementation doc SHA Pin Reference table. This is a documentation-only correction (no workflow files changed), under 1 line, zero blast radius.

## Positive Observations

1. **Perfect diff hygiene**: The `git diff --stat` shows exactly 42 insertions and 42 deletions — a pure 1:1 substitution with no accidental whitespace, YAML structure, or comment-block changes introduced. This is the correct implementation pattern for SHA-pinning.

2. **Highest-risk change caught and handled**: `snyk/actions/node@master` was the most dangerous reference (live branch pointer), and it was correctly identified and pinned (`@9adf32b1...`). The `@master` → SHA swap eliminates the entire class of "maintainer pushes to default branch" attacks for this action.

3. **Deploy-path actions prioritized**: Per Plan Decision 3, the deploy workflows (`deploy-hetzner.yml`, `deploy-uat.yml`) were addressed. The five high-privilege actions (SCP, SSH, Docker login, Docker build, Buildx setup) are consistently pinned and aligned across environments.

4. **Version comments 100% present**: Every single `@<sha>` line carries a `# vX.Y.Z` comment. This prevents the "opaque blob of hex strings" anti-pattern that makes SHA-pinned workflows unmaintainable at review time.

5. **Dependabot config is appropriately scoped**: The `dependabot.yml` covers only `github-actions` ecosystem, uses a conservative weekly cadence with a PR cap of 10, and applies consistent `ci` labels. It does not overreach into npm/Docker without justification.

6. **IOC scan gate preserved**: The `supply-chain-ioc-scan` job in `ci.yml` still gates all downstream jobs. The pinning didn't accidentally break that dependency ordering.

## Verdict

**Status**: APPROVED

**Rationale**: The implementation is correct, complete, and safe. Zero mutable action references remain. All 43 SHA pins are valid 40-character hex strings with inline version comments. Workflow structure and deployment behavior are fully preserved (verified by 1:1 diff). The deployment path audit confirms prod/UAT alignment. No CRITICAL, HIGH, or MEDIUM findings. The two INFO-level observations are both out-of-scope or documentation-only; the documentation error was corrected in-review.

## Required Actions

None — implementation is approved as-is (with the documentation fix applied above).

## Next Steps

Handing off to qa agent for test execution.
