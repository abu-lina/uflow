---
ID: 004
Origin: 004
UUID: 4b8a1f3c
Status: Active
---

# Agent Instruction Updates 004 — Implemented from Retro 003

**Source**: `agent-output/process-improvement/004-process-improvement-analysis.md`
**Date**: 2026-02-21

## Summary

- **Files updated**: 2
- **Recommendations implemented**: 2 (R1, R3)
- **Scope**: Instruction-only changes; no source code/test changes.

## Files Updated

- `.github/agents/planner.agent.md`
  - Added **Duration Estimates (REQUIRED)** to Core Responsibilities and Response Style.

- `.github/agents/devops.agent.md`
  - Added **Remote sync check (MANDATORY)** to Stage 2 / Phase 2A readiness verification.

## Changes by Recommendation

- ✅ **R1 — Require Duration Estimates in Plans**
  - Implemented in Planner instructions.

- ✅ **R3 — DevOps Stage 2 Remote Divergence Preflight**
  - Implemented in DevOps Stage 2 readiness verification.

- ⏸️ **R2 — Estimated Complexity in Plans**
  - Not implemented (out of scope for Option 1).

- ⏸️ **R5 — Critic checklist: duration estimates**
  - Not implemented (out of scope for Option 1).

- ⏸️ **R4 — Release branch strategy**
  - Deferred (workflow change; not requested).

- ⏸️ **R6 — Retrospective patterns library**
  - Deferred (premature until 3+ retrospectives).

## Validation Plan

- Confirm Planner outputs now include a “Duration Estimates” section in future plans.
- Confirm DevOps Stage 2 runs `git fetch origin --prune --tags` and blocks tagging when behind remote.

## Related Artifacts

- PI analysis: `agent-output/process-improvement/004-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/003-console-errors-hydration-cors-retro.md`
