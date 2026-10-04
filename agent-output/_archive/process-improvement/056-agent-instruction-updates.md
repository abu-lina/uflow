---
ID: 056
Origin: 056
UUID: 9f2c6b1d
Status: Active
---

# Agent Instruction Updates 056: Plan 055 Release Workflow Gaps

**Source**: `agent-output/process-improvement/056-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/closed/055-joinhalal-provider-description-rpc-drift-fix-retrospective.md`
**Date**: 2026-03-23

## Summary

- **Files updated**: 5
- **Recommendations implemented (balanced set)**: R1, R2, R3, R4, R5, W2

## Files Updated

- `.github/agents/devops.agent.md`
  - Strengthened Stage 1 chain timestamp check to require causal monotonicity and prohibit guessed precise corrections (R4).
  - Added Stage 1 critique closure verification step (R1).
  - Clarified Stage 1 deployment doc lifecycle policy (R5).
  - Added mandatory post-release local sync step when Stage 2 runs in a clean release worktree (W2).
- `.github/agents/critic.agent.md`
  - Added a required duration-estimates check for plans (R2 enforcement).
- `.github/agents/planner.agent.md`
  - Added mandatory timestamp discipline block (R3).
- `.github/agents/qa.agent.md`
  - Added mandatory timestamp discipline block (R3).
- `.github/agents/retrospective.agent.md`
  - Added mandatory timestamp discipline block (R3).

## Changes by Recommendation

- **R1 (Critique closure verification)**: ✅ Implemented in DevOps Stage 1 lifecycle section.
- **R2 (Duration estimates enforcement)**: ✅ Implemented in Critic review method.
- **R3 (Timestamp discipline everywhere)**: ✅ Implemented for Planner/QA/Retrospective.
- **R4 (Monotonicity requirement)**: ✅ Implemented by strengthening DevOps Stage 1 timestamp check.
- **R5 (Stage 1 doc lifecycle clarity)**: ✅ Implemented as an explicit DevOps policy note.
- **W2 (Local sync after clean worktree Stage 2)**: ✅ Implemented as mandatory DevOps post-release step.

## Validation Plan

- Next plan chain should show:
  - Critic flags missing duration estimates.
  - QA uses full UTC timestamps for timeline + status transitions.
  - DevOps records timestamp anomalies without inventing exact times.
  - DevOps explicitly states whether the session worktree has been synced after Stage 2.
  - Critique docs no longer remain OPEN after release unless explicitly justified.

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-23T09:35Z | process-improvement | Implemented balanced-set agent instruction updates (R1/R2/R3/R4/R5/W2) |
