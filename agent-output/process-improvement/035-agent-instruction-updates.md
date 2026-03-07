---
ID: 035
Origin: 035
UUID: 8b0c9f4a
Status: Active
---

# Agent Instruction Updates 035

**Source**: `agent-output/retrospectives/closed/035-growth-traffic-users-providers-retrospective.md`
**PI Analysis**: `agent-output/process-improvement/035-process-improvement-analysis.md`
**Date**: 2026-03-08

## Summary

- **Recommendations implemented**: 2 (R1, R2)
- **Files updated**: 2 agent instruction files
- **Net effect**: Prevents “post-revision gate bypass” and forces explicit plan decision hygiene before Critic handoff.

## Files Updated

- `.github/agents/planner.agent.md`
  - **R2 (Gate integrity)**: Reordered handoffs so `@Critic` review occurs before `@Architect` review (aligns with Orchestrator pipeline) and added an explicit rule: after `REVISION REQUESTED`, Planner must revise and return to `@Critic` before any handoff to `@Architect`/`@Implementer`.
  - **R1 (Decision hygiene)**: Added required `## Decision Record` section with a strict rule: no `[OPEN]` decisions at handoff; only `[RESOLVED]` or `[DEFERRED: owner + reason + target plan/version]`.

- `.github/agents/critic.agent.md`
  - **R1 (Decision hygiene check)**: Added a `Decision Record` review check: block approval if any `[OPEN]` decisions exist; require explicit user acknowledgement to proceed with `[DEFERRED]` decisions.

## Changes by Recommendation

- **R1 Decision Record section + enforcement**: ✅ Implemented (Planner + Critic)
- **R2 Critique re-approval gate before Architect/Implementer**: ✅ Implemented (Planner)

## Validation Plan

Next 2–3 plan cycles, monitor:

- **Critique revision loop count**: CRITICAL findings “unresolved foundational decisions” should trend down.
- **Gate integrity**: After any `REVISION REQUESTED`, architecture/implementation should not begin until Critic changelog shows **APPROVED**.
- **Deferrals**: `[DEFERRED]` decisions should be explicit, owned, and timeboxed (target plan/version).

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/035-growth-traffic-users-providers-retrospective.md`
- PI analysis: `agent-output/process-improvement/035-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/035-agent-instruction-updates.md`
