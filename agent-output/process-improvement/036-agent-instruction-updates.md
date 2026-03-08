---
ID: 036
Origin: 036
UUID: 91d0f4a8
Status: Implemented
---

# Agent Instruction Updates 036: Atlassian MCP Ban + DevOps Stage 1 Guardrails

**Source Retrospective**: `agent-output/retrospectives/closed/036-analytics-activation-event-instrumentation-retrospective.md`  
**Source PI Analysis**: `agent-output/process-improvement/036-process-improvement-analysis.md`  
**Date**: 2026-03-08

## Summary

- **Recommendations implemented**: 5 (P1, P2, P4, P5, P6)
- **Files updated**: 14 agent instruction files
- **Overall change type**: additive policy/checklist updates (no product code changes)

## Files Updated

- `.github/agents/analyst.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/architect.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/code-reviewer.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/critic.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/devops.agent.md` — add Workspace Tool Restrictions + Stage 1 checklist updates
- `.github/agents/implementer.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/orchestrator.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/pi.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/planner.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/qa.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/retrospective.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/roadmap.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/security.agent.md` — add Workspace Tool Restrictions section
- `.github/agents/uat.agent.md` — add Workspace Tool Restrictions section

## Changes By Recommendation

### P1 — Restrict unconfigured Atlassian MCP tools (✅)

- Added a standardized section to every agent file:
  - Hard rule: never invoke `mcp_atlassian_atl_search` / `mcp_com_atlassian_search`
  - Rationale: unconfigured for this workspace (401) + explicit user request
  - Fallback: ask user for ticket text/link/export; proceed artifact-first

### P2 — DevOps Stage 1: PWA fallback artifact check (✅)

- Updated `.github/agents/devops.agent.md` Stage 1 checklist:
  - New Step **5b**: if dev server ran, inspect `git status` for unexpected changes under `public/`, especially `public/fallback-*.js`
  - Restore any production fallback deletions/modifications from git before committing
  - Ensure dev-only fallback artifacts are gitignored (known pattern: `**/public/fallback-development.js`)

### P4 — DevOps Stage 1: include code-review docs in lifecycle sweep/closure (✅)

- Updated `.github/agents/devops.agent.md` Stage 1 closure step to include `code-review` docs:
  - Status updates now include: plan, implementation, **code-review**, qa, uat
  - Closure log now includes: planning, implementation, **code-review**, qa, uat

### P5 — Track deferred post-release milestones in an open-actions note (✅)

- Updated `.github/agents/devops.agent.md` Stage 1 checklist:
  - New Step **8b**: if plan/UAT records deferred post-deploy validations, create `agent-output/planning/[ID]-open-actions.md` (Status: Active)
  - Tracker must include: deferred item, owner, trigger/due, and evidence link required to close
  - Added a minimal copy/paste template for the tracker to keep format consistent

- Updated `.github/agents/roadmap.agent.md` orphan-sweep routine:
  - Added an “open-actions sweep” to surface active `*-open-actions.md` trackers in the roadmap’s **Blocking Items**.

### P6 — NO-MEMORY MODE declaration on Flowbaby failure (✅)

- Standardized a “Memory Health Check (MANDATORY)” preflight across agent instruction files (typically placed before “Memory Contract”; Retrospective already had it in the Process checklist):
  - Requires one Flowbaby retrieval attempt at task start
  - On failure/unavailability: explicitly declare **NO-MEMORY MODE** and proceed artifact-first

## Validation Plan

- Repo-wide check: grep `.github/agents/` for `mcp_atlassian_atl_search` and confirm every agent file contains the restriction section.
- DevOps correctness check: confirm Stage 1 includes **5b** (PWA dev artifact check) and closure step includes **code-review**.
- Optional hygiene check: scan `agent-output/` for lifecycle docs with mismatched frontmatter (`Origin: Planner`, `UUID: plan-...`) and normalize during the next Stage 1 closure.

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/036-analytics-activation-event-instrumentation-retrospective.md`
- PI analysis: `agent-output/process-improvement/036-process-improvement-analysis.md`
