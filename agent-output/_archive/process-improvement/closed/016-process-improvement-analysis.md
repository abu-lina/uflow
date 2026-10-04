---
ID: 016
Origin: 016
UUID: b84a0f3d
Status: Resolved
---

# Process Improvement Analysis 016: Retro 015 instruction codification

**Source Retrospective**: `agent-output/retrospectives/015-pwa-miui-form-rendering-retrospective.md`
**Scope**: Repeatable process improvements + agent instruction updates (no production code changes).
**Date**: 2026-02-23

## Executive Summary

**Recommendations extracted**: 5

- R1: Codify **design-review UAT** as an acceptable approach for CSS/layout-only fixes (with explicit constraints + residual-risk logging)
- R2: Codify **automated-first QA** for CSS/layout-only fixes (no forced unit tests; require clear evidence + explicit manual validation deferral tracking)
- R3: Add a **DevOps evidence template** to standardize Stage 1 + Stage 2 deployment docs
- R4: Make **UTC ISO-8601 timestamps** consistent across planning + critique artifacts (not just QA/UAT/DevOps)
- R5: Add **Related Issues linking** guidance to plans so every artifact chain can tie back to the originating bug/feature request

**Overall risk**: **LOW–MEDIUM**
- LOW: Additive documentation standards and conditional checklists
- MEDIUM: Any allowance for “design review” in lieu of device validation can be misapplied if not tightly scoped

**Recommended action**: Apply R1–R5 now (user-approved). Keep changes conditional and explicit to avoid weakening quality gates.

## Changelog

| Date       | Action           | Summary |
| ---------- | ---------------- | ------- |
| 2026-02-23 | Analysis created | Extracted R1–R5 from Retro 015; validated against current agent instructions; prepared implementation templates |
| 2026-02-23 | Updates applied  | Implemented R1–R5 across Planner/Critic/QA/UAT/DevOps agent instructions; created PI update summary |

## Changelog Pattern Analysis

### Documents Reviewed

- Retrospective: `agent-output/retrospectives/015-pwa-miui-form-rendering-retrospective.md`
- Agent instructions:
  - `.github/agents/uat.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/critic.agent.md`

### Observed Handoff Patterns (Plan 015)

| Pattern | Frequency (Plan 015) | Root cause | Impact | Recommended change |
| --- | ---:| --- | --- | --- |
| UAT approved on doc/design verification (no device) | 1 | Physical device access unavailable during workflow | Faster ship, but residual uncertainty | R1: allow design-review UAT for CSS/layout-only fixes with strict constraints + explicit deferral tracking |
| QA relied on automated gates for CSS/layout fix | 1 | CSS changes not unit-testable in jsdom; risk assessed as low | Fast cycle time, clear evidence trail | R2: codify “automated-first QA for CSS/layout-only changes” and define when manual validation can be deferred |
| DevOps evidence trail was high quality but ad hoc | 1 | Good execution, but evidence formatting relies on individual discipline | Great auditability, but could vary | R3: add a small evidence template block for Stage 1/2 docs |
| Timestamp guidance existed but inconsistently applied | recurring | Some artifacts use date-only; others use ISO timestamps | Harder timeline reconstruction | R4: standardize UTC ISO-8601 guidance for Planner/Critic (and their doc templates) |
| Originating bug/issue link not explicitly recorded in the plan header | 1 | No explicit “Related Issues” field required | Harder to trace user report → fix chain | R5: require “Related Issues” field in plan header |

## Recommendation Analysis

### R1 — UAT: Design-review UAT for CSS/layout-only fixes (CONDITIONALLY ALLOWED)

**Source**: Retro 015 “UAT design review approach for CSS/layout bug”.

**Current state**:
- UAT is explicitly “document-based review” and already includes a deferral rule for manual validation when relevant.
- However, there is no explicit rule clarifying when a design-review UAT is acceptable for CSS/layout-only fixes and what evidence/risk documentation must be present.

**Proposed change** (additive, conditional):
- Add a small section defining “CSS/layout-only change” and allowing “design-review UAT” when strict gates are satisfied.
- Require explicit recording of: rationale, residual risk, and a post-deploy validation owner/path if manual device testing is deferred.

**Affected files**:
- `.github/agents/uat.agent.md`

**Implementation template** (to add under “Core Responsibilities” or near existing focus/scroll checklist):

> **Design-review UAT for CSS/layout-only changes (CONDITIONALLY ALLOWED)**
> - Allowed only when the implementation is **CSS/layout-only** (no TS/JS behavior changes) and:
>   - QA status is **QA Complete** with automated gates run (tests + build)
>   - Code Review verdict is **APPROVED**
>   - Change is defensive and includes safe fallbacks (progressive enhancement)
> - If manual device validation is deferred, UAT MUST document: owner, rationale, severity, and fallback execution path.
> - UAT MUST include at least one scenario focused on the original user-visible symptom (“blank screen”, “missing fields”, etc.).

**Risk**: MEDIUM if applied broadly.

**Mitigation**:
- Keep it explicitly conditional and define “CSS/layout-only” narrowly.

---

### R2 — QA: Automated-first QA for CSS/layout-only fixes (explicitly supported)

**Source**: Retro 015 “QA automated-first strategy reduced cycle time”.

**Current state**:
- QA process is comprehensive and includes timestamp guidance + a manual validation deferral rule.
- There is no explicit guidance about when it is acceptable for CSS/layout-only changes to rely primarily on automated gates and avoid test creation pressure.

**Proposed change** (additive, conditional):
- Add a subsection for “CSS/layout-only changes”:
  - Do not require new unit tests when not meaningful in jsdom.
  - Require automated gates (type-check, tests, build, delta lint).
  - Require a small “manual validation” note (performed vs deferred, with owner).

**Affected files**:
- `.github/agents/qa.agent.md`

**Implementation template**:

> **CSS/layout-only changes (QA guidance)**
> - If the change is CSS/layout-only (no JS/TS runtime behavior changes), QA SHOULD:
>   - Prefer automated gates as primary evidence (type-check, unit tests, build, delta lint)
>   - Avoid forcing new unit tests that can’t validate the behavior (document the limitation)
>   - Require explicit manual validation status: executed vs deferred (owner/rationale/severity/fallback)

**Risk**: LOW.

---

### R3 — DevOps: Evidence template for Stage 1 + Stage 2 docs

**Source**: Retro 015 “evidence trail complete… commands documented”.

**Current state**:
- DevOps instructions include detailed workflows and Stage 2 evidence capture requirements.
- Stage 1 lacks a standardized “minimal evidence block” in the doc format.

**Proposed change**:
- Add a compact evidence snippet template for Stage 1 docs.
- Add a short “evidence block” template to be pasted into Stage 2 docs (reusing existing requirements).

**Affected files**:
- `.github/agents/devops.agent.md`

**Implementation template**:

> **Evidence block (RECOMMENDED)**
> - Record:
>   - `git status`
>   - `git diff --name-only HEAD~1..HEAD` (or commit hash after commit)
>   - `git log --max-count 10 --date=iso-strict`
> - Paste outputs (trim if huge) into the deployment doc.

**Risk**: LOW (documentation-only, optional/recommended).

---

### R4 — UTC ISO-8601 timestamps: extend consistency to Planner + Critic

**Source**: Retro 015 “timestamp guidance existed but inconsistently applied”.

**Current state**:
- QA/UAT/DevOps/Implementer already include explicit UTC ISO-8601 guidance.
- Planner/Critic do not explicitly standardize timestamps for changelog entries.

**Proposed change**:
- Add UTC ISO-8601 guidance to Planner and Critic doc templates (changelog tables).

**Affected files**:
- `.github/agents/planner.agent.md`
- `.github/agents/critic.agent.md`

**Risk**: LOW.

---

### R5 — Planner: “Related Issues” linking in plan header

**Source**: Retro 015 “issue link not explicitly recorded”.

**Current state**:
- Plans have value statements and strong structure but do not mandate issue traceability links.

**Proposed change**:
- Require a “Related Issues” field in the plan header section.
- If no issue exists, explicitly record “None”.

**Affected files**:
- `.github/agents/planner.agent.md`

**Risk**: LOW.

## Conflict Analysis

| Recommendation | Potential conflict | Conflicting instruction | Nature | Resolution |
| --- | --- | --- | --- | --- |
| R1 | Could be misread as permission to skip validation | UAT: “Treat unverified assumptions as findings” | Scope creep / quality bypass risk | Make it conditional + require explicit residual-risk logging + manual validation deferral tracking |
| R2 | Could be misread as “skip QA” | QA: “Verify implementation works correctly for users” | Quality gate bypass risk | Require automated gates + explicit manual validation status; clarify it’s an evidence strategy, not a waiver |
| R3 | Adds overhead under time pressure | DevOps: “Methodical, checklist-driven” | Potential bottleneck | Keep as RECOMMENDED template; Stage 2 evidence already mandatory |
| R4 | None | N/A | Additive | Add one-line guidance |
| R5 | None | N/A | Additive | Add header field |

## Logical Challenges

| Challenge | Affected recommendations | Clarification needed | Proposed solution |
| --- | --- | --- | --- |
| Defining “CSS/layout-only” | R1, R2 | What counts as “layout-only”? | Define narrowly: no TS/JS runtime behavior changes; no focus/scroll programmatic behavior changes; if in doubt, treat as not layout-only |
| Manual device validation deferral can be forgotten | R1, R2 | How to ensure follow-up? | Require explicit “executed vs deferred” block with owner + fallback path in QA/UAT docs |

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
| --- | --- | --- | --- |
| R1 | MEDIUM | “Design review” can be misapplied | Conditional + explicit evidence prerequisites + deferral tracking |
| R2 | LOW | Formalizes existing practice for CSS changes | Require automated gates; document limitations |
| R3 | LOW | Template improves consistency | Keep minimal; avoid huge outputs |
| R4 | LOW | Pure formatting guidance | Provide examples |
| R5 | LOW | Traceability improvement | Use “None” when not applicable |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

1. R5 — Planner: Related Issues linking
2. R4 — Planner/Critic: UTC ISO-8601 timestamp guidance
3. R2 — QA: CSS/layout-only automated-first guidance

### Medium-Impact or Medium-Risk

1. R1 — UAT: Design-review UAT rule (conditional)

### Low-Impact, Low-Risk

1. R3 — DevOps: Evidence templates

## Suggested Agent Instruction Updates

**Files to update**:
- `.github/agents/planner.agent.md` (R4, R5)
- `.github/agents/critic.agent.md` (R4)
- `.github/agents/qa.agent.md` (R2)
- `.github/agents/uat.agent.md` (R1)
- `.github/agents/devops.agent.md` (R3)

**Validation plan**:
- Next CSS/layout-only plan:
  - Plan includes Related Issues links
  - QA and UAT explicitly document whether device validation was executed or deferred (with owner)
  - UAT uses design-review UAT only when preconditions are satisfied
- Next release:
  - Deployment docs include evidence blocks consistently

## User Decision Required

- **Chosen**: Update now (approved by user on 2026-02-23)

## Related Artifacts

- Source retrospective: `agent-output/retrospectives/015-pwa-miui-form-rendering-retrospective.md`
- Related plan: `agent-output/planning/closed/015-pwa-recommend-form-missing-fields.md`
- Prior PI precedent (format reference): `agent-output/process-improvement/closed/014-process-improvement-analysis.md`
