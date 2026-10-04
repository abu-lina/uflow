---
ID: 041
Origin: 041
UUID: 91c4b7e2
Status: Resolved
---

# Agent Instruction Updates 041: v0.8.1 Release Workflow Hardening

**Source**: `agent-output/retrospectives/closed/040-v0.8.1-outreach-improvements-retrospective.md`
**PI analysis**: `agent-output/process-improvement/041-process-improvement-analysis.md`
**Date**: 2026-03-13

## Summary

- **Recommendations implemented**: 4 (`PI-041-1` .. `PI-041-4`)
- **Files updated**: 3 agent instruction files
- **Net effect**: Front-loads mandatory DevOps skill loading, prevents stale skill-path guesses, makes same-plan lifecycle closure part of Stage 1 commit preparation, upgrades timestamp capture from advisory to mandatory, and forces UAT deferred residual risks to carry owner/trigger/evidence/tracker metadata.

## Files Updated

- `.github/agents/devops.agent.md`
  - Added **Phase-start skill preflight** for Stage 1
  - Added safe **skill-path resolution** fallback
  - Added `memory-contract` and `document-lifecycle` to mandatory Stage 1 skill list
  - Reordered **Stage 1 closure sequencing** so same-plan lifecycle closure is prepared before the final commit
  - Clarified **open-actions tracker trigger** to include UAT residual risks labeled deferred/post-release/follow-up required
  - Added mandatory **Timestamp Discipline** section

- `.github/agents/critic.agent.md`
  - Added mandatory **Timestamp Discipline** section

- `.github/agents/uat.agent.md`
  - Added mandatory **Deferred Follow-ups** requirements for non-blocking residual risks
  - Added mandatory **Timestamp Discipline** section
  - Extended UAT template `Next Actions` guidance to require owner/trigger/evidence/tracker destination for deferred follow-ups

## Changes by Recommendation

- **PI-041-1 DevOps skill-load ordering + skill-path resolution**: ✅ Implemented
- **PI-041-2 DevOps lifecycle-close sequencing**: ✅ Implemented
- **PI-041-3 Shared timestamp discipline (DevOps/Critic/UAT)**: ✅ Implemented
- **PI-041-4 UAT deferred-risk forward-tracking + matching DevOps trigger**: ✅ Implemented
- **PI-041-5 Dependabot handling via agent instructions**: ❌ Rejected by design; remains a dedicated security-plan item

## Validation Plan

Monitor over the next 2-3 workflow cycles:

- **DevOps phase-start behavior**: mandatory skills should be loaded in the first read-only batch before git operations begin.
- **Skill-path failures**: references to `.github/skills/` should replace guessed paths under `agent-output/`.
- **Stage 1 commit integrity**: same-plan deployment doc + lifecycle doc moves should land in the plan’s Stage 1 commit rather than a later orphan-sweep commit.
- **Timestamp quality**: Critic, UAT, and DevOps docs should show real UTC timestamps with chronological consistency.
- **Deferred residual risk visibility**: UAT-approved but deferred items should always carry owner, trigger/due window, evidence to close, and a tracker destination.

## Related Artifacts

- Retrospective (closed): `agent-output/retrospectives/closed/040-v0.8.1-outreach-improvements-retrospective.md`
- PI analysis: `agent-output/process-improvement/041-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/041-agent-instruction-updates.md`
