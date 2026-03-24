# S056 — GitHub Actions Supply Chain Security Audit

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| **ID**       | 056                                                 |
| **Status**   | Released                                            |
| **Verdict**  | PASSED_WITH_FINDINGS                                |
| **Date**     | 2026-03-24                                          |
| **Trigger**  | Checkmarx KICS compromise (CVE advisory 2026-03-23) |
| **Reviewer** | Security Agent                                      |

---

## 1. Executive Summary

On 2026-03-23, all git tags in `Checkmarx/kics-github-action` were compromised with infostealer malware injected into `setup.sh`. The attack window was 12:58–16:50 UTC. Only the `master` branch was clean.

**UFlow impact: NOT AFFECTED** — zero references to `Checkmarx/kics-github-action` found anywhere in the codebase.

However, this incident exposes the same class of vulnerability across our CI/CD pipelines: **11 distinct third-party actions** use mutable references (`@v4`, `@v3`, `@master`, etc.) instead of immutable commit SHA pins. Any of these tags could be re-pointed by a compromised maintainer account or supply chain attack, injecting arbitrary code into our workflows with access to secrets (SSH keys, deployment credentials, GHCR tokens).

**Severity: HIGH** — Our deployment workflows (`deploy-hetzner.yml`, `deploy-uat.yml`) use mutable-tagged actions that access production SSH keys, Supabase service role keys, and GHCR credentials.

---

## 2. KICS Incident — Not Affected Confirmation

| Check                                                  | Result      |
| ------------------------------------------------------ | ----------- |
| `grep -r 'kics' .github/workflows/`                   | 0 matches   |
| `grep -r 'Checkmarx' .github/workflows/`              | 0 matches   |
| `grep -r 'kics-github-action' .github/workflows/`     | 0 matches   |
| Workflow files scanned                                 | 7           |
| IOC scanner present (`scripts/security/ioc-scan.sh`)   | Yes — gated |

UFlow already runs a supply-chain IOC scan as the first CI job, gating all other jobs. This is a positive security posture.

---

## 3. Vulnerability Inventory — Mutable Action References

### 3.1 Summary

| Category         | Count | Risk    |
| ---------------- | ----- | ------- |
| Already SHA-pinned | 1   | —       |
| Mutable tags       | 10  | Medium  |
| Branch references  | 1   | Critical |
| **Total actions**  | **12** | —    |

### 3.2 Detailed Findings

Each finding lists the action, where it appears, current (mutable) reference, the resolved commit SHA for pinning, and a risk assessment.

---

#### F-001: `actions/checkout@v4` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v4` (mutable major tag) |
| **Pin target** | `@34e114876b0b11c390a56381ad16ebd13914f8d5` (v4.3.1) |
| **Severity** | Medium |
| **Publisher** | GitHub (first-party) |
| **Workflows** | ci.yml (×5), deploy-hetzner.yml, deploy-uat.yml, dependency-review.yml, performance-test.yml, snyk-pr-verification.yml, weekly-quality-gates.yml (×4) |
| **Occurrences** | 13 |

**Risk**: First-party GitHub action, lower supply chain risk than third-party. However, `@v4` is a mutable major version tag that can be re-pointed. SHA pinning eliminates this vector.

---

#### F-002: `actions/setup-node@v4` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v4` (mutable major tag) |
| **Pin target** | `@49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0) |
| **Severity** | Medium |
| **Publisher** | GitHub (first-party) |
| **Workflows** | ci.yml (×4), snyk-pr-verification.yml, deploy-uat.yml, weekly-quality-gates.yml (×3) |
| **Occurrences** | 8 |

**Risk**: First-party. Controls Node.js installation — a compromised version could inject malicious packages or modify `npm ci` behavior.

---

#### F-003: `codecov/codecov-action@v4` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v4` (mutable major tag) |
| **Pin target** | `@b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238` (v4.6.0) |
| **Severity** | Medium |
| **Publisher** | Codecov (third-party) |
| **Workflows** | ci.yml |
| **Occurrences** | 1 |

**Risk**: Third-party action with `continue-on-error: true`. Has access to repository code and coverage data. Codecov had a [real supply chain incident in 2021](https://about.codecov.io/security-update/) — the `bash uploader` was compromised. SHA pinning is strongly recommended.

---

#### F-004: `appleboy/scp-action@v0.1.7` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v0.1.7` (mutable minor tag) |
| **Pin target** | `@917f8b81dfc1ccd331fef9e2d61bdc6c8be94634` (v0.1.7) |
| **Severity** | **HIGH** |
| **Publisher** | appleboy (third-party, individual maintainer) |
| **Workflows** | deploy-hetzner.yml, deploy-uat.yml |
| **Occurrences** | 2 |
| **Secrets exposed** | `HETZNER_HOST`, `HETZNER_SSH_KEY` |

**Risk**: **CRITICAL context** — copies files directly to the production Hetzner server via SCP using root SSH credentials. A compromised tag could exfiltrate the SSH private key or inject malicious files. Single-maintainer GitHub project increases supply chain risk. Newer v1.0.0 available.

---

#### F-005: `appleboy/ssh-action@v1.0.3` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v1.0.3` (mutable patch tag) |
| **Pin target** | `@029f5b4aeeeb58fdfe1410a5d17f967dacf36262` (v1.0.3) |
| **Severity** | **CRITICAL** |
| **Publisher** | appleboy (third-party, individual maintainer) |
| **Workflows** | deploy-hetzner.yml, deploy-uat.yml |
| **Occurrences** | 2 |
| **Secrets exposed** | `HETZNER_HOST`, `HETZNER_SSH_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `GHCR_PAT`, `GITHUB_TOKEN` |

**Risk**: **HIGHEST RISK ACTION IN THE PIPELINE.** Executes arbitrary shell commands on the production Hetzner server as root. All production secrets are passed into the SSH session. A compromised tag gives an attacker full production server access AND exfiltration of every secret. Single-maintainer project. Newer v1.2.5 available.

---

#### F-006: `docker/setup-buildx-action@v3` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v3` (mutable major tag) |
| **Pin target** | `@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f` (v3.12.0) |
| **Severity** | Medium |
| **Publisher** | Docker (third-party, corporate) |
| **Workflows** | deploy-hetzner.yml, deploy-uat.yml |
| **Occurrences** | 2 |

**Risk**: Sets up Docker Buildx. Compromise could inject malicious layer into builds. Docker is a well-resourced org, but the `@v3` tag is still mutable.

---

#### F-007: `docker/login-action@v3` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v3` (mutable major tag) |
| **Pin target** | `@c94ce9fb468520275223c153574b00df6fe4bcc9` (v3.7.0) |
| **Severity** | High |
| **Publisher** | Docker (third-party, corporate) |
| **Workflows** | deploy-hetzner.yml, deploy-uat.yml |
| **Occurrences** | 2 |
| **Secrets exposed** | `GITHUB_TOKEN` (GHCR login) |

**Risk**: Handles GHCR authentication. A compromised version could exfiltrate the `GITHUB_TOKEN` and gain write access to packages.

---

#### F-008: `docker/build-push-action@v5` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v5` (mutable major tag) |
| **Pin target** | `@ca052bb54ab0790a636c9b5f226502c73d547a25` (v5.4.0) |
| **Severity** | High |
| **Publisher** | Docker (third-party, corporate) |
| **Workflows** | deploy-hetzner.yml, deploy-uat.yml |
| **Occurrences** | 2 |
| **Secrets exposed** | Build args include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |

**Risk**: Builds and pushes the Docker image. Compromise could inject malware into the production container image. Build args expose Supabase configuration (though public keys).

---

#### F-009: `snyk/actions/node@master` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@master` (**branch reference — MOST DANGEROUS**) |
| **Pin target** | `@9adf32b1121593767fc3c057af55b55db032dc04` (v1.0.0 / master HEAD) |
| **Severity** | **HIGH** |
| **Publisher** | Snyk (third-party, corporate) |
| **Workflows** | weekly-quality-gates.yml |
| **Occurrences** | 1 |
| **Secrets exposed** | `SNYK_TOKEN` |

**Risk**: Branch references are the **most dangerous** mutable ref type — they change with every commit. Unlike tags, there is no social expectation of stability. `master` HEAD changes could introduce arbitrary code. The `SNYK_TOKEN` provides access to the Snyk account and could be exfiltrated. Snyk does offer `v1.0.0` tag at the same commit — use that SHA.

---

#### F-010: `actions/upload-artifact@v4` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v4` (mutable major tag) |
| **Pin target** | `@ea165f8d65b6e75b540449e92b4886f43607fa02` (v4.6.2) |
| **Severity** | Low–Medium |
| **Publisher** | GitHub (first-party) |
| **Workflows** | performance-test.yml, weekly-quality-gates.yml (×3) |
| **Occurrences** | 4 |

**Risk**: First-party. Uploads artifacts to GitHub. A compromised version could exfiltrate build output, but the blast radius is limited to CI-only data.

---

#### F-011: `actions/github-script@v7` → Pin to SHA

| Field | Value |
|-------|-------|
| **Current ref** | `@v7` (mutable major tag) |
| **Pin target** | `@f28e40c7f34bde8b3046d885e986cb6290c5673b` (v7.1.0) |
| **Severity** | Medium |
| **Publisher** | GitHub (first-party) |
| **Workflows** | performance-test.yml, snyk-pr-verification.yml |
| **Occurrences** | 2 |

**Risk**: Runs arbitrary JavaScript with `github.rest` API access. Could be used to modify PRs, create releases, or exfiltrate repository information. First-party reduces but doesn't eliminate risk.

---

#### F-000: `actions/dependency-review-action` ✅ Already Pinned

| Field | Value |
|-------|-------|
| **Current ref** | `@4081bf99e2866ebe428571c5e1f4bf24092ce0ff` (v4.6.0) |
| **Status** | ✅ Compliant — SHA-pinned with version comment |

**Positive finding**: This action follows best practices with SHA pinning and a version comment.

---

## 4. Risk Assessment Matrix

| Risk Tier | Actions | Rationale |
|-----------|---------|-----------|
| **CRITICAL** | F-005 (`appleboy/ssh-action`) | Root SSH to production, all secrets in scope, single-maintainer |
| **HIGH** | F-004 (`appleboy/scp-action`) | Root SCP to production, SSH key exposure, single-maintainer |
| **HIGH** | F-009 (`snyk/actions/node`) | Branch reference (`@master`), Snyk token exposure |
| **HIGH** | F-007 (`docker/login-action`) | GHCR auth, GITHUB_TOKEN exposure |
| **HIGH** | F-008 (`docker/build-push-action`) | Builds production container, Supabase config in build args |
| **MEDIUM** | F-001 (`actions/checkout`) | First-party, but foundational — all workflows depend on it |
| **MEDIUM** | F-002 (`actions/setup-node`) | First-party, controls Node.js runtime |
| **MEDIUM** | F-003 (`codecov/codecov-action`) | Third-party with prior incident history |
| **MEDIUM** | F-006 (`docker/setup-buildx-action`) | Docker build infra, corporate publisher |
| **MEDIUM** | F-011 (`actions/github-script`) | First-party, has GitHub API access |
| **LOW** | F-010 (`actions/upload-artifact`) | First-party, CI-only data exposure |

---

## 5. Positive Security Findings

| # | Finding |
|---|---------|
| P-001 | `actions/dependency-review-action` is correctly SHA-pinned with version comment |
| P-002 | Supply chain IOC scan runs as first CI job and gates all subsequent jobs |
| P-003 | `continue-on-error: true` on `codecov` limits blast radius |
| P-004 | Deployment workflows require manual `workflow_dispatch` confirmation |
| P-005 | Blue-green deployment with health checks reduces blast radius of bad deploys |
| P-006 | `fail-on-severity: high` configured in dependency review |

---

## 6. Remediation Plan

### 6.1 Immediate — SHA-Pin All Actions (Priority 1)

Replace all mutable tag references with their resolved commit SHAs. Add version comments for maintainability.

**Pattern**:
```yaml
# Before (vulnerable)
uses: actions/checkout@v4

# After (hardened)
uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
```

#### SHA Pin Reference Table

| Action | Current Ref | Pin SHA | Version |
|--------|-------------|---------|---------|
| `actions/checkout` | `@v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5` | v4.3.1 |
| `actions/setup-node` | `@v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4.4.0 |
| `codecov/codecov-action` | `@v4` | `b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238` | v4.6.0 |
| `appleboy/scp-action` | `@v0.1.7` | `917f8b81dfc1ccd331fef9e2d61bdc6c8be94634` | v0.1.7 |
| `appleboy/ssh-action` | `@v1.0.3` | `029f5b4aeeeb58fdfe1410a5d17f967dacf36262` | v1.0.3 |
| `docker/setup-buildx-action` | `@v3` | `8d2750c68a42422c14e847fe6c8ac0403b4cbd6f` | v3.12.0 |
| `docker/login-action` | `@v3` | `c94ce9fb468520275223c153574b00df6fe4bcc9` | v3.7.0 |
| `docker/build-push-action` | `@v5` | `ca052bb54ab0790a636c9b5f226502c73d547a25` | v5.4.0 |
| `snyk/actions/node` | `@master` | `9adf32b1121593767fc3c057af55b55db032dc04` | v1.0.0 |
| `actions/upload-artifact` | `@v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | v4.6.2 |
| `actions/github-script` | `@v7` | `f28e40c7f34bde8b3046d885e986cb6290c5673b` | v7.1.0 |

### 6.2 Automated Version Tracking — Dependabot (Priority 1)

Create `.github/dependabot.yml` to automatically propose SHA-pinned version bumps:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    commit-message:
      prefix: "ci"
      include: "scope"
    labels:
      - "dependencies"
      - "ci"
    open-pull-requests-limit: 10
```

This ensures SHA-pinned actions stay current without manual monitoring.

### 6.3 Future Considerations (Priority 2)

| Item | Description |
|------|-------------|
| **Evaluate `appleboy/ssh-action` alternatives** | Consider replacing with `webfactory/ssh-agent` + inline `ssh` commands to reduce third-party dependency surface for production deployments. |
| **Evaluate `appleboy/scp-action` alternatives** | Consider replacing with inline `scp` via `webfactory/ssh-agent` or GHCR-only deployment (current approach pushes image to GHCR, but also SCPs nginx config). |
| **Workflow permissions** | Ensure all workflows use minimal `permissions:` blocks. Deploy workflows already have `contents: read, packages: write`. Verify CI workflows. |
| **CODEOWNERS for workflows** | Add `.github/workflows/` to `CODEOWNERS` to require approval for workflow changes. |

---

## 7. Files Affected

| Workflow | File | Mutable Actions |
|----------|------|-----------------|
| CI Pipeline | `.github/workflows/ci.yml` | checkout (×5), setup-node (×4), codecov (×1) |
| Deploy Production | `.github/workflows/deploy-hetzner.yml` | checkout, scp-action, setup-buildx, login-action, build-push, ssh-action |
| Deploy UAT | `.github/workflows/deploy-uat.yml` | checkout, scp-action, setup-buildx, login-action, setup-node, build-push, ssh-action |
| Dependency Review | `.github/workflows/dependency-review.yml` | checkout (×1) — dep-review-action already pinned |
| Performance Tests | `.github/workflows/performance-test.yml` | checkout, upload-artifact, github-script |
| Snyk PR Verification | `.github/workflows/snyk-pr-verification.yml` | checkout, setup-node, github-script |
| Weekly Quality Gates | `.github/workflows/weekly-quality-gates.yml` | checkout (×4), setup-node (×3), snyk/actions/node, upload-artifact (×3) |

**Total mutable `uses:` occurrences to update: 37**

---

## 8. Verification Checklist (Post-Remediation)

- [ ] All `uses:` references in `.github/workflows/*.yml` contain a 40-character SHA
- [ ] Each SHA has a `# vX.Y.Z` version comment
- [ ] `.github/dependabot.yml` exists with `github-actions` ecosystem
- [ ] CI pipeline passes after SHA-pinning changes
- [ ] Deploy workflows pass after SHA-pinning changes
- [ ] No regressions in IOC scan behavior

---

## 9. References

- [Checkmarx KICS Compromise Advisory (2026-03-23)](https://www.stepsecurity.io/blog/checkmarx-kics-github-action-compromised)
- [GitHub Security Hardening: Using third-party actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [Codecov Supply Chain Incident (2021)](https://about.codecov.io/security-update/)
- [StepSecurity: Pinning Actions to Commit SHAs](https://www.stepsecurity.io/blog/pin-github-actions-to-immutable-full-length-commit-sha)

---

## 10. Handoff

**Next step**: Hand off to **Implementer** to create the SHA-pinning PR:
1. Pin all 37 mutable `uses:` references to commit SHAs (see §6.1 table)
2. Create `.github/dependabot.yml` (see §6.2)
3. Verify CI/CD pipelines pass
4. Update this document's Status → `Remediated` and Verdict → `PASSED_WITH_FINDINGS`
