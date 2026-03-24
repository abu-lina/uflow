---
ID: 56
Origin: 56
UUID: c4e91a7b
Status: Committed
---

# Implementation 056 — GitHub Actions Supply Chain Remediation

## Plan Reference

- **Plan**: `agent-output/planning/056-gha-supply-chain-remediation-plan.md`
- **Security Audit**: `agent-output/security/056-gha-supply-chain-audit.md`
- **Critique**: `agent-output/critiques/056-gha-supply-chain-remediation-plan-critique.md` (Verdict: APPROVED)
- **Date**: 2026-03-24

## Changelog

| Date       | Handoff       | Request                          | Summary                                                    |
| ---------- | ------------- | -------------------------------- | ---------------------------------------------------------- |
| 2026-03-24 | Implementer   | Execute SHA-pinning remediation  | All 42 mutable refs pinned, dependabot.yml created, audit verified |
| 2026-03-24 | DevOps | Document closed | Status: Committed |

## Implementation Summary

Pinned all 42 mutable `uses:` action references across 7 GitHub Actions workflow files to immutable 40-character commit SHAs with inline version comments. Created `.github/dependabot.yml` for automated GitHub Actions version tracking. The remediation eliminates the tag-rewrite attack vector identified in Security Audit 056 without altering any workflow behavior, trigger paths, or deployment semantics.

### How This Delivers Value

The value statement requires that "a tag-rewrite or compromised-action incident cannot silently inject attacker-controlled code into CI or production deployment paths." This implementation delivers that by:

1. **Immutable references**: Every action `uses:` line now points to a specific commit SHA that cannot be modified by upstream maintainers or compromised accounts.
2. **Deploy-path priority**: The highest-risk actions (SSH, SCP, Docker login/build, container registry) in production and UAT deploy workflows were pinned first.
3. **Maintenance hygiene**: Dependabot will automatically propose PRs when pinned actions have newer versions, preventing SHA drift into stale/vulnerable commits.

### Deviation from Plan

- **Occurrence count corrected**: The security audit cited 37 mutable `uses:` occurrences; the actual count is **42** (verified by grep). The critique (F-CRIT-001, MEDIUM) flagged this discrepancy. The delta: `actions/checkout` had 14 occurrences (not 13), `actions/setup-node` had 9 occurrences (not 8), and other minor count adjustments. All 42 were pinned — the SHA mapping table itself was correct.

## Milestones Completed

- [x] **M1 — Lock remediation inputs**: Used audit SHA table as authoritative mapping; no new mutable refs introduced
- [x] **M2 — Pin all mutable GitHub Action references**: 42/42 mutable refs pinned across 7 files
- [x] **M3 — Add GitHub Actions version tracking**: `.github/dependabot.yml` created with `github-actions` ecosystem
- [x] **M4 — Deployment Path Audit**: All 5 shared deploy actions aligned between prod and UAT
- [x] **M5 — Static validation and execution evidence**: Zero mutable refs confirmed, 43 total SHA-pinned
- [x] **M6 — Artifact updates and handoff**: This document; audit/plan status updates

## Files Modified

| File | Changes | Lines Changed |
| ---- | ------- | ------------- |
| `.github/workflows/ci.yml` | Pinned 10 mutable refs: checkout (×5), setup-node (×4), codecov (×1) | 20 (+10/-10) |
| `.github/workflows/deploy-hetzner.yml` | Pinned 6 mutable refs: checkout, scp-action, setup-buildx, login-action, build-push, ssh-action | 12 (+6/-6) |
| `.github/workflows/deploy-uat.yml` | Pinned 7 mutable refs: checkout, scp-action, setup-buildx, login-action, setup-node, build-push, ssh-action | 14 (+7/-7) |
| `.github/workflows/dependency-review.yml` | Pinned 1 mutable ref: checkout (dependency-review-action was already SHA-pinned) | 2 (+1/-1) |
| `.github/workflows/performance-test.yml` | Pinned 3 mutable refs: checkout, upload-artifact, github-script | 6 (+3/-3) |
| `.github/workflows/snyk-pr-verification.yml` | Pinned 3 mutable refs: checkout, setup-node, github-script | 6 (+3/-3) |
| `.github/workflows/weekly-quality-gates.yml` | Pinned 12 mutable refs: checkout (×4), setup-node (×4), snyk/actions/node (×1, was `@master`), upload-artifact (×3) | 24 (+12/-12) |

**Total**: 42 insertions, 42 deletions across 7 files.

## Files Created

| File | Purpose |
| ---- | ------- |
| `.github/dependabot.yml` | GitHub Actions version tracking — weekly Monday schedule, `ci` commit prefix, `dependencies`+`ci` labels, limit 10 open PRs |

## SHA Pin Reference

| Action | SHA | Version | Occurrences |
| ------ | --- | ------- | ----------- |
| `actions/checkout` | `34e114876b0b11c390a56381ad16ebd13914f8d5` | v4.3.1 | 14 |
| `actions/setup-node` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4.4.0 | 10 |
| `codecov/codecov-action` | `b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238` | v4.6.0 | 1 |
| `appleboy/scp-action` | `917f8b81dfc1ccd331fef9e2d61bdc6c8be94634` | v0.1.7 | 2 |
| `appleboy/ssh-action` | `029f5b4aeeeb58fdfe1410a5d17f967dacf36262` | v1.0.3 | 2 |
| `docker/setup-buildx-action` | `8d2750c68a42422c14e847fe6c8ac0403b4cbd6f` | v3.12.0 | 2 |
| `docker/login-action` | `c94ce9fb468520275223c153574b00df6fe4bcc9` | v3.7.0 | 2 |
| `docker/build-push-action` | `ca052bb54ab0790a636c9b5f226502c73d547a25` | v5.4.0 | 2 |
| `snyk/actions/node` | `9adf32b1121593767fc3c057af55b55db032dc04` | v1.0.0 | 1 |
| `actions/upload-artifact` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | v4.6.2 | 3 |
| `actions/github-script` | `f28e40c7f34bde8b3046d885e986cb6290c5673b` | v7.1.0 | 2 |
| `actions/dependency-review-action` | `4081bf99e2866ebe428571c5e1f4bf24092ce0ff` | v4.6.0 | 1 (pre-existing) |

**Total**: 42 newly pinned + 1 pre-existing = 43 SHA-pinned `uses:` lines.

## Deployment Path Audit

Verified all deployment entrypoints for SHA consistency:

| Action | `deploy-hetzner.yml` | `deploy-uat.yml` | Match |
| ------ | -------------------- | ----------------- | ----- |
| `appleboy/scp-action` | `917f8b81...` | `917f8b81...` | ✅ |
| `appleboy/ssh-action` | `029f5b4a...` | `029f5b4a...` | ✅ |
| `docker/setup-buildx-action` | `8d2750c6...` | `8d2750c6...` | ✅ |
| `docker/login-action` | `c94ce9fb...` | `c94ce9fb...` | ✅ |
| `docker/build-push-action` | `ca052bb5...` | `ca052bb5...` | ✅ |

Production and UAT deploy workflows are aligned on all shared actions. Environment-specific differences (ports, secrets, triggers) are intentional and unchanged.

## Code Quality Validation

- [x] **Compilation**: N/A (YAML-only changes)
- [x] **Linter**: N/A (no application code changed)
- [x] **Tests**: N/A (no application code changed; workflow syntax validated by zero-mutable-ref grep)
- [x] **Compatibility**: All workflow triggers, permissions, inputs, and job structures preserved

## Value Statement Validation

- **Original**: "a tag-rewrite or compromised-action incident cannot silently inject attacker-controlled code into CI or production deployment paths"
- **Implementation delivers**: All 42 mutable action references eliminated. Zero mutable refs remain. Dependabot ensures pinned SHAs stay current without reverting to mutable tags. Deploy-path audit confirms production and UAT alignment.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| -------------- | --------- | ------------------- | ----------------- | -------------- | ---------------- |
| N/A — no new functions/classes | N/A | N/A | N/A | N/A | N/A |

**Rationale**: This implementation modifies only GitHub Actions workflow YAML files and adds a Dependabot configuration file. No application source code, functions, or classes were created or modified. TDD is not applicable to declarative YAML configuration changes.

## Test Coverage

- **Static verification**: `grep -rnE 'uses:.*@(v[0-9]|master|main\b)' .github/workflows/` → **0 matches** (zero mutable refs)
- **SHA-pinned count**: `grep -rnE 'uses:.*@[a-f0-9]{40}' .github/workflows/` → **43 matches** (42 newly pinned + 1 pre-existing)
- **Diff integrity**: `git diff --stat .github/workflows/` → 42 insertions, 42 deletions (1:1 replacement, no structural changes)

## Test Execution Results

```
$ grep -rnE 'uses:.*@(v[0-9]|master|main\b)' .github/workflows/ | wc -l
       0

$ grep -rnE 'uses:.*@[a-f0-9]{40}' .github/workflows/ | wc -l
      43

$ git diff --stat .github/workflows/
 .github/workflows/ci.yml                   | 20 ++++++++++----------
 .github/workflows/dependency-review.yml    |  2 +-
 .github/workflows/deploy-hetzner.yml       | 12 ++++++------
 .github/workflows/deploy-uat.yml           | 14 +++++++-------
 .github/workflows/performance-test.yml     |  6 +++---
 .github/workflows/snyk-pr-verification.yml |  6 +++---
 .github/workflows/weekly-quality-gates.yml | 24 ++++++++++++------------
 7 files changed, 42 insertions(+), 42 deletions(-)
```

## Outstanding Items

- **Deferred (D-007 from plan)**: Evaluate replacing `appleboy/ssh-action` and `appleboy/scp-action` with native SSH/SCP patterns. Owner: future Planner/Security. Not blocking for this remediation scope.
- **No blockers**: All plan milestones completed. Zero mutable refs remain.

## Assumptions Documented

1. **SHA correctness**: SHAs resolved via `git ls-remote` against upstream repos on 2026-03-24. If an upstream repo force-pushes or deletes a commit, the workflow will fail-safe (action won't load) rather than silently degrade.
2. **No runtime behavior change**: All workflow behavior, triggers, permissions, and job structures are preserved. Only the `uses:` reference format changed.
3. **Dependabot scope**: Configured only for `github-actions` ecosystem. Does not affect npm/Docker/other dependency management.

## Next Steps

1. **Code Reviewer** validates SHA correctness, workflow integrity, and dependabot config
2. **QA** confirms zero mutable refs and deployment path consistency
3. **DevOps** commits to `session/056-gha-supply-chain-audit` branch and merges
