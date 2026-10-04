---
ID: 5
Origin: 5
UUID: d7e2a91f
Status: Resolved
---

# Critique: 005 — Fix Plan: Restore UAT Docker Build (`npm ci` failure)

**Artifact**: `agent-output/planning/005-uat-docker-npm-ci-fix.md`
**Analysis**: `agent-output/analysis/closed/005-uat-docker-npm-ci-analysis.md`
**Date**: 2026-02-21
**Status**: Initial Review
**Verdict**: **APPROVED** (with minor recommendations)

---

## Changelog

| Date       | Handoff          | Request        | Summary                                            |
| ---------- | ---------------- | -------------- | -------------------------------------------------- |
| 2026-02-21 | Planner → Critic | Initial review | Plan reviewed; approved with low-severity findings |
| 2026-03-23T10:01Z | process-improvement | Normalize closed critique status | Status: Resolved |

---

## Value Statement Assessment

| Check      | Result | Notes                                                                                                       |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Presence   | PASS   | Clear user-story format present                                                                             |
| Clarity    | PASS   | "UAT stays continuously deployable" is verifiable by pipeline green status                                  |
| Alignment  | PASS   | Restoring CI/CD unblocks all v0.3.0 feature validation, directly supports Master Product Objective velocity |
| Directness | PASS   | Value is delivered immediately upon merge — no deferral                                                     |

The value statement correctly frames this as infrastructure reliability that enables feature delivery, not as a feature itself. This is appropriate for a bugfix plan.

---

## Overview

Plan 005 addresses a deterministic `npm ci` failure in the UAT Docker build caused by a stale `package-lock.json`. The plan is well-structured, scoped tightly, and directly addresses the verified root cause from Analysis 005. It proposes four sequential steps: lockfile regeneration (primary fix), toolchain alignment (prevention), CI determinism improvements (detection), and overrides hygiene (optional risk reduction).

The plan correctly inherits the analysis findings and translates them into implementation-ready tasks without prescribing code. The analysis was thorough and the plan faithfully reflects its conclusions.

---

## Architectural Alignment

| Check                         | Result | Notes                                                                   |
| ----------------------------- | ------ | ----------------------------------------------------------------------- |
| Respects current architecture | PASS   | No architectural changes proposed; stays within existing CI/CD pipeline |
| Fits roadmap                  | PASS   | Targets v0.3.0 enablement, which is the current working release         |
| Consistency with prior plans  | PASS   | Plan 003 (v0.2.0) used the same pipeline; this restores it              |
| No premature optimization     | PASS   | Correctly avoids adding complexity (e.g., no new CI services)           |

The plan aligns with the Postgres-first / "don't add services prematurely" philosophy by not introducing new build tooling — it fixes the existing pipeline.

---

## Scope Assessment

| Check                        | Result | Notes                                                  |
| ---------------------------- | ------ | ------------------------------------------------------ |
| Boundaries clear             | PASS   | In-scope/out-of-scope well-defined                     |
| Deliverables listed          | PASS   | Each step has acceptance criteria                      |
| Dependencies identified      | PASS   | Steps are correctly sequenced                          |
| Scope appropriate to problem | PASS   | Focused on the root cause, not tangential improvements |

The scope is appropriately tight for a bugfix. Steps 2–4 are correctly framed as secondary improvements that reduce recurrence without bloating the fix.

---

## Technical Debt Risks

The plan actively reduces technical debt (lock file drift, toolchain misalignment) rather than creating new debt. Step 4 (overrides hygiene) correctly identifies a latent risk (bn.js major version override) without forcing a premature decision.

---

## Findings

### F1: Release targeting should be resolved before implementation

- **Severity**: MEDIUM
- **Status**: RESOLVED
- **Location**: Open Questions, "release targeting"
- **Description**: The plan leaves unresolved whether this should ship as v0.2.1 (patch) or under v0.3.0. Since v0.2.0 is the current production version and UAT is broken _now_, a patch release (v0.2.1) would be the correct semver signal: "bugfix to existing release, no new features."
- **Impact**: If carried under v0.3.0, UAT remains broken until all v0.3.0 plans are ready. This contradicts the P0 urgency stated in the plan header.
- **Recommendation**: Resolve before implementation. Recommend v0.2.1 patch release. This is a process decision, not a blocker for the implementation work itself — the lockfile fix is the same regardless of version label.

### F2: Missing explicit semver bump specification

- **Severity**: LOW
- **Status**: RESOLVED
- **Location**: Version Management Milestone section
- **Description**: The plan's "Version Management Milestone" section describes two options but doesn't commit to either. Per planner standards, plans should specify the target semver bump.
- **Impact**: Low — the implementer can infer this from context, and it depends on F1 resolution.
- **Recommendation**: Once F1 is resolved, add the explicit version bump (e.g., "Bump to v0.2.1") to the plan header.

### F3: Assumption about `package.json` as source of truth should be validated

- **Severity**: LOW
- **Status**: RESOLVED
- **Location**: Assumptions section
- **Description**: The plan assumes "the intended dependency set is the current `package.json`." However, Analysis 005 notes that `package.json` shows `@supabase/ssr ^0.6.1` while the lock file has `^0.8.0`, and the analysis flags this as a possible accidental regression. If the lock file had the _correct_ version and `package.json` was accidentally downgraded, regenerating the lock file from `package.json` would cement the regression.
- **Impact**: Low — likely the package.json is correct since it was consciously committed, but the implementer should verify the app compiles and functions with the `package.json` dependency set before committing.
- **Recommendation**: Add a validation step: "After lockfile regeneration, verify `npm run build:standalone` succeeds and no runtime errors appear from dependency version changes."

---

## Unresolved Open Questions

The plan contains **2 unresolved OPEN QUESTIONs**:

1. **Release targeting (v0.2.1 vs v0.3.0)** — Recommend resolving as v0.2.1 patch release (see F1).
2. **bn.js override safety** — Appropriately scoped as optional/risk-driven (Step 4). The implementer can investigate during implementation. Not a blocker.

**These open questions do NOT block approval.** The first is a process/versioning decision that doesn't change the technical fix. The second is correctly scoped as optional.

---

## "How will this plan result in a hotfix after deployment?"

**Low risk.** The primary fix (lockfile regeneration) is deterministic and verifiable before push: `npm ci --no-audit` either passes or fails. The validation section covers the critical path (clean checkout → npm ci → build → deploy). The only residual risk is if the regenerated lockfile pulls different transitive dependencies that cause runtime issues, which the plan acknowledges in "Rollback Considerations" and "Risks." Adding a build validation step (F3) mitigates this.

---

## Risk Assessment

| Risk                                   | Likelihood | Impact | Mitigation in Plan                |
| -------------------------------------- | ---------- | ------ | --------------------------------- |
| Lockfile regen changes transitive deps | Medium     | Medium | Rollback section covers this      |
| bn.js override breaks runtime          | Low        | High   | Step 4 addresses this as optional |
| Floating Docker tag surprises          | Low        | Medium | Step 3 proposes pinning           |
| Dependency downgrade breaks app        | Low        | Medium | Needs F3 build validation         |

Overall risk profile: **LOW** — the fix is well-understood, deterministic, and reversible.

---

## Recommendations

1. **Resolve F1 before implementation** — Decide on v0.2.1 vs v0.3.0. Recommend v0.2.1.
2. **Add build validation to Step 1** — Per F3, verify `build:standalone` succeeds after lockfile regeneration.
3. **F2 is informational** — Will resolve naturally once F1 is decided.

---

## Summary

Plan 005 is a well-constructed bugfix plan that faithfully translates Analysis 005 findings into actionable steps. The value statement is clear, scope is appropriate, and the plan correctly separates the primary fix from secondary prevention measures. The plan respects planner constraints (WHAT/WHY, no code) and aligns with the project's architecture and roadmap.

The three findings are all LOW-MEDIUM severity with straightforward resolution paths. None block implementation.

**Verdict: APPROVED**

The implementer may proceed. F1 (release targeting) should be resolved by the user/orchestrator as a process decision before or during implementation.
