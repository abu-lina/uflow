---
ID: 007
Origin: 007
UUID: 6c0b7a1e
Status: Resolved
---

# Process Improvement Analysis 007 — From Retro 006 (Android Suggest Provider Form)

**Source Retrospective**: `agent-output/retrospectives/closed/006-android-suggest-provider-form-bugfix-retrospective.md`
**Date**: 2026-02-22
**Mode**: ProcessImprovement (no source code changes)

## Changelog

| Date | Action | Summary |
| --- | --- | --- |
| 2026-02-22 | Analysis created | Extracted recommendations and conflicts from Retro 006 |
| 2026-02-22 | Updates implemented (Option 3) | Updated agent instructions (QA/UAT/Critic/Planner/Implementer/DevOps/Retrospective/Code Reviewer) per approved PI 007 scope |

## Executive Summary

- **Recommendations extracted**: 6
  - High impact: 3
  - Medium impact: 3
  - Low impact: 0
- **Conflicts found**: 3
- **Overall risk**: LOW–MEDIUM (instruction-only changes; main risk is over-prescription or duplicating responsibilities)
- **Recommendation**: Implement the 3 high-impact, low-risk checklist/template updates first (QA/UAT focus/scroll acceptance + Planner UUID inheritance guard + Critic closure rule). Defer anything that adds new mandatory device testing beyond what the plan already requires.

---

## Changelog Pattern Analysis

### Documents Reviewed

- Retrospective: `agent-output/retrospectives/closed/006-android-suggest-provider-form-bugfix-retrospective.md`
- Plan: `agent-output/planning/closed/006-android-suggest-provider-form-bugfix.md`
- Analysis: `agent-output/analysis/closed/006-android-suggest-provider-form-bug-analysis.md`
- Critique: `agent-output/critiques/006-android-suggest-provider-form-bugfix-critique.md`
- Implementation: `agent-output/implementation/closed/006-android-suggest-provider-form-bugfix.md`
- Code Review: `agent-output/code-review/closed/006-android-suggest-provider-form-bugfix-code-review.md`
- QA: `agent-output/qa/closed/006-android-suggest-provider-form-bugfix-qa.md`
- UAT: `agent-output/uat/closed/006-android-suggest-provider-form-bugfix-uat.md`
- Deployment: `agent-output/deployment/v0.3.1-readiness.md`, `agent-output/deployment/v0.3.1.md`
- Agent instructions (current):
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/critic.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/retrospective.agent.md`

### Handoff Patterns Observed

| Pattern | Frequency | Root Cause | Impact | Recommendation |
|---|---:|---|---|---|
| Acceptance gap discovered after review | 1 | v1 fix addressed mount-time focus but not post-mount programmatic changes | QA rework loop (v1 → v2) | Standardize “programmatic post-mount change” scenario for focus-related UI |
| Platform validation deferred | 1 | No Android device/emulator execution | Residual risk recorded, not eliminated | Require explicit deferral rubric + fallback path (emulator steps) |
| Lifecycle metadata drift in artifacts | 1+ | UUID mismatch (analysis vs plan) + critique not closed + date typo | Reduced traceability and audit clarity | Add explicit header inheritance checklists + critique closure rule |
| Missing dependency file in agent instruction | 1 | Critic requires reading `.github/chatmodes/planner.chatmode.md`, but file does not exist | Non-executable instruction; repeated friction | Update Critic instruction to “if exists” guard |

### Efficiency Metrics (Plan 006)

| Metric | Observed | Notes |
|---|---|---|
| Rework loops | 1 | v1 approved → QA acceptance gap → v2 fix |
| Late-stage blockers | 0 | Release executed cleanly once QA/UAT approved |
| Auditability break | Low | Docs existed and were linked; metadata drift reduced cleanliness |

---

## Recommendation Analysis

### R1 — QA/UAT Checklist: “Focus/Scroll Side Effects” (HIGH)

- **Source**: Retro 006 “Quality Gate Failures” + QA acceptance gap (post-mount programmatic auto-select)
- **Current state**:
  - QA and UAT templates are strong, but they do not explicitly call out *focus()/scroll* as a class of UX risk requiring both mount-time and post-mount programmatic-state scenarios.
  - Evidence: Plan 006 needed QA feedback to force explicit coverage of programmatic auto-select.
- **Proposed change**:
  1. Add a small reusable checklist in QA and UAT instructions:
     - If the change uses `focus()` (or can trigger browser focus), validate **three** scenario types:
       - **Mount with restored state** (localStorage/draft)
       - **Post-mount programmatic state change** (autocomplete/autofill)
       - **Explicit user action** (click/keydown)
  2. In QA doc format, include a template bullet for “post-mount programmatic change” under Required Unit Tests (when applicable).
- **Alignment**: Strong with QA’s “tests pass ≠ users safe” principle and UAT’s scenario-based validation.
- **Affected agents**: QA, UAT
- **Risk**: LOW (checklist only; does not mandate new tooling)

**Implementation template (QA)**

In `.github/agents/qa.agent.md`, add under Phase 1 “Test Strategy” (near Required Unit Tests):

> **Focus/Scroll side-effects checklist (WHEN APPLICABLE)**
> - If implementation uses `focus()` or can trigger input focus:
>   - Cover **mount-time restored state** (draft/localStorage)
>   - Cover **post-mount programmatic state change** (autocomplete/autofill)
>   - Cover **explicit user action** (click/keydown)
> - If manual mobile validation is deferred, record owner + rationale + risk.

**Implementation template (UAT)**

In `.github/agents/uat.agent.md`, add under “UAT Scenarios” guidance:

> If a change affects input focus/keyboard behavior on mobile, UAT scenarios MUST include:
> - Fresh visit
> - Restored draft
> - Autocomplete/autofill selection

---

### R2 — Planner Guardrail: UUID Inheritance Must Be Copy/Paste (MEDIUM)

- **Source**: Retro 006 “Misalignment Patterns” (analysis UUID differs from plan chain UUID)
- **Current state**:
  - Planner instructions already state: “Creating plan from analysis: read analysis ID/Origin/UUID and inherit those values”.
  - Despite that, Plan 006 artifacts show UUID drift between analysis and plan.
- **Proposed change**:
  - Strengthen Planner instructions with a mechanical rule:
    - “When planning from analysis, copy/paste the analysis frontmatter block into the plan; do not generate a new UUID.”
  - Add a closure check before moving analysis to `analysis/closed/`:
    - “Verify plan header matches analysis header for ID/Origin/UUID.”
- **Alignment**: Strong with `document-lifecycle` skill and traceability goals.
- **Affected agents**: Planner
- **Risk**: LOW

**Implementation template (Planner)**

In `.github/agents/planner.agent.md` under “Creating plan from analysis”, add:

> **Header inheritance (MANDATORY)**: Copy/paste the analysis doc’s `---` frontmatter into the plan, then change only `Status`.
> **Closure check**: Before moving the analysis doc to `agent-output/analysis/closed/`, verify the plan’s `ID/Origin/UUID` exactly match the analysis.

---

### R3 — Critic Closure Rule: Approved + Findings Resolved ⇒ Status “Resolved” + move to `closed/` (HIGH)

- **Source**: Retro 006 “Critique lifecycle not closed”
- **Current state**:
  - Critic instructions define closure trigger, but there is no explicit “final step” on APPROVED verdict tying it to marking the critique Resolved.
  - In practice, critiques can remain `Status: OPEN` even after “Revision 1 — APPROVED”.
- **Proposed change**:
  - Add explicit statement: If a critique reaches “APPROVED” and all findings are addressed, set Status to `Resolved` and move to `agent-output/critiques/closed/`.
- **Alignment**: Strong with document-lifecycle skill.
- **Affected agents**: Critic
- **Risk**: LOW

**Implementation template (Critic)**

In `.github/agents/critic.agent.md` under “Critique Lifecycle” or “Closure trigger”, add:

> **Rule of thumb**: If the plan is now APPROVED and there are no OPEN findings remaining, you MUST mark the critique `Status: Resolved` and move it to `agent-output/critiques/closed/`.

---

### R4 — Critic Chatmode Dependency: Guard Missing `.github/chatmodes/planner.chatmode.md` (MEDIUM)

- **Source**: Retro 006 critique F4; repo search shows no `.github/chatmodes/` directory or `*.chatmode.md` files.
- **Current state**:
  - Critic instructions require reading a missing file at every review start.
- **Proposed change**:
  - Replace hard requirement with conditional:
    - “If file exists, read it; if missing, proceed and log a LOW process note.”
- **Alignment**: Improves executability; prevents repeated friction.
- **Affected agents**: Critic
- **Risk**: LOW

**Implementation template (Critic)**

Replace the sentence:
- “Read `.github/chatmodes/planner.chatmode.md` at EVERY review start.”

With:
- “If `.github/chatmodes/planner.chatmode.md` exists, read it at review start. If it does not exist, proceed and record a LOW process note that the chatmode file is missing.”

---

### R5 — Timestamp Correctness: Require UTC timestamps (MEDIUM)

- **Source**: Retro 006 notes “exact phase timestamps not consistently recorded” + implementation report contains a year typo.
- **Current state**:
  - QA doc templates already request date/time fields; other phase docs are inconsistent.
- **Proposed change**:
  - Add a minimal requirement across doc-producing agents:
    - “If you include timestamps, use UTC and ISO-8601; do not leave placeholders.”
  - Keep this as “SHOULD” (not MUST) to avoid slowing hotfixes.
- **Alignment**: Improves retrospective variance calculations and audit trails.
- **Affected agents**: QA, UAT, Implementer, DevOps, Retrospective
- **Risk**: LOW

---

### R6 — Manual Mobile Matrix Deferral Rubric (MEDIUM)

- **Source**: Retro 006 “Manual Android matrix deferred”.
- **Current state**:
  - Plans can request manual device validation, but execution is often dependent on device availability.
- **Proposed change**:
  - Add a small rubric in QA/UAT docs when deferring mobile matrix:
    - owner, rationale, severity, and a “fallback execution path” (emulator or post-release smoke test).
- **Alignment**: Makes deferrals explicit and repeatable.
- **Affected agents**: QA, UAT
- **Risk**: LOW

---

## Conflict Analysis

| # | Recommendation | Conflicting Instruction / Evidence | Nature | Impact | Proposed Resolution | Resolved? |
|---:|---|---|---|---|---|---|
| C1 | R1 (focus checklist) | Planner constraint: “MUST NOT define QA processes/test cases/test requirements” | Scope creep risk | Checklist must live in QA/UAT, not in Planner | Implement as QA/UAT-only guidance; no plan-template additions | No |
| C2 | R2 (UUID copy/paste) | None direct; adds strictness beyond current wording | Logical strictness | Low risk; may surface more mismatches early | Frame as “MANDATORY copy/paste when inheriting” | No |
| C3 | R4 (chatmode missing) | Critic currently says MUST read missing file | Direct contradiction vs repo state | Instruction is non-executable | Make it conditional (“if exists”) or relocate to a file that exists | No |

---

## Logical Challenges

1. **Avoid over-prescribing test cases**
   - Affected: R1
   - Challenge: QA is responsible for tests; but we need repeatable acceptance coverage.
   - Proposed solution: Phrase as a *scenario checklist* “WHEN APPLICABLE”, not a mandatory test suite.

2. **Traceability fixes without rewriting history**
   - Affected: R2, R3
   - Challenge: Past docs already contain drift; closing them retroactively can be risky.
   - Proposed solution: Apply instruction changes going forward; only normalize frontmatter/status during closure events.

3. **Mobile validation availability**
   - Affected: R6
   - Challenge: Device/emulator constraints are real; mandates can block releases.
   - Proposed solution: Keep as a deferral rubric requirement (document it), not a hard gate.

---

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| R1 Focus/scroll checklist | LOW | Checklist only; prevents acceptance gaps | “WHEN APPLICABLE” phrasing; keep in QA/UAT |
| R2 UUID copy/paste rule | LOW | Improves traceability | Provide mechanical steps; block closure if mismatch |
| R3 Critique closure rule | LOW | Clarifies existing intent | Add explicit final-step instruction |
| R4 Chatmode file guard | LOW | Makes instructions executable | Conditional check; add process note |
| R5 UTC timestamps | LOW | Improves retrospective accuracy | Keep as SHOULD |
| R6 Deferral rubric | LOW | Makes residual risk explicit | Keep as documentation requirement |

---

## Implementation Recommendations (Prioritized)

### High-Impact, Low-Risk (implement first)

1. **R1** Add focus/scroll side-effects checklist to QA and UAT instructions.
2. **R3** Add explicit critique closure rule (Approved + no open findings ⇒ Resolved + move to closed).
3. **R4** Fix Critic’s missing chatmode dependency via conditional guard.

### Medium-Impact or Medium-Risk

4. **R2** Strengthen Planner UUID inheritance to “copy/paste frontmatter” + closure check.
5. **R6** Add mobile matrix deferral rubric (owner/rationale/severity/fallback).

### Low-Impact or High-Risk (defer)

6. **R5** UTC timestamps as “SHOULD” only; implement after confirming desired strictness.

---

## Suggested Agent Instruction Updates

**Candidate files**:
- `.github/agents/qa.agent.md` (R1, R6)
- `.github/agents/uat.agent.md` (R1, R6)
- `.github/agents/critic.agent.md` (R3, R4)
- `.github/agents/planner.agent.md` (R2)

**Implementation approach options**:
- **Option 1 (Minimal)**: Implement R1 + R3 + R4 only.
- **Option 2 (Standard)**: Option 1 + R2.
- **Option 3 (Full)**: Option 2 + R6 + R5.

**Validation plan**:
1. Start a new UI bug plan involving focus/keyboard risk; confirm QA/UAT include the three scenario types.
2. Create a plan from an analysis; confirm `ID/Origin/UUID` match by copy/paste and closure check.
3. Run a Critic review to APPROVED; confirm critique moves to `critiques/closed/` with `Status: Resolved`.

---

## User Decision Required

Choose one:
1. **Update now**: Approve Option 2 (R1 + R3 + R4 + R2) and I’ll implement instruction changes.
2. **Review first**: I’ll prepare exact diffs (quoted blocks) in this doc for your sign-off.
3. **Phase rollout**: Approve Option 1 now; revisit Option 2/3 after the next retrospective.
4. **Defer**: No instruction changes; keep this as documentation only.

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/006-android-suggest-provider-form-bugfix-retrospective.md`
- Plan: `agent-output/planning/closed/006-android-suggest-provider-form-bugfix.md`
- QA: `agent-output/qa/closed/006-android-suggest-provider-form-bugfix-qa.md`
- UAT: `agent-output/uat/closed/006-android-suggest-provider-form-bugfix-uat.md`
- Deployment: `agent-output/deployment/v0.3.1.md`
- Prior PI baseline: `agent-output/process-improvement/closed/006-process-improvement-analysis.md`
