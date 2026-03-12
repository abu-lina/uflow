---
ID: 036
Origin: 036
UUID: 7a6f0c3b
Status: Implemented
---

# Process Improvement Analysis 036: Tool Restrictions + PWA Dev Artifact Guardrails + Lifecycle Metadata Consistency

**Source Retrospective**: `agent-output/retrospectives/closed/036-analytics-activation-event-instrumentation-retrospective.md`  
**Date**: 2026-03-08  
**Scope**: Convert Retrospective 036 recommendations (P1–P6) into consistent agent-instruction updates (implemented for P1/P2/P4/P5/P6).

> **NO-MEMORY MODE**: Flowbaby tools are not available in this environment; proceeding artifact-first.

## Executive Summary

- **Recommendations analyzed**: 6 (P1–P6)
- **Primary systemic issues**:
  - **Unconfigured tool invocation**: Atlassian/Jira/Confluence MCP tools were invoked despite being unconfigured for this workspace (401), causing repeated friction.
  - **Environment-driven git hazards**: Next.js dev-mode PWA fallback artifacts can silently alter `public/` and appear in `git status`.
  - **Lifecycle metadata drift**: At least one lifecycle doc (Code Review) had non-inherited `Origin/UUID` and remained outside `closed/`.
- **Overall risk**: **LOW** (instruction changes only; additive guardrails + checklist tightening)
- **Recommendation**: Implement **P1 + P2 + P4** first (high-impact, low-risk). Then implement **P5 + P6** as a second pass.

---

## Changelog Pattern Analysis

### Documents reviewed (Plan 036 chain)

- `agent-output/planning/closed/036-analytics-activation-event-instrumentation-v0.7.1.md`
- `agent-output/critiques/closed/036-analytics-activation-event-instrumentation-critique.md`
- `agent-output/architecture/036-analytics-activation-architecture-findings.md`
- `agent-output/implementation/closed/036-analytics-activation-event-instrumentation-implementation.md`
- `agent-output/code-review/036-analytics-activation-event-instrumentation-code-review.md`
- `agent-output/qa/closed/036-analytics-activation-event-instrumentation-qa.md`
- `agent-output/uat/closed/036-analytics-activation-event-instrumentation-uat.md`
- `agent-output/deployment/036-stage1-commit-v0.7.1.md`
- `agent-output/retrospectives/closed/036-analytics-activation-event-instrumentation-retrospective.md`

### Handoff patterns (frequency / root cause / impact / recommendation)

| Pattern | Frequency | Root cause | Impact | Recommendation |
|---|---:|---|---|---|
| Unconfigured MCP tool invoked | 2× in same session | “Available tool” treated as “configured tool” | 401 errors + user frustration | P1 — hard ban Atlassian MCP tools in agent instructions |
| Dev server generates/stages artifacts | 1× near-miss | Dev-mode PWA fallback file generation under `public/` | Risk of committing silent regression | P2 — Stage 1 checklist: explicit PWA fallback review |
| Lifecycle doc metadata drift + orphan doc | 1× observed | Closure checklist omitted code-review artifacts | Inconsistent chain metadata + doc not in `closed/` | P4 — include code-review in lifecycle sweep + closure |

### Efficiency metrics (036)

| Metric | Value |
|---|---:|
| Critique revision cycles | 1 |
| Implementation rework cycles | 0 |
| QA gate failures | 0 |
| Tool invocation errors | 2 (Atlassian MCP 401) |
| Dev-artifact incidents | 1 (PWA fallback interference) |

---

## Recommendation Analysis

### P1 — Restrict unconfigured Atlassian MCP tools (🆕 HIGH)

- **Source**: Retrospective 036 (P1)
- **Current state**:
  - No agent instruction file explicitly bans `mcp_atlassian_atl_search` / `mcp_com_atlassian_search`.
  - Some agent instructions reference Jira/Confluence in a general sense (e.g., “Related Issues”) but do not define tool restrictions.
- **Proposed change**:
  - Add a workspace-wide rule to all agents: **Never invoke Atlassian MCP tools** in this repo.
  - Provide fallback behavior: ask the user to paste/export the ticket content or provide a URL; proceed without MCP.
- **Alignment**: ✅ additive; enforces explicit user preference; reduces repeated 401 friction.
- **Affected agents**: All `.github/agents/*.agent.md` (most importantly `orchestrator.agent.md` + `pi.agent.md`).
- **Implementation template (exact text to add)**:

Add a short section near the top (after Purpose/Constraints) in each agent file:

```md
## Workspace Tool Restrictions (MANDATORY)

- **Do not use Atlassian/Jira/Confluence MCP tools in this workspace**: `mcp_atlassian_atl_search`, `mcp_com_atlassian_search`.
- Rationale: Not configured here; returns 401 Unauthorized; user has explicitly requested this never be used again.
- Fallback: Ask the user to provide the ticket text/link (or export) and proceed artifact-first.
```

- **Risk**: LOW (policy text only)

---

### P2 — DevOps Stage 1: add PWA fallback artifact check (🆕 MEDIUM)

- **Source**: Retrospective 036 (P2)
- **Current state**:
  - `devops.agent.md` includes strong git hygiene and lifecycle closure steps, but does **not** call out dev-mode PWA fallback artifacts under `public/`.
- **Proposed change**:
  - Add a Stage 1 checklist item: if `npm run dev` (or any dev server) was running, explicitly check `git status` for unexpected fallback file changes and restore the production fallback from git if needed.
- **Alignment**: ✅ additive; prevents silent regressions.
- **Affected agents**: `devops.agent.md`.
- **Implementation template (exact text to add)**:

In `devops.agent.md`, under **STAGE 1: Commit Execution** add:

```md
9b. **PWA dev-artifact check (MANDATORY if dev server ran)**:
   - If `npm run dev` (or any Next.js dev server) was running during the session, inspect `git status` for unexpected changes under `public/`, especially `public/fallback-*.js`.
   - If a production fallback file appears deleted/modified, restore it from git before committing.
   - Ensure dev-only fallback artifacts are gitignored (current known pattern: `**/public/fallback-development.js`).
```

- **Risk**: LOW (checklist only)

---

### P3 — Frontmatter inheritance: enforce for Code Review + make failure mode explicit (⚠️ MEDIUM)

- **Source**: Retrospective 036 (P3)
- **Current state**:
  - `code-reviewer.agent.md` already contains “ID inheritance (MANDATORY)” and a correct header template.
  - However, Plan 036’s code review artifact was created with `Origin: Planner` and a non-chain UUID, and remained unclosed.
- **Proposed change**:
  - Keep `code-reviewer.agent.md` as-is (it is already correct), but add a **DevOps enforcement sweep** (see P4) and optionally strengthen the Code Reviewer instruction with an explicit example of forbidden values (`Origin: Planner`).
- **Alignment**: ✅ improves enforcement rather than expanding policy surface.
- **Affected agents**: Primarily `devops.agent.md`; optionally `code-reviewer.agent.md`.
- **Implementation template (optional strengthening)**:

Add one bullet under `code-reviewer.agent.md` ID inheritance:

```md
- Example anti-pattern: `Origin: Planner` or `UUID: plan-...` (do not do this; always copy the plan header verbatim).
```

- **Risk**: LOW

---

### P4 — DevOps Stage 1: include Code Review in lifecycle invariants + closure list (🆕 MEDIUM)

- **Source**: Retrospective 036 (P4)
- **Current state**:
  - `devops.agent.md` Stage 1 closure list currently logs closing: planning, implementation, qa, uat.
  - Code review is omitted from the explicit list, which makes it easier for code-review docs to remain outside `closed/` and/or drift in frontmatter.
- **Proposed change**:
  - Update Stage 1 closure step to include `code-review` docs in both the invariant sweep and the “moved to closed/” log.
- **Alignment**: ✅ additive; strengthens lifecycle invariants.
- **Affected agents**: `devops.agent.md`.
- **Implementation template (exact text change)**:

In `devops.agent.md` Stage 1 “Close committed documents” section, change:

- “Update Status … on plan, implementation, qa, uat docs”
- “Closed documents … planning, implementation, qa, uat moved to closed/”

to include code review:

```md
- Update Status … on plan, implementation, code-review, qa, uat docs
...
- Log: "Closed documents for Plan [ID]: planning, implementation, code-review, qa, uat moved to closed/"
```

- **Risk**: LOW

---

### P5 — Track deferred post-release milestones in an open-actions note (🆕 LOW)

- **Source**: Retrospective 036 (P5)
- **Current state**:
  - Deferred post-deploy validations (e.g., “M3 dashboard validation”) tend to be captured inside closed artifacts, which reduces day-to-day visibility.
- **Proposed change**:
  - Add a DevOps rule: when a plan defers post-deploy validations, create a lightweight “open actions” note that remains visible after lifecycle closure.
- **Alignment**: ✅ improves operational follow-through without changing product behavior.
- **Affected agents**: `devops.agent.md` (and optionally `roadmap.agent.md` for a periodic sweep).
- **Implemented change**:
  - Updated `devops.agent.md` Stage 1 to require creation of `agent-output/planning/[ID]-open-actions.md` (Status: Active) whenever the plan/UAT records deferred post-deploy validations.
  - Updated Stage 2 to ensure deferred validations have an owner + closure criteria via the same tracker.
- **Implementation template (candidate)**:

```md
If any milestone is explicitly deferred post-release (e.g., dashboard validation), create an open-actions tracker note (Status: Active) that stays out of `closed/` until completed.
```

- **Open design choice**: where to place the tracker (see Logical Challenges).
- **Risk**: LOW

---

### P6 — NO-MEMORY MODE declaration on Flowbaby failure (🆕 LOW)

- **Source**: Retrospective 036 (P6)
- **Current state**:
  - Many agents include “If tools fail, announce no-memory mode immediately” but only a few require an explicit **memory health check** at task start.
- **Proposed change**:
  - Add a consistent “memory health check” pattern to all agents (or at minimum the agents that often start mid-chain: QA/UAT/DevOps/Code Reviewer/Implementer).
- **Alignment**: ✅ improves transparency about context gaps.
- **Affected agents**: Most `.github/agents/*.agent.md`.
- **Implemented change**:
  - Standardized a “Memory Health Check (MANDATORY)” preflight across the agent instruction set (typically as a section before “Memory Contract”; the Retrospective agent already covers this as a Process checklist item), requiring one Flowbaby retrieval at task start and explicit **NO-MEMORY MODE** declaration on failure.
- **Implementation template (exact text to add)**:

```md
At the start of work, run one Flowbaby retrieval. If it errors or returns 0 results when results are expected, explicitly declare: "⚠️ NO-MEMORY MODE: Flowbaby unavailable — proceeding artifact-first."
```

- **Risk**: LOW

---

## Conflict Analysis

| Item | Recommendation | Conflicting/related current instruction | Nature | Impact | Resolution |
|---|---|---|---|---|---|
| C1 | P1 (ban Atlassian MCP tools) | Tooling environment may expose Atlassian MCP tools | Environmental mismatch | Agents may “try what’s available” and hit 401 | Add explicit workspace restriction section to all agents |
| C2 | P4 (close code-review docs in Stage 1) | Stage 1 closure list omits code-review | Checklist gap | Orphaned metadata drift persists | Expand list + add explicit closure step |
| C3 | P5 (open-actions note) | PI agent constraint: only create artifacts in `agent-output/process-improvement/` | Process constraint | PI cannot directly create planning trackers | Implement via DevOps instruction update (future behavior) |

---

## Logical Challenges

| Challenge | Affects | Clarification needed | Proposed resolution |
|---|---|---|---|
| Tracker location for deferred milestones | P5 | Should the tracker live in `agent-output/planning/` (visible to roadmap) or in a dedicated folder? | Prefer `agent-output/planning/` for visibility; keep minimal 1-page format; Roadmap can sweep it |
| Atlassian tool ban enforcement scope | P1 | Apply to all agents or only Orchestrator/PI? | Apply to all agents to prevent recurrence from any phase entrypoint |

---

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| P1 | LOW | Text-only restriction; aligns with explicit user preference | Keep wording short + consistent; provide clear fallback |
| P2 | LOW | Checklist addition only | Keep scope narrow: only `public/` fallback patterns |
| P3 | LOW | Optional small wording tweak | Prefer DevOps enforcement (P4) over broad edits |
| P4 | LOW | Checklist/list expansion | Ensure closure step matches document-lifecycle terminal statuses |
| P5 | LOW | New lightweight tracking behavior | Keep note format minimal; add Roadmap sweep guidance if needed |
| P6 | LOW | Adds transparency, not new work | Apply to high-friction phases first if rollout needed |

---

## Implementation Recommendations (Priority Order)

### High-impact, low-risk (implement first)

1. ✅ **P1** — Add “Workspace Tool Restrictions” section to all agents. (Implemented)
2. ✅ **P2** — Add explicit PWA fallback artifact check to DevOps Stage 1. (Implemented)
3. ✅ **P4** — Expand DevOps lifecycle sweep/closure to include code-review artifacts. (Implemented)

### Medium-impact or medium-risk

4. ✅ **P6** — Add explicit memory health check language + NO-MEMORY MODE declaration. (Implemented)

### Low-impact or high-risk (defer)

5. ✅ **P5** — Add open-actions tracker pattern for deferred milestones. (Implemented)

---

## Suggested Agent Instruction Updates

**Files** (candidate set):

- All agent files for P1: `.github/agents/*.agent.md`
- DevOps for P2/P4/P5: `.github/agents/devops.agent.md`
- Optional small reinforcement for P3: `.github/agents/code-reviewer.agent.md`

**Implementation approach**:

- Use a single standardized snippet for P1 inserted in the same relative location in each file.
- Keep P2/P4 changes localized to the Stage 1 checklist section.

**Validation plan** (post-update):

- Re-scan `.github/agents/` for “Atlassian MCP” and confirm consistent wording.
- Confirm DevOps Stage 1 closure checklist explicitly includes `code-review`.
- (Optional) Run a quick grep for `Origin: Planner` / `UUID: plan-` inside `agent-output/` to catch drift early.

---

## Decision Record

- 2026-03-08: User approved **Update now**; implemented **P1 + P2 + P4**.
- 2026-03-08: User approved proceeding with remaining items; implemented **P5 + P6**.

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/036-analytics-activation-event-instrumentation-retrospective.md`
- Plan: `agent-output/planning/closed/036-analytics-activation-event-instrumentation-v0.7.1.md`
- Code review (needs normalization/closure): `agent-output/code-review/036-analytics-activation-event-instrumentation-code-review.md`
- DevOps Stage 1/2 evidence: `agent-output/deployment/036-stage1-commit-v0.7.1.md`