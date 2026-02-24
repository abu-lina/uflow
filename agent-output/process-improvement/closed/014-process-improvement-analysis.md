# Process Improvement Analysis 014: v0.6.0 Retrospective Actions

**Source Retrospective**: `agent-output/retrospectives/013-v0.6.0-release-retrospective.md`
**Scope**: Repeatable process improvements + agent instruction updates (no production code changes).
**Date**: 2026-02-23

---
ID: 014
Origin: 014
UUID: d1c3a9f2
Status: Resolved
---

## Executive Summary

## Changelog

| Date       | Action             | Summary |
| ---------- | ------------------ | ------- |
| 2026-02-23 | Analysis created   | Extracted R1–R5 from Retrospective 013 and validated against current agent instructions |
| 2026-02-23 | Updates implemented | Applied R1–R4 instruction updates (Code Reviewer, QA, Planner, DevOps); deferred R5 (CI automation) |

**Recommendations extracted**: 5 (3 agent-instruction updates, 1 DevOps validation tightening, 1 CI automation recommendation)

**Overall risk**: **LOW–MEDIUM**
- LOW: Additive checklists and explicit handoff expectations
- MEDIUM: Any change that could increase process overhead if applied too broadly

**Top repeatable failure mode**: stale path references after file moves were caught in QA instead of Code Review, causing a fix loop.

## Changelog Pattern Analysis

### Documents Reviewed
- `agent-output/retrospectives/013-v0.6.0-release-retrospective.md`
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/qa.agent.md`
- `.github/agents/planner.agent.md`
- `.github/agents/devops.agent.md`

### Observed Handoff Patterns

| Pattern | Frequency (v0.6.0 bundle) | Root cause | Impact | Recommended process change |
| --- | --- | --- | --- | --- |
| QA→Implementer→QA fix loop due to missed stale paths | 1 | No mandatory exhaustive grep/search step for file-move refactors in Code Review | +10 min cycle time; avoidable operational risk | Add Code Review “file-move” checklist item + “if you find one, search all” rule |
| Multi-plan bundling clarified late (DevOps Stage 2) | 1 | Planning doesn’t require enumerating other plans targeting same release | User confusion (“is it now two plans?”); coordination friction | Planner: add “release bundling scan + strategy” step |
| Stage timing ambiguity (push before Stage 1 complete) | 1 | DevOps instructions emphasize stage separation but don’t require audit note if history suggests deviation | Reduced confidence in gate adherence | DevOps: add explicit verification note + evidence commands |

### Efficiency Metrics (from Retrospective 013)

| Metric | Plan 011 | Plan 012 | Notes |
| --- | --- | --- | --- |
| Rework loops | 0 | 1 | Triggered by stale nginx path references |
| QA outcome | PASS_WITH_NOTES | Failed → Pass | QA caught what Code Review partially missed |
| Dominant issue type | N/A | Stale path references | Predictable and automatable |

## Recommendation Analysis

### R1 — Code Review: “File-move refactor” path regression checklist

**Source**: Retrospective 013 “Issue 1: Stale path detection happened at QA, not Code Review”.

**Current state** (Code Reviewer agent): no explicit requirement to run grep/search for moved paths; focus is general review steps.

**Relevant current instruction text** (excerpt):
- “Review ALL modified/created files listed in the Implementation doc”
- “Provide actionable findings…”

**Proposed change** (additive): When the Implementation includes file moves/renames or path updates, require a quick exhaustive search for old path fragments in high-risk areas.

**Proposed implementation template** (to add to `.github/agents/code-reviewer.agent.md` under Workflow or Responsibilities):

> **File-move / path refactor checklist (MANDATORY when applicable)**
> - If the change includes file moves/renames or path updates: run a repo search for the *old* path(s) in `scripts/`, `.github/workflows/`, `deploy/`, and `docs/`.
> - If you find **one** stale reference, assume there may be more: recommend/require an exhaustive search before approval.
> - Record the search terms used and the files checked in the Code Review doc.

**Alignment**: Matches Code Reviewer’s purpose (“catch early where cheapest”).

**Risk**: LOW if scoped to “when applicable”.

---

### R2 — QA: Formalize “stale path” check trigger (only when file moves occur)

**Source**: Retrospective 013 “Success 1: Grep-based stale path detection” + “Issue 2: No automated stale path check in CI”.

**Current state** (QA agent): has broad validation requirements, but no named, repeatable checklist item for file-move/path-refactor regressions.

**Relevant current instruction text** (excerpt):
- “Identify code changes; inventory test coverage”
- “Validate real workflows, realistic edge cases, integration points”

**Proposed change** (additive): Add a small “Path regression check (when file moves occur)” step to QA Phase 2 so QA consistently runs the same fast check.

**Proposed implementation template** (to add to `.github/agents/qa.agent.md` Phase 2):

> **Path regression check (MANDATORY when applicable)**
> - If the plan includes file moves/renames: run a repo search for old path fragments in `scripts/`, `.github/workflows/`, and `deploy/`.
> - Document commands/terms used and resulting fixes (if any) in the QA report.

**Alignment**: Reinforces QA’s “safety net” role without expanding scope.

**Risk**: LOW.

---

### R3 — Planner: Add explicit “multi-plan same-release scan” and “Release Strategy” section

**Source**: Retrospective 013 “Issue 2: No explicit Plan 011 + Plan 012 bundling decision point”.

**Current state** (Planner agent): explicitly allows multi-plan same-release targeting but does not require scanning existing plans for coordination.

**Relevant current instruction text** (excerpt):
- “This version groups plans—multiple plans may share the same target release.”
- “Plans are grouped by release, not released individually.”

**Proposed change**: Make coordination explicit: when setting Target Release, check for other active plans with the same release and record bundling strategy.

**Proposed implementation template** (to add to `.github/agents/planner.agent.md` in Core Responsibilities or Process):

> **Release bundling check (MANDATORY)**
> - When setting `Target Release: vX.Y.Z`, scan `agent-output/planning/` for other non-closed plans targeting the same version.
> - If found, add a short `## Release Strategy` section:
>   - “Bundled with: Plan NNN …”
>   - Any sequencing notes (e.g., “Docs-first plan should land before file-move plan”).
> - If none found, explicitly state “Release Strategy: Standalone (no other known plans for this version).”

**Alignment**: Strengthens an already-stated rule; reduces late-stage coordination surprises.

**Risk**: LOW.

---

### R4 — DevOps: Add explicit audit note for stage adherence evidence

**Source**: Retrospective 013 “Issue 2: DevOps Stage 1 vs Stage 2 timing unclear”.

**Current state** (DevOps agent): clearly describes stage separation and the “no push without approval” rule, but does not mandate capturing evidence that the repo state matches the stage model.

**Relevant current instruction text** (excerpt):
- “Two-stage workflow: Commit locally on plan approval, push/deploy only on release approval.”
- “Do NOT push yet.”

**Proposed change**: Require a short “Stage adherence evidence” snippet in Stage 2 readiness doc.

**Proposed implementation template** (to add to `.github/agents/devops.agent.md` Stage 2 / readiness section):

> **Stage adherence evidence (MANDATORY)**
> - Before user confirmation, capture evidence commands in the readiness doc:
>   - `git status`
>   - `git branch -vv`
>   - `git fetch origin --prune --tags`
>   - `git log --max-count 20 --date=iso-strict` (to show commit ordering)
> - If you observe signs that a push already occurred earlier than expected, explicitly document: what you observed, likely explanation (manual vs automation), and whether it violates the “no push without approval” rule.

**Alignment**: Improves confidence and traceability without changing the core policy.

**Risk**: MEDIUM (could add friction); mitigate by keeping it “evidence capture” only and short.

---

### R5 — CI automation: “no stale paths” validation

**Source**: Retrospective 013 “Issue 2: No automated stale path check in CI”.

**Current state**: No guaranteed CI guardrail for stale path references after file moves.

**Proposed change**: Create a follow-on plan to add a lightweight validation script and a CI step.

**Note**: This is **not** an agent-instruction change; it requires repository code changes and should be planned as its own small plan.

**Risk**: MEDIUM (false positives if poorly scoped); mitigate by scoping patterns narrowly (only known old path segments for the PR/plan), or maintaining an allowlist.

## Conflict Analysis

No direct contradictions found. All recommendations are **additive** and align with existing goals.

| Recommendation | Potential conflict | Conflicting instruction (quote) | Nature | Proposed resolution | Resolved? |
| --- | --- | --- | --- | --- | --- |
| R1 | Over-broad “always grep” could add overhead | (none explicitly) | Scope creep risk | Make it conditional: **only when file moves/renames occur** | ✅ |
| R3 | Planner already coordinates releases but not required to scan | “Plans are grouped by release, not released individually.” | Gap, not contradiction | Add mandatory scan + explicit Release Strategy section | ✅ |
| R4 | Evidence capture could slow releases | “Prioritize user confirmation… Methodical” | Potential bottleneck | Keep it minimal; only evidence commands, not deep forensic analysis | ✅ |

## Logical Challenges

| Challenge | Affected recommendations | Clarification needed | Proposed solution |
| --- | --- | --- | --- |
| “Old paths” are not always obvious in refactors | R1, R2, R5 | What terms should reviewers search for? | Require Implementer to list “Moved paths (old → new)” in implementation doc; reviewers use that list for searches |
| CI stale-path guard can false-positive | R5 | What is the ground truth list? | Treat as per-plan guard: script reads a plan-provided list of forbidden substrings; avoid global static list |

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
| --- | --- | --- | --- |
| R1 | LOW | Fast, conditional; prevents avoidable QA loops | Gate only on file-move/path-refactor work |
| R2 | LOW | QA already does similar checks informally | Keep it as “when applicable” |
| R3 | LOW | Pure documentation/coordination | Keep scan lightweight; list only active non-closed plans |
| R4 | MEDIUM | Adds extra steps under time pressure | Keep commands short; only document anomalies |
| R5 | MEDIUM | CI noise risk | Narrow patterns; per-plan forbid-list; allowlist escape hatch |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)
1. R1 — Code Reviewer “file-move checklist” + “if one found, search all” rule
2. R3 — Planner “Release Strategy” bundling scan
3. R2 — QA “path regression check” trigger

### Medium-Impact or Medium-Risk
1. R4 — DevOps stage adherence evidence capture

### Low-Impact or High-Risk (defer)
1. R5 — CI automation (create a new plan; do not bundle into unrelated work)

## Suggested Agent Instruction Updates

**Files affected (proposed)**:
- `.github/agents/code-reviewer.agent.md` (add file-move checklist)
- `.github/agents/qa.agent.md` (add conditional path regression check)
- `.github/agents/planner.agent.md` (add bundling scan + Release Strategy section)
- `.github/agents/devops.agent.md` (add stage adherence evidence capture)

**Validation plan**:
- Next time a plan includes file moves, verify:
  - Code Review doc records search terms and results
  - QA does not discover additional stale paths beyond Code Review
- Next time multiple plans target a single release, verify:
  - Each plan includes Release Strategy section
  - DevOps readiness doc includes correct plan bundle list

## User Decision Required

Choose one:
1. **Update now**: Apply R1–R4 to agent instruction files immediately (requires explicit approval).
2. **Review first**: I’ll prepare a patch preview (exact diff text) for your review, then apply after approval.
3. **Phase rollout**: Apply only R1 + R3 first; revisit R2 + R4 after observing one cycle.
4. **Defer**: Keep as guidance only; no instruction changes.

## Related Artifacts

- Retrospective: `agent-output/retrospectives/013-v0.6.0-release-retrospective.md`
- Agent instructions:
  - `.github/agents/code-reviewer.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/devops.agent.md`
