---
ID: 064
Origin: 064
UUID: f3a9c2d7
Status: Implemented
---

# Agent Instruction Updates 064

**Source**: `agent-output/process-improvement/064-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/060-onboarding-centering-bundle-retrospective.md`
**Date**: 2026-03-29

## Summary

6 recommendations implemented across 4 agent instruction files. 2 recommendations confirmed already covered (R3 by PI-059; R5 by existing step 5b).

## Files Updated

| File | Changes |
|---|---|
| `.github/agents/analyst.agent.md` | Added "State-Machine / Conditional-Render Bug Heuristic" section after Invisible Interceptor heuristic |
| `.github/agents/planner.agent.md` | Added "State-Machine Coverage Requirement" subsection under Plan Scope Guidelines |
| `.github/agents/uat.agent.md` | Added "Deferred visual gates: reachable-path scoping" note after Deferred Follow-ups block |
| `.github/agents/devops.agent.md` | Added step 8e (post-rebase integrity gate), smoke server instance discipline note in step 3b, step 3e (deployment doc normalization), replaced step 4 with enforced roadmap sync gate |

## Changes by Recommendation

| # | Title | Status | Agent changes |
|---|---|---|---|
| R1 | State-Machine Enumeration Gate | ✅ Implemented | `analyst.agent.md`: new heuristic section requiring full branch enumeration before Planner handoff. `planner.agent.md`: new coverage requirement under Plan Scope Guidelines. |
| R2 | Deferred Gate Reachable-Path Scoping | ✅ Implemented | `uat.agent.md`: new reachable-path scoping note requiring DF-N evidence be scoped to reachable states; unreachable states recorded separately with reason. |
| R3 | Stage 2 Remote Sync Preflight | ⏸️ Already covered | No change. PI-059 R2 (devops step 8) already requires fetch + rebase-before-push. |
| R4 | Post-Rebase Artifact Integrity Gate | ✅ Implemented | `devops.agent.md`: new step 8e: conflict-marker grep, JSON parse check, re-run build, re-run audit — all mandatory after any rebase. |
| R5 | Dev-Artifact Protection (Stage 2) | ⏸️ Already covered | No change. Existing step 5b covers both Stage 1 and Stage 2 (implicit scope). |
| R6 | Fresh-Instance Smoke Rule | ✅ Implemented | `devops.agent.md`: added "Smoke server instance discipline" note to step 3b — prefer fresh instance, confirm HEAD served, record port in deployment doc. |
| R7 | Post-Release Deployment Doc Normalization | ✅ Implemented | `devops.agent.md`: new step 3e requiring Status → Released, resolution of stale blocker/remaining-work sections. |
| R8 | Roadmap Sync Gate Enforcement | ✅ Implemented | `devops.agent.md`: replaced advisory step 4 with mandatory roadmap sync in same release window, or explicit named deferment (ROADMAP-SYNC) with owner/due/evidence. |

## Validation Plan

- **R1**: Next state-machine UI bug should show "all branches enumerated" in the analysis handoff and a branch-list milestone in the plan.
- **R2**: Next deferred visual gate should show a "reachable states" / "unreachable states" breakdown.
- **R4**: Next rebase during release should show 4-check post-rebase gate evidence in the readiness block.
- **R6**: Next release should record which port/instance was used for smoke checks.
- **R7**: Deployment doc Status should read `Released` immediately after release completion.
- **R8**: Next release should show either a same-window roadmap update or an explicit `ROADMAP-SYNC` deferment record.

## Related Artifacts

| Artifact | Path |
|---|---|
| PI analysis | `agent-output/process-improvement/064-process-improvement-analysis.md` |
| Source retrospective | `agent-output/retrospectives/060-onboarding-centering-bundle-retrospective.md` |
| Analyst agent | `.github/agents/analyst.agent.md` |
| Planner agent | `.github/agents/planner.agent.md` |
| UAT agent | `.github/agents/uat.agent.md` |
| DevOps agent | `.github/agents/devops.agent.md` |
| Prior overlapping PI | `agent-output/process-improvement/059-process-improvement-analysis.md` |
