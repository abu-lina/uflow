---
ID: 035
Origin: 035
UUID: 4d2c9a1e
Status: Active
---

# Process Improvement Analysis 035: Growth Pipeline Gate Integrity + Plan Decision Hygiene

**Source Retrospective**: `agent-output/retrospectives/closed/035-growth-traffic-users-providers-retrospective.md`  
**Date**: 2026-03-07  
**Scope**: Convert Retrospective 035 recommendations (R1–R6) into consistent agent-instruction updates (pending user approval).

> **NO-MEMORY MODE**: Flowbaby retrieval is unavailable; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 6 (R1–R6)
- **Primary systemic issues**:
  - **Gate integrity**: Planner handoff ordering allows architecture/implementation to start before a post-revision Critic approval is recorded.
  - **Decision hygiene**: Foundational plan decisions were expressed as "Open Questions" and only resolved after Critic blocked.
- **Overall risk**: **LOW–MEDIUM** (instruction changes only; primarily additive checklists + one ordering clarification)
- **Recommendation**: Implement **R1 + R2** now (high-impact, low-risk). Defer R3–R6 unless you want a broader workflow tightening.

---

## Changelog Pattern Analysis

### Documents reviewed (Plan 035 chain)

- `agent-output/planning/closed/035-growth-traffic-users-providers-v0.7.0.md`
- `agent-output/critiques/closed/035-growth-traffic-users-providers-critique.md`
- `agent-output/architecture/closed/035-growth-traffic-architecture-findings.md`
- `agent-output/implementation/closed/035-growth-traffic-users-providers-implementation.md`
- `agent-output/code-review/closed/035-growth-traffic-users-providers-code-review.md`
- `agent-output/qa/closed/035-growth-traffic-users-providers-qa.md`
- `agent-output/uat/closed/035-growth-traffic-users-providers-uat.md`
- `agent-output/deployment/v0.7.0.md`
- `agent-output/retrospectives/closed/035-growth-traffic-users-providers-retrospective.md`

### Handoff patterns (frequency / root cause / impact / recommendation)

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| Foundational decisions left as open questions | Recurring risk (growth plans) | Plans mix decision discovery with milestone definition | Critic blocks; extra revision cycle | R1 — Decision Record section + “no OPEN decisions at handoff” rule |
| Gate bypass after REVISION REQUESTED | Occurred in 035 | Planner handoff ordering + lack of explicit “re-review first” rule | Architecture/implementation can start before Critic re-approval | R2 — Formalise re-review gate as the only next step |
| Analytics infra shipped without north-star event wiring | Recurring risk | “Tooling done” mistaken for “measurement ready” | Weak ability to measure value of the release | R3 — UAT/QA measurement completeness checkpoint |
| Smoke tests executed against long-running dev server | Occasional | Dev server cache staleness after new module imports | False-negative 500s during release verification | R4 — Require fresh prod-like build for smoke |

### Efficiency metrics (035)

| Metric | Value |
|---|---:|
| Critique revision cycles | 1 |
| Implementation rework cycles | 0 |
| Fix-in-review cycles | 1 (MEDIUM resolved inline) |
| QA gate failures | 0 |

---

## Recommendation Analysis

### R1 — Add “Decision Record” section to plans (🆕)

- **Source**: Retrospective 035 (R1)
- **Current state**:
  - `@Planner` already requires an **OPEN QUESTION scan** before handoff: “Scan plan for any `OPEN QUESTION` items… ask user for explicit acknowledgment to proceed.”
  - However, foundational decisions can still be written as open questions and only resolved after Critic review.
- **Proposed change**:
  - Introduce a mandatory `## Decision Record` section in plans.
  - Enforce a rule: no `[OPEN]` decisions at Critic handoff; decisions must be `[RESOLVED]` or `[DEFERRED: owner + reason]`.
- **Alignment**: ✅ additive; strengthens existing open-question gate.
- **Affected agents**: `@Planner` (primary), `@Critic` (secondary check).
- **Implementation template (exact text to add)**:

Add to `.github/agents/planner.agent.md` under **Core Responsibilities** and **Process**:

- New requirement:
  - “**Decision Record (REQUIRED)**: Include `## Decision Record` with 3–8 items. Each item must be one of: `[RESOLVED]`, `[DEFERRED: owner + reason + target plan]`. `[OPEN]` items block handoff to `@Critic`.”

Add to `.github/agents/critic.agent.md` under **Review Method**:

- New check:
  - “If plan includes `## Decision Record`, verify there are no `[OPEN]` items; require explicit user acknowledgment for any `[DEFERRED]` items.”

- **Risk level**: LOW

---

### R2 — Formalise “Critic re-approval gate must close before architecture/implementation” (🆕)

- **Source**: Retrospective 035 (R2)
- **Current state**:
  - Orchestrator’s Feature pipeline ordering is: `Planner → … → Critic → Architect → Implementer` (Critic before Architect).
  - **But** `@Planner`’s handoff ordering currently includes architectural review *before* critique.

  From `.github/agents/planner.agent.md`:
  - Handoff: “Validate Architectural Alignment” → `@Architect`
  - Handoff: “Submit for Review” → `@Critic`

  This ordering makes it easy to start architecture work before a post-revision Critic approval is recorded.

- **Proposed change**:
  - Make Critic approval the gating prerequisite after any `REVISION REQUESTED` outcome.
  - Align Planner’s handoff guidance with Orchestrator’s pipeline order to prevent accidental bypass.
- **Alignment**: ⚠️ requires resolving an ordering inconsistency between `@Planner` and `@Orchestrator`.
- **Affected agents**: `@Planner`, `@Orchestrator` (doc clarity), optionally `@Architect` (acceptance: confirm Critic-approved input).

- **Implementation template (exact change options)**:

**Option A (preferred, simplest)** — update `@Planner` to match Orchestrator ordering:
- Reorder `handoffs:` in `.github/agents/planner.agent.md` so “Submit for Review” (Critic) comes before “Validate Architectural Alignment” (Architect).
- Add explicit rule:
  - “If Critic verdict is `REVISION REQUESTED`, the ONLY permitted next step is Planner revision → Critic re-review. Do not handoff to Architect/Implementer until Critic approves.”

**Option B (keep early architecture review, but gate it)**:
- Keep Architect handoff available, but add:
  - “Architect review is allowed only for first-pass feasibility, but MUST NOT begin if there is an outstanding `REVISION REQUESTED` critique.”

- **Risk level**: LOW–MEDIUM (changes workflow ordering expectations; but should reduce rework)

---

### R3 — Require north-star event wiring before analytics milestone is UAT-approved (🆕)

- **Source**: Retrospective 035 (R3)
- **Current state**:
  - QA and UAT correctly scoped CTA wiring as out-of-scope for v0.7.0.
  - This can create “analytics installed but not measuring the north-star event.”
- **Proposed change**:
  - Add a UAT (and optionally QA) checkpoint: if the milestone claims measurement readiness, validate that the north-star event can be triggered end-to-end.
- **Affected agents**: `@UAT` (primary), `@QA` (optional).
- **Risk level**: MEDIUM (could slow releases if applied rigidly; recommend as conditional rule)

---

### R4 — DevOps smoke tests must use fresh prod-like build (🆕)

- **Source**: Retrospective 035 (R4)
- **Current state**: Dev server staleness can create false negatives (module cache / `.next/` state).
- **Proposed change**: Document in `@DevOps` instructions: smoke test against `npm run build && npm start` (or restart dev server first).
- **Affected agents**: `@DevOps`
- **Risk level**: LOW

---

### R5 — Add carry-forward plan references at release time (🆕)

- **Source**: Retrospective 035 (R5)
- **Proposed change**: In `@DevOps`, require adding a “Carry-forward” entry to the plan changelog when a multi-milestone plan ships partial scope.
- **Risk level**: LOW

---

### R6 — Document ISR-page pattern in architecture reference (🆕)

- **Source**: Retrospective 035 (R6)
- **Proposed change**: Update `system-architecture.md` (or equivalent) with the “ISR + cookie-free Supabase” pattern.
- **Risk level**: LOW

---

## Conflict Analysis

| Conflict | Recommendation | Conflicting instruction | Nature | Impact | Proposed resolution | Resolved? |
|---|---|---|---|---|---|---|
| C1 | R2 | `.github/agents/planner.agent.md` handoffs (Architect before Critic) vs `.github/agents/orchestrator.agent.md` pipeline (Critic before Architect) | Logical inconsistency | Allows gate bypass after revision | Choose Option A: reorder Planner handoffs + add explicit “re-review first” rule | ⏸️ Pending user decision |

---

## Logical Challenges

1. **Early architecture review can be valuable**, but only if it doesn’t undermine the Critic gate.
   - Proposed solution: keep it, but explicitly prohibit it after `REVISION REQUESTED` until Critic re-approves (Option B), or align ordering entirely (Option A).

2. **Measurement completeness is context-dependent**: some analytics work is infra-only.
   - Proposed solution: apply R3 only when the plan claims a north-star KPI is “ready to measure” in the shipped release.

---

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| R1 | LOW | Additive plan structure + gating rules | Make it template-driven; keep 3–8 items |
| R2 | LOW–MEDIUM | Workflow expectation change; potential friction | Choose Option A; document clearly in Planner instructions |
| R3 | MEDIUM | Can become a release blocker if applied universally | Make conditional on milestone claims |
| R4 | LOW | Operational clarity only | Provide explicit command sequence |
| R5 | LOW | Documentation practice only | Keep to one short changelog row |
| R6 | LOW | Documentation only | Add concise reference implementation links |

---

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

- **R1**: Add Decision Record requirements to `@Planner` (+ small check in `@Critic`).
- **R2 (Option A preferred)**: Align Planner handoff ordering with Orchestrator pipeline + add explicit post-revision gate rule.

### Medium-Impact or Medium-Risk

- **R3**: Add “measurement completeness” checkpoint to `@UAT` (conditional).

### Low-Impact or High-Risk (defer)

- **R4–R6**: Good hygiene; can be batch-applied later.

---

## Suggested Agent Instruction Updates (pending approval)

**Files**:

- `.github/agents/planner.agent.md` (R1 + R2)
- `.github/agents/critic.agent.md` (R1 cross-check)
- `.github/agents/orchestrator.agent.md` (optional: clarify precedence; no behaviour change)
- `.github/agents/uat.agent.md` (optional: R3)
- `.github/agents/devops.agent.md` (optional: R4 + R5)

**Implementation approach**:

- Minimal, additive text inserts + (if Option A) reorder `handoffs:` block in `planner.agent.md`.

**Validation plan**:

- Run a dry-run on the next plan: ensure Decision Record exists and Critic gate cannot be bypassed.
- Watch for reduced “REVISION REQUESTED due to open questions” frequency.

---

## User Decision Required

Choose one:

1. **Update now (R1 + R2 only)** — safest, highest ROI
2. **Review first** — I’ll generate exact patches in this doc, but not apply
3. **Phase rollout** — R1/R2 now, R3–R6 next cycle
4. **Defer** — keep current workflow; revisit after another retrospective

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/035-growth-traffic-users-providers-retrospective.md`
- Plan: `agent-output/planning/closed/035-growth-traffic-users-providers-v0.7.0.md`
- Critique: `agent-output/critiques/closed/035-growth-traffic-users-providers-critique.md`
- Orchestrator instructions: `.github/agents/orchestrator.agent.md`
- Planner instructions: `.github/agents/planner.agent.md`
