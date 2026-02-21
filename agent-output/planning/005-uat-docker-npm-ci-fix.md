---
ID: 5
Origin: 5
UUID: d7e2a91f
Status: UAT Complete
---

# Fix Plan: Restore UAT Docker Build (`npm ci` failure)

**Plan ID**: 005
**Epic Alignment**: Release v0.3.0 enablement (CI/CD reliability blocker)
**Target Release**: v0.3.0
**Priority**: P0 (blocks UAT deployments)
**Created**: 2026-02-21
**Planner**: planner agent

---

## Change Log

| Date       | Agent   | Change                               | Rationale                                                              |
| ---------- | ------- | ------------------------------------ | ---------------------------------------------------------------------- |
| 2026-02-21 | planner | Initial plan draft from Analysis 005 | Unblock UAT deployments by fixing deterministic `npm ci` failure       |
| 2026-02-21 | qa      | QA complete                          | Verified `npm ci` + `build:standalone`; documented known test failures |

---

## Value Statement and Business Objective

As a **developer / release operator**, I want the **UAT deployment pipeline to reliably build and deploy the Docker image on every push**, so that **UAT stays continuously deployable and feature work for v0.3.0 can be validated without CI friction**.

---

## Problem Statement (From Analysis 005)

- Docker build fails at `RUN npm ci --no-audit`.
- Root cause: `package-lock.json` is stale and does not match `package.json` (multiple mismatched specs + missing deps), which causes `npm ci` to abort.
- Secondary local-only issue: npm 11.6.3 has a known `overrides` regression (not the CI root cause, but impacts contributors).

---

## Scope

### In Scope

1. Bring `package-lock.json` back into strict sync with `package.json`.
2. Ensure CI/Docker uses a deterministic Node/npm toolchain, or at minimum fails with actionable logs.
3. Reduce recurrence by adding a lightweight lockfile-synchronization guardrail.

### Out of Scope

- Feature work for Release v0.3.0 epics (recommendations, city unlock, referrals).
- Dependency modernization beyond what’s required to restore `npm ci` determinism.

---

## Assumptions

- The intended dependency set is the current `package.json` (i.e., lock file should be regenerated to match it, not the other way around).
- UAT deploy uses `.github/workflows/deploy-uat.yml` and `Dockerfile` as the build source of truth.

---

## Open Questions

**OPEN QUESTION (release targeting):** Should this fix be released as a **patch release** (e.g., v0.2.1) since it restores deployability immediately, or is it acceptable to carry it under **v0.3.0** (current working release) as release enablement?  
If a patch release is preferred, Roadmap tracking should be updated accordingly.

**OPEN QUESTION (security override):** Is `overrides.bn.js >=5.2.3` required, and if yes, does it create runtime risk given `asn1.js` declares `bn.js ^4.0.0`?  
If required for a security advisory, consider alternative mitigation that does not cross major versions.

---

## Plan

### 1) Lockfile Regeneration (Primary Fix)

**Objective:** Ensure `npm ci` succeeds by making lock file specs match `package.json` exactly.

**Tasks:**

- Regenerate `package-lock.json` using a CI-aligned toolchain (prefer Node 20.x; npm version compatible with Node 20).
- Confirm previously missing packages appear in the lock file root (`@ducanh2912/next-pwa`, `prettier-plugin-tailwindcss`).
- Confirm dependency spec mismatches are eliminated (root `packages[""]` deps + devDeps match `package.json`).

**Acceptance Criteria:**

- `npm ci --no-audit` succeeds locally from a clean workspace.
- Docker build step that runs `npm ci --no-audit` succeeds in GitHub Actions.

**Dependencies:** None.

**Owner:** Implementer

---

### 2) Toolchain Alignment (Reduce Drift)

**Objective:** Reduce the chance that developers regenerate locks with incompatible Node/npm versions.

**Tasks (choose minimal effective set):**

- Add an `.nvmrc` (or equivalent) pin to Node 20.x to match runtime.
- Ensure `engines` remain compatible with the chosen Node/npm (avoid overly strict constraints that block legitimate installs).

**Acceptance Criteria:**

- Documented “source of truth” Node version exists in repo.
- Contributors can run `npm ci` without needing npm 11.6.3 (or can easily avoid it).

**Dependencies:** Step 1.

**Owner:** Implementer

---

### 3) CI/Docker Determinism & Better Failure Signal

**Objective:** Make failures easier to diagnose and reduce surprises from floating base tags.

**Tasks:**

- Consider pinning the Docker base image to a patch tag (e.g., Node 20.20 + specific Alpine) to reduce unexpected npm changes.
- Add a pre-Docker build workflow step that runs `npm ci --no-audit` on the runner (fast fail, clearer logs).

**Acceptance Criteria:**

- If dependency drift happens again, the workflow fails with explicit npm output before buildx.
- Docker build remains reproducible across runs.

**Dependencies:** Step 1.

**Owner:** Implementer / DevOps

---

### 4) Overrides Hygiene (Optional / Risk-Driven)

**Objective:** Ensure `overrides` do not break installs or introduce runtime breakage.

**Tasks:**

- Validate whether `bn.js` override is necessary; if not, remove it.
- If necessary, prefer mitigation that doesn’t violate transitive semver contracts, or pin the affected dependency chain more carefully.

**Acceptance Criteria:**

- `npm ci` works under CI toolchain.
- No runtime build errors introduced by dependency overrides.

**Dependencies:** Step 1.

**Owner:** Implementer

---

## Validation (No QA Test Cases)

- Run `npm ci --no-audit` from a clean checkout.
- Run `npm run build:standalone` locally and/or in CI.
- Run the UAT GitHub Actions workflow to completion (buildx + push + deploy steps).

---

## Rollback Considerations

- If lockfile regeneration downgrades a dependency needed by the codebase (e.g., `@supabase/ssr`), rollback is reverting the lockfile commit or restoring package.json to match the previously working dependency set.
- If an override causes issues, rollback can be removing or adjusting that override and regenerating the lock.

---

## Risks

- Lockfile regeneration may change transitive deps and surface previously hidden compatibility issues.
- The `bn.js` override may force an incompatible major version into a dependency chain.
- Floating Docker base image tags can change npm behavior without code changes.

---

## Duration Estimates (Rough)

- Analysis: 0.5–1.0h (completed in Analysis 005)
- Planning: 0.5–1.0h (this document)
- Implementation: 1–4h (lock regen + CI guardrails)
- QA: 0.5–2h (pipeline verification + basic build validation)
- UAT: 0.5–1.0h (confirm deployment succeeds)
- DevOps: 0.5–1.0h (monitor redeploy + rollback readiness)

Uncertainty drivers: whether dependency downgrades (notably `@supabase/ssr`) require code adjustments.

---

## Version Management Milestone

- Confirm how this fix will be tracked in releases:
  - If this is a patch release: add a CHANGELOG entry and bump version accordingly.
  - If this is part of v0.3.0 work: add the CHANGELOG entry under the v0.3.0 release workstream and keep version bumps centralized at release cut.
