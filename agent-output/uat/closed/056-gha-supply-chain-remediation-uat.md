---
ID: 56
Origin: 56
UUID: c4e91a7b
Status: Committed
---

# UAT Report: Plan 056 — GitHub Actions Supply Chain Remediation

**Plan Reference**: `agent-output/planning/056-gha-supply-chain-remediation-plan.md`
**Date**: 2026-03-24T12:25Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date | Agent Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-03-24T12:25Z | QA | All gates passing, ready for value validation | UAT Complete — implementation delivers the stated value; supply chain attack surface eliminated |
| 2026-03-24 | DevOps | Document closed | Status: Committed |

## Value Statement Under Test

> As a **platform operator and deployment owner**, I want **all GitHub Actions workflows to use immutable action references and automated update tracking**, so that **a tag-rewrite or compromised-action incident cannot silently inject attacker-controlled code into CI or production deployment paths**.

---

## Doc Review Summary

| Document | Status | Key Signal |
| --- | --- | --- |
| Implementation `056-gha-supply-chain-remediation.md` | ✅ Complete | All 6 milestones checked; 42 mutable refs pinned; dependabot.yml created; deploy-path audit passed |
| Code Review `056-...-code-review.md` | ✅ APPROVED | 0 CRITICAL / 0 HIGH / 0 MEDIUM findings; 2 INFO only; documentation fix applied in-review |
| QA `056-...-qa.md` | ✅ QA Complete | 0 mutable refs, 43 SHA-pinned, type-check PASS, 299 tests PASS; build deferral is environment-bound, not a regression |

**Value-evidence preflight**: All plan milestones present and marked complete. No user-visible milestone is missing or deferred.

---

## UAT Scenarios

### Scenario 1: Tag-rewrite attack is no longer possible for deploy-path actions

- **Given**: A compromised upstream maintainer rewrites the `appleboy/ssh-action@v1.0.3` tag to point to a new commit containing malicious code
- **When**: A production deploy workflow runs
- **Then**: GitHub Actions resolves the action from the pinned commit SHA `029f5b4aeeeb58fdfe1410a5d17f967dacf36262`, ignoring the rewritten tag entirely. The injected code never executes.
- **Result**: **PASS**
- **Evidence**: Implementation doc confirms `appleboy/ssh-action` is pinned to that SHA in both `deploy-hetzner.yml` and `deploy-uat.yml`. Code Review independently verified with grep; 0 mutable refs confirmed. SHA is a 40-char hex — GitHub resolves these by commit object, bypassing tag mutability.

### Scenario 2: `@master` branch reference on Snyk action is neutralised

- **Given**: An attacker pushes malicious code to the default branch of `snyk/actions`
- **When**: The weekly security scan runs
- **Then**: The workflow uses SHA `9adf32b1121593767fc3c057af55b55db032dc04` (pinned), not the live `@master` branch. The default-branch push has no effect on the executed action.
- **Result**: **PASS**
- **Evidence**: Implementation doc records `snyk/actions/node@master` → `@9adf32b1...` as the most dangerous class of mutation (live branch pointer). Code Review specifically acknowledged this as a top positive observation. QA confirms 0 mutable refs globally.

### Scenario 3: Production and UAT deploy pipelines use consistent action versions

- **Given**: A hotfix is deployed to production via `deploy-hetzner.yml` and the same change propagates to UAT via `deploy-uat.yml`
- **When**: Both docker build/push pipelines execute
- **Then**: Both workflows use exactly the same `docker/build-push-action`, `docker/login-action`, `docker/setup-buildx-action`, `appleboy/scp-action`, and `appleboy/ssh-action` SHAs. No version drift between environments.
- **Result**: **PASS**
- **Evidence**: Implementation doc deployment path audit table; Code Review independently verified all 5 shared deploy actions align between prod and UAT workflows. QA confirmed with cross-file check.

### Scenario 4: Future action updates are surfaced automatically without reverting to mutable tags

- **Given**: A new version of `actions/checkout` is released after this remediation
- **When**: The weekly Dependabot scan runs
- **Then**: Dependabot opens a PR to update the pinned SHA in the affected workflow files, labelled `ci`+`dependencies`, with a commit message prefixed `ci`.
- **Result**: **PASS**
- **Evidence**: `.github/dependabot.yml` created with `github-actions` ecosystem, weekly Monday schedule, correct labels. QA confirmed file is present. Dependabot is the standard GitHub mechanism for this; no further configuration required.

### Scenario 5: Existing CI and deployment behavior is fully preserved

- **Given**: A developer opens a pull request to the `develop` branch
- **When**: The CI pipeline runs
- **Then**: All jobs (supply-chain-ioc-scan, lint-and-type-check, test, build, security-audit) execute exactly as before. The IOC scan still gates the downstream jobs. The only change is that each `uses:` line now resolves a pinned commit rather than a floating tag.
- **Result**: **PASS**
- **Evidence**: Implementation diff is 42 insertions / 42 deletions — pure 1:1 SHA substitutions, no structural workflow changes. Code Review verified job dependency ordering preserved (IOC scan gate intact). QA type-check and vitest both pass; 299 tests green.

---

## Value Delivery Assessment

The value statement is **demonstrably delivered**. The core ask — that a tag-rewrite or compromised-action incident **cannot silently inject attacker-controlled code** — is satisfied at the mechanism level: every `uses:` reference in all 7 workflow files now points to an immutable commit SHA. Tags and branch references (the mutation vectors) no longer participate in action resolution.

The secondary ask — **automated update tracking** — is delivered via `dependabot.yml`. The platform operator no longer has to manually monitor action versions; Dependabot will open PRs when newer vetted SHAs become available.

This plan was **triggered by the Checkmarx KICS compromise** (March 23, 2026). UFlow was confirmed not affected by that specific incident. This remediation ensures UFlow cannot be affected by the same class of attack against any of its 11 distinct third-party actions in the future.

No core value is deferred.

---

## QA Integration

**QA Report Reference**: `agent-output/qa/056-gha-supply-chain-remediation-qa.md`
**QA Status**: QA Complete
**QA Findings Alignment**: All QA findings (pre-existing lint debt, missing `.env.local` build deferral) are either unrelated to this plan or are environment constraints that do not affect the hardening objective. QA classified them correctly as non-blocking.

**Remediation Review**: No prior QA failure; this is a clean first-pass QA Complete.

---

## Technical Compliance

| Deliverable | Status | Evidence |
| --- | --- | --- |
| Pin all mutable `uses:` refs to SHA | ✅ PASS | `grep -rnE 'uses:.*@(v[0-9]\|master\|main\b)' .github/workflows/` → 0 matches |
| 43 SHA-pinned `uses:` lines total | ✅ PASS | `grep -rnE 'uses:.*@[a-f0-9]{40}' .github/workflows/` → 43 matches |
| Version comments on every pin | ✅ PASS | Code Review confirmed 100% coverage |
| `.github/dependabot.yml` created | ✅ PASS | File present; `github-actions` ecosystem, Monday weekly cadence |
| Production/UAT deploy-action alignment | ✅ PASS | 5 shared actions verified equal across prod and UAT workflows |
| No structural workflow changes | ✅ PASS | Diff: 42 insertions, 42 deletions, 7 files — pure substitutions |
| Type-check passes | ✅ PASS | `tsc --noEmit` exit 0 |
| Test suite passes | ✅ PASS | 299 tests pass, 18 skipped (pre-existing integration skips) |
| Deployment behavior preserved | ✅ PASS | IOC scan gate, blue-green health check, Nginx config upload all unchanged |

**Known limitations**:
- `npm run build` with real secrets not executed locally (no `.env.local`); deferred to CI. This is an environment constraint, not a regression risk.
- `npm run lint` fails on pre-existing debt in `tools/` and `src/components/` unrelated to this plan.
- Pre-existing `actions/dependency-review-action` pin may need a separate follow-up review (Plan 056 did not modify that line).

---

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**: The plan's four numbered objectives are all met:
1. ✅ Mutable refs eliminated — 0 remain; deploy/secrets-bearing jobs addressed first
2. ✅ Existing CI/UAT/production behavior preserved — structural 1:1 substitution confirmed by diff
3. ✅ Maintainable update hygiene added — Dependabot configured; no manual monitoring required
4. ✅ Verifiable rollout guidance exists — implementation, code review, and QA docs provide full traceability

**Drift Detected**: None. The only deviation from plan was the discovery that the audit undercounted mutable refs (37 → 42 actual). All 42 were pinned. This is an improvement in coverage, not a reduction, and was flagged and documented by the Critic at plan stage.

---

## UAT Status

**Status**: UAT Complete
**Rationale**: All UAT scenarios pass. The implementation delivers the stated business value unambiguously. Zero core value is deferred. No blocking QA or Code Review findings exist.

---

## Release Decision

**Final Status**: APPROVED FOR RELEASE

**Rationale**: The change is correct, complete, safe, and narrowly scoped. It eliminates a real and documented attack vector (tag-rewrite supply chain injection) affecting 11 distinct GitHub Actions across 7 workflow files. Code Review approved with 0 blocking findings. QA passed type-check and full test suite. All acceptance criteria satisfied.

**Recommended Version**: **No product version bump** — as decided in Plan 056 Decision 1, this is workflow-only security hardening that does not change the application runtime or user-facing product. No semver increment is required. DevOps may apply a governance annotation if internal policy requires tagging CI/CD-only commits, but this should not block release.

**Key Changes for Changelog**:

- Pinned all 42 mutable GitHub Actions `uses:` references to immutable 40-character commit SHAs across 7 workflow files
- Eliminates tag-rewrite supply chain attack vector triggered by the Checkmarx KICS compromise advisory (2026-03-23)
- Added `.github/dependabot.yml` for automated GitHub Actions version tracking (weekly, `ci` label)
- Most critical change: `snyk/actions/node@master` → SHA-pinned (live branch reference eliminated)
- Deployment path verified: production and UAT deploy workflows use identical action SHAs for all shared steps

---

## Next Actions

None required before release.

### Deferred Non-Blocking Follow-ups

| Item | Owner | Trigger / Due Window | Evidence to Close | Recommended Next Plan |
| --- | --- | --- | --- | --- |
| Evaluate replacing `appleboy/ssh-action` + `appleboy/scp-action` with native SSH/SCP | Future Planner / Security | Next security hardening cycle or if an `appleboy/*` vulnerability is disclosed | New plan scoped to SSH/SCP pattern with no action dependency | Create new security hardening plan |
| Pre-existing `actions/dependency-review-action` pin SHA mismatch | Future Planner / Security | Before next dependency-review PR triggers | Verify pin SHA against upstream `v4.6.0` tag; update if diverged | Include in next CI/CD maintenance plan |
| Build validation with real secrets | DevOps | During CI run on session branch | CI build completes with exit 0 | CI evidence in DevOps phase |
| Pre-existing `npm run lint` debt (tools/, ProfileProviderDetailButtons.tsx) | Future Implementer | Backlog — not blocking release | `npm run lint` exit 0 on changed files | Existing open debt backlog |

---

Handing off to DevOps agent for release execution.
