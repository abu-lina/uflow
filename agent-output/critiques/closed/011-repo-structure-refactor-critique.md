---
ID: 011
Origin: 011
UUID: 3c8f1d7a
Status: Committed
---

# Critique: Plan 011 — Repo Structure Refactor (v0.6.0)

**Artifact**: agent-output/planning/011-repo-structure-refactor-v0.6.0.md
**Architecture Input**: agent-output/architecture/011-repo-structure-architecture-findings.md
**Date**: 2026-02-23
**Critic**: critic agent
**Status**: Initial Review
**Verdict**: **APPROVED** (with recommendations below)

## Changelog

| Date | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-23 | Planner → Critic | Initial critique of Plan 011 | APPROVED with 0 CRITICAL, 0 HIGH, 3 MEDIUM, 2 LOW findings |

---

## Value Statement Assessment

| Check | Result | Notes |
| --- | --- | --- |
| Presence | ✅ PASS | User story format present: contributor-centric "so that" outcome. |
| Clarity | ✅ PASS | "Ship features quickly with lower regression risk" is verifiable via developer feedback and reduced mis-placed file incidents. |
| Alignment | ✅ PASS | Supports Master Product Objective indirectly: contributor velocity → faster feature delivery → faster path to "first thought". |
| Directness | ✅ PASS | Value is delivered directly: folder docs, script consolidation, and migration authority are concrete outputs. Not deferred. |

**Assessment**: Strong. The value statement correctly frames this as platform health work, not feature work, and avoids overclaiming user-facing impact.

---

## Overview

Plan 011 is a tightly-scoped structural cleanup that translates the five Arch 011 findings into five milestones. It correctly excludes the mass `src/components → src/features` migration (deferred per architecture recommendation) and focuses on documentation guardrails, a small script move, and migration-authority clarity.

The plan is well-structured: milestones are sequenced correctly, acceptance criteria are measurable, risks are identified with rollback paths, and duration estimates are realistic.

---

## Architectural Alignment

| Check | Result | Notes |
| --- | --- | --- |
| Arch 011 coverage | ✅ | All P0 findings addressed; P1 findings correctly deferred (service naming, test layout). |
| Arch 010 integration | ✅ | Plan references Arch 010 as a constraint; no moves violate server/client boundaries. |
| Postgres-first | ✅ | No new services introduced. |
| App Router stability | ✅ | `src/app/` route groups explicitly excluded from changes. |

---

## Scope Assessment

| Check | Result | Notes |
| --- | --- | --- |
| Boundaries defined | ✅ PASS | In-scope and out-of-scope lists are explicit and non-overlapping. |
| Deliverables | ✅ PASS | Each milestone has tasks and acceptance criteria. |
| Dependencies sequenced | ✅ PASS | Mermaid graph shows correct ordering; M1 gates M2/M3. |
| Semver | ⚠️ See F3 | Target release stated (v0.6.0), but no explicit semver bump rationale. |

---

## Technical Debt Risks

- **Positive**: Plan actively reduces existing tech debt (script split, SQL ambiguity, missing docs).
- **Neutral**: Does not introduce new debt; deferred items (component migration, service naming) are explicitly tracked in Arch 011.
- **Watch**: If Milestone 4 READMEs are too vague, they may not actually prevent boundary drift. See F1.

---

## Unresolved Open Questions

The plan contains **1 unresolved OPEN QUESTION**:

> Is anything in `sql/migrations/` currently executed as part of UAT/prod setup scripts?

**Critic assessment**: This is correctly flagged and gated (Milestone 1 depends on resolving it). The plan's branching logic (yes → migrate or document; no → re-label) is sound. This does **not** block approval because the plan explicitly sequences work after resolution.

---

## Findings

### F1: Milestone 4 acceptance criteria could be more specific
- **Severity**: MEDIUM
- **Status**: OPEN
- **Location**: Plan section "Milestone 4 — Document and reinforce folder responsibilities"
- **Description**: The acceptance criterion "New contributors have a single clear reference for where should I add this file?" is aspirational but not objectively verifiable.
- **Impact**: Without a concrete check, the milestone could be marked "done" with minimal-value READMEs.
- **Recommendation**: Add a concrete deliverable check, e.g.: "The placement rubric includes at least: (1) UI components, (2) hooks, (3) services, (4) types, (5) migrations, (6) scripts — with a one-line rule for each."

### F2: Copilot instructions update not mentioned
- **Severity**: MEDIUM
- **Status**: OPEN
- **Location**: Plan scope / Milestone 4
- **Description**: The plan adds READMEs to `src/components/` and `src/features/`, but does not mention updating the canonical `.github/copilot-instructions.md` folder-structure section to match the new guidance (e.g., the "domain UI → features" direction).
- **Impact**: Copilot instructions are the primary reference for AI agents and new contributors. If they remain unchanged, the new READMEs may conflict or be overlooked.
- **Recommendation**: Add a task to Milestone 4: "Update `.github/copilot-instructions.md` folder-structure section to reference the new READMEs and state the domain-UI migration direction."

### F3: Semver bump rationale missing
- **Severity**: MEDIUM
- **Status**: OPEN
- **Location**: Plan header / Milestone 5
- **Description**: The plan targets v0.6.0 but does not state why this warrants a minor version bump (vs. a patch). Structure-only changes with no UX impact are sometimes released as patch versions.
- **Impact**: Minor — but previous releases show a consistent pattern (refactors → minor, bugfixes → patch). Stating the rationale prevents future debates.
- **Recommendation**: Add one sentence to Milestone 5: "Minor bump (v0.6.0) because this changes developer-facing folder contracts, even though there is no user-facing UX change." Or, if the team prefers, use v0.5.1 and state why.

### F4: Root-level markdown cleanup not addressed
- **Severity**: LOW
- **Status**: OPEN
- **Location**: Arch 011, section "Repo Root" (observation about top-level status/summary .md files)
- **Description**: Arch 011 noted multiple root-level markdown files (e.g., `INVESTIGATION_SUMMARY.md`, `SNYK_UPGRADES_SUMMARY.md`, `RESEND_SECURITY_REVIEW.md`). The plan's "What NOT to Change" correctly defers mass moves, but does not acknowledge these files at all.
- **Impact**: No immediate impact — these are stable. But acknowledging them as a known area for future cleanup would improve completeness.
- **Recommendation**: Add a one-line note under Out of Scope: "Root-level status markdown files are acknowledged as cluttered but are not addressed in this plan; they serve as incident entrypoints."

### F5: Process note — Planner chatmode file missing
- **Severity**: LOW
- **Status**: OPEN
- **Location**: `.github/chatmodes/planner.chatmode.md` (expected path)
- **Description**: Per Critic mode instructions, the planner chatmode file should be read at review start. It does not exist in the repository.
- **Impact**: No impact on this critique; noted for process completeness.
- **Recommendation**: No action required for Plan 011.

---

## Questions for Planner

1. **F1**: Would you accept a more specific deliverable check for Milestone 4 (e.g., placement rubric covers at least 6 categories)?
2. **F2**: Should `.github/copilot-instructions.md` be updated as part of this plan, or deferred to a separate scope?
3. **F3**: Is v0.6.0 (minor) the intended bump, and if so, can you add a one-line rationale?

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation in Plan? |
| --- | --- | --- | --- |
| Import churn from script moves | Low | Low | ✅ Yes (single PR, mechanical) |
| Server/client boundary violation | Very Low | Medium | ✅ Yes (type-check + build) |
| SQL migration authority unclear | Medium | High | ✅ Yes (Milestone 1 gates everything) |
| READMEs too vague to prevent drift | Medium | Medium | ⚠️ Partially (see F1) |
| Copilot instructions out of sync | Medium | Medium | ❌ Not addressed (see F2) |

---

## Recommendations

1. **Address F2** (update copilot-instructions.md) — this is the single most impactful addition because it's the canonical reference for all AI-assisted development.
2. **Tighten F1** acceptance criteria for Milestone 4 to ensure the READMEs are substantive.
3. **Clarify F3** semver rationale (one sentence).
4. F4 and F5 are informational only; no action required for approval.

---

## Verdict

**APPROVED** — The plan is well-scoped, correctly sequenced, architecturally aligned, and delivers direct value. The three MEDIUM findings (F1–F3) are recommendations for improvement, not blockers. The OPEN QUESTION about `sql/migrations/` is correctly gated and does not block the plan's approval.

The plan may proceed to implementation. Findings F1–F3 should be considered by the Implementer.

---

## Revision History

_No revisions yet — initial review._
