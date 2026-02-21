---
ID: 006
Origin: 006
UUID: 8f3c1a2d
Status: Active
---

# Process Improvement Analysis 006 — From Retro 005 (UAT Docker npm ci)

**Source Retrospective**: `agent-output/retrospectives/005-uat-docker-npm-ci-fix-retro.md`
**Date**: 2026-02-21
**Mode**: ProcessImprovement (no source code changes)

## Executive Summary

- **Recommendations extracted**: 4
  - High impact: 3
  - Medium impact: 1
  - Low impact: 0
- **Conflicts found**: 2
- **Overall risk**: LOW–MEDIUM (instruction-only changes; main risk is accidental scope expansion via new tool permissions)
- **Recommendation**: Implement the 3 High-impact items first as minimal, additive updates. Phase in the roadmap-tracking change after confirming preferred ownership (Planner vs DevOps vs Roadmap).

---

## Changelog Pattern Analysis

### Documents Reviewed

- Retrospective: `agent-output/retrospectives/005-uat-docker-npm-ci-fix-retro.md`
- Plan: `agent-output/planning/closed/005-uat-docker-npm-ci-fix.md`
- Implementation: `agent-output/implementation/closed/005-uat-docker-npm-ci-impl.md`
- Code Review: `agent-output/code-review/005-uat-docker-npm-ci-code-review.md`
- QA: `agent-output/qa/closed/005-uat-docker-npm-ci-qa.md`
- UAT: `agent-output/uat/closed/005-uat-docker-npm-ci-uat.md`
- Deployment: `agent-output/deployment/closed/v0.2.1-deployment.md`
- Agent instructions:
  - `.github/agents/devops.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/roadmap.agent.md`
  - `.github/agents/implementer.agent.md`
  - `.github/agents/code-reviewer.agent.md`

### Handoff Patterns Observed

| Pattern | Frequency | Root Cause | Impact | Recommendation |
|---|---:|---|---|---|
| UAT artifact creation blocked | 1 | UAT agent lacks edit tools + tool availability issues | Delayed audit trail; blocked handoff | Add UAT doc-write capability + preflight check |
| Document lifecycle metadata drift | 1+ | ID inheritance + status updates not consistently enforced at closure | Traceability degraded; harder automated closure | Add “Lifecycle invariants” checklist + closure normalization |
| DevOps git preflight incomplete | 1 | Remote sync check exists, but upstream tracking not guaranteed | Late-stage fixups, wasted time | Add upstream-tracking check to DevOps Stage 2 |
| Patch release not mirrored in roadmap tracker | 1 | Ownership unclear; no mandatory step in plan/DevOps/Roadmap chain | Release accounting drift | Add explicit tracker update responsibility |

### Efficiency Metrics (Plan 005)

| Metric | Observed | Notes |
|---|---|---|
| Rework loops | Low | Minimal back-and-forth across phases |
| Blocking issue surfaced late | Yes | Git upstream tracking discovered during DevOps Stage 2 |
| Auditability break | Yes | UAT doc creation initially blocked |

---

## Recommendation Analysis

### R1 — QA/UAT “Doc Tooling Readiness” Preflight (HIGH)

- **Source**: Retro 005: “UAT documentation was previously blocked by file tool availability”
- **Current state**:
  - QA/UAT workflows assume doc creation is possible, but there is no explicit preflight step.
  - UAT agent tools are read-only.
- **Proposed change**:
  1. Add a short preflight checklist to `.github/agents/qa.agent.md` and `.github/agents/uat.agent.md`:
     - confirm write tools available (or instruct user to enable them)
     - confirm domain directory exists (`agent-output/qa/`, `agent-output/uat/`)
  2. Update `.github/agents/uat.agent.md` to include edit tools required for creating UAT docs.
- **Alignment**: Strong. Both agents explicitly list “Create doc” as a deliverable.
- **Affected agents**: QA, UAT
- **Risk**: MEDIUM (tool permission expansion); mitigated by strict constraints in the agent instructions.

**Evidence of current mismatch (quote)**:
- `.github/agents/uat.agent.md` tools list is read-only: `tools: ['read/problems', 'read/readFile', 'search', ...]` but Core Responsibilities include “Create UAT document”.

**Implementation template (UAT agent tools + preflight)**

In `.github/agents/uat.agent.md`:
- Add edit tools (minimum set): `edit/createFile`, `edit/createDirectory`, `edit/editFiles` (optional), so UAT can create `agent-output/uat/...`.
- Add section under **Workflow** step 0:
  - “Preflight: verify write tools enabled; if not, ask user to enable create/edit tools before proceeding.”

In `.github/agents/qa.agent.md`:
- Add a short preflight note in Phase 1:
  - “Preflight: ensure `agent-output/qa/` exists; ensure create/edit tools are enabled before starting doc.”

---

### R2 — Enforce Document Lifecycle Invariants at Closure (HIGH)

- **Source**: Retro 005: “inconsistent frontmatter… Status: Active in closed/”
- **Current state**:
  - Multiple docs violate ID inheritance and status discipline.
  - Example: `agent-output/implementation/closed/005-uat-docker-npm-ci-impl.md` frontmatter:
    ```yaml
    ID: 005
    Origin: Orchestrator
    UUID: 005-uat-docker-npm-ci
    Status: Active
    ```
    This conflicts with Implementer’s own “inherit IDs” expectation in the overall workflow and with closure semantics (“closed/” implies terminal state).
- **Proposed change**:
  1. Add a cross-cutting “Lifecycle Header Checklist” snippet to doc-producing agents:
     - ID/Origin/UUID must be inherited from plan
     - Status must match phase (e.g., “Active/In Review/QA Complete/UAT Complete”) and be updated to Committed/Released during DevOps closure
  2. Add a DevOps Stage 1 step to normalize headers when closing docs:
     - verify each doc moved to closed/ has terminal status (“Committed” after Stage 1; “Released” after Stage 2)
     - if mismatch, update frontmatter before moving.
- **Alignment**: Strong with `document-lifecycle` skill and current DevOps responsibilities.
- **Affected agents**: DevOps (primary), Implementer, Code Reviewer, QA, UAT, Retrospective
- **Risk**: LOW (text/checklist). Potential risk is accidental edits to historical docs; mitigate by limiting changes to frontmatter only.

**Implementation template (DevOps closure normalization)**

In `.github/agents/devops.agent.md` Stage 1 step “Close committed documents”:
- Add sub-steps:
  - “Verify each doc frontmatter matches plan’s `ID/Origin/UUID`.”
  - “Update doc Status to `Committed` (Stage 1) before moving to closed/.”

In `.github/agents/implementer.agent.md`:
- Add explicit instruction in “Implementation Doc Format” section header:
  - “Frontmatter MUST inherit `ID/Origin/UUID` from the plan (copy/paste).”

In `.github/agents/code-reviewer.agent.md`:
- Same: “Frontmatter MUST inherit `ID/Origin/UUID` from the plan.”

---

### R3 — DevOps Upstream-Tracking Preflight (HIGH)

- **Source**: Retro 005: “main not tracking origin/main discovered late”
- **Current state**:
  - DevOps includes remote sync check (already added in PI 004):
    - `git fetch origin --prune --tags`
    - verify not behind
  - However, missing upstream tracking can still cause confusing status output and late fixes.
- **Proposed change**:
  - Add a small additional check right before the remote sync check:
    - Run `git branch -vv` and confirm current branch tracks expected remote branch.
    - If missing, run `git branch --set-upstream-to=origin/main main` (or equivalent).
- **Alignment**: Strong; reduces release friction.
- **Affected agents**: DevOps
- **Risk**: LOW

**Implementation template (DevOps Stage 2)**

In `.github/agents/devops.agent.md` Phase 2A (Release Readiness Verification), add:
- “Upstream tracking check (MANDATORY): `git branch -vv` must show `main...origin/main`. If not, set upstream before continuing.”

---

### R4 — Patch Release → Roadmap Release Tracker Update (MEDIUM)

- **Source**: Retro 005: “Roadmap tracking did not include Plan 005 by default”
- **Current state**:
  - Planner has “Track release assignment” guidance.
  - DevOps has “Report to Roadmap agent (handoff)” in Stage 1.
  - Roadmap agent owns release→plan mappings but there is no explicit trigger requiring a tracker update when a patch release is chosen mid-cycle.
- **Proposed change** (pick one owner; avoid duplication):
  - **Option A (DevOps owns)**: DevOps MUST send Roadmap handoff after Stage 1 commit and after Stage 2 release.
  - **Option B (Planner owns)**: Any plan proposing a patch release must include a “Roadmap tracker update” milestone.
- **Alignment**: Medium; depends on how strictly you want roadmap to reflect infra patch releases.
- **Affected agents**: DevOps, Planner, Roadmap
- **Risk**: LOW–MEDIUM (process overhead)

**Implementation template (Option A)**

In `.github/agents/devops.agent.md` Stage 1 step 10 and Stage 2 Post-Release step 4:
- Add explicit requirement: “Send handoff to Roadmap agent to update Active Release Tracker + Previous Releases table.”

---

## Conflict Analysis

| # | Recommendation | Conflicting Instruction / Evidence | Nature | Impact | Proposed Resolution | Resolved? |
|---|---|---|---|---|---|---|
| C1 | R1 (UAT must write docs) | `.github/agents/uat.agent.md` has read-only tools list but requires creating UAT doc | Direct contradiction | UAT can’t produce deliverable; workflow blocks | Add edit tools + strict scope constraint (“only create/modify `agent-output/uat/` + plan status”) | No |
| C2 | R2 (IDs must be inherited) | Observed docs have `Origin: Orchestrator`, non-inherited UUID; Implementer/Reviewer instructions imply inheritance | Logical inconsistency between policy and artifacts | Traceability and automated closure become unreliable | Add explicit checklist + DevOps closure normalization for headers/status | No |

---

## Logical Challenges

1. **Tooling permissions vs safety**: Giving UAT edit tools increases capability. Solution: restrict UAT instructions to doc creation + plan status updates only.
2. **Who owns roadmap accuracy for patch releases?**: Multiple agents can update it, creating duplication. Solution: pick a single owner (recommend DevOps because it observes committed/released truth).

---

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| R1 Doc tooling preflight + UAT write tools | MEDIUM | Expands tools; requires discipline | Add hard constraint limiting edits to `agent-output/uat/` + plan status only |
| R2 Lifecycle invariants + closure normalization | LOW | Text-only checklist; minor edits to frontmatter | Limit changes to frontmatter + status; no content rewrites |
| R3 DevOps upstream tracking check | LOW | Extra git command; no workflow change | Provide exact commands |
| R4 Roadmap tracker update ownership | LOW–MEDIUM | Process overhead/duplication risk | Assign single owner; minimal required fields |

---

## Implementation Recommendations (Prioritized)

### High-Impact, Low-Risk (implement first)

1. **R3** DevOps upstream-tracking preflight.
2. **R2** Lifecycle invariants checklist + DevOps closure normalization.

### High-Impact, Medium-Risk

3. **R1** Add doc-tooling preflight and give UAT the minimum edit tools to create UAT docs.

### Medium-Impact / Medium-Risk

4. **R4** Decide single-owner rule for roadmap tracker updates on patch releases.

---

## Suggested Agent Instruction Updates (Proposed; NOT YET APPLIED)

**Files likely to change (pending approval):**

- `.github/agents/uat.agent.md`
  - Add minimal edit tools required to create UAT docs
  - Add doc-tooling readiness preflight
  - Add explicit hard constraint on what UAT may edit

- `.github/agents/qa.agent.md`
  - Add doc-tooling readiness preflight

- `.github/agents/devops.agent.md`
  - Add upstream tracking preflight
  - Add closure normalization checklist for plan/impl/QA/UAT docs
  - (If adopting Option A for R4) make Roadmap handoff mandatory in Stage 1 + Stage 2

- `.github/agents/implementer.agent.md`
  - Add explicit doc-frontmatter inheritance checklist snippet

- `.github/agents/code-reviewer.agent.md`
  - Add explicit doc-frontmatter inheritance checklist snippet

**Validation plan (post-change):**
1. Create a new plan and verify new docs inherit `ID/Origin/UUID` correctly.
2. Run through QA → UAT: confirm doc creation is possible without tool churn.
3. Run DevOps Stage 2 preflight: confirm upstream tracking and remote sync checks produce clear status output.
4. Spot-check that docs in `closed/` always have terminal statuses.

---

## User Decision Required

Choose one:

1. **Update now**: Implement R2 + R3 immediately, and implement R1 with the minimal tool additions.
2. **Review first**: I’ll prepare exact before/after diff snippets for each agent file for your review.
3. **Phase rollout**: Apply only R2 + R3 now; defer R1 (UAT edit tools) and R4 until next iteration.
4. **Defer**: Keep current workflow; no instruction changes.

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/005-uat-docker-npm-ci-fix-retro.md`
- Plan: `agent-output/planning/closed/005-uat-docker-npm-ci-fix.md`
- Implementation: `agent-output/implementation/closed/005-uat-docker-npm-ci-impl.md`
- Code Review: `agent-output/code-review/005-uat-docker-npm-ci-code-review.md`
- QA: `agent-output/qa/closed/005-uat-docker-npm-ci-qa.md`
- UAT: `agent-output/uat/closed/005-uat-docker-npm-ci-uat.md`
- Deployment: `agent-output/deployment/closed/v0.2.1-deployment.md`
- Prior PI: `agent-output/process-improvement/closed/004-process-improvement-analysis.md`
- Prior PI updates: `agent-output/process-improvement/closed/004-agent-instruction-updates.md`
