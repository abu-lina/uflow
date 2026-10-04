---
ID: 048
Origin: 048
UUID: 5e9ac41b
Status: Active
---

# Agent Instruction Updates 048: DevOps Deployment Workflow

**Source**: `agent-output/retrospectives/closed/048-provider-modal-barakah-badges-retrospective.md`
**PI analysis**: `agent-output/process-improvement/048-process-improvement-analysis.md`
**Date**: 2026-03-22

## Summary

- **Recommendations implemented**: 6 (`P1`-`P6`)
- **Files updated**: 6 instruction files
- **Net effect**: reduces repeatable release friction around speculative version bumps, plan ID reuse, hidden PR conflicts, transient PR visibility, fragile markdown heredocs, and formatter-only rebase blockers.

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added preliminary-version guidance so implementation-stage version bumps are explicitly treated as provisional until DevOps Stage 1 confirms the final release version
- `.github/agents/planner.agent.md`
  - Added mandatory plan-ID collision check before allocating from `.next-id`
- `.github/skills/document-lifecycle/SKILL.md`
  - Added global pre-allocation verification against all `agent-output/` files, including `closed/`
- `.github/agents/analyst.agent.md`
  - Aligned originating-document ID allocation steps with the new collision-check requirement
- `.github/agents/orchestrator.agent.md`
  - Aligned the control-window worktree template with the new collision-check requirement before advancing `.next-id`
- `.github/agents/devops.agent.md`
  - Added markdown heredoc prohibition
  - Added formatter-only amend step before Stage 2 sync/rebase work
  - Reordered Stage 2 execution to push branch, surface PR URL, check conflicts, then tag
  - Added explicit PR comparison URL requirement after branch push

## Changes by Recommendation

- **P1 Version placeholder, not speculative bump**: ✅ Implemented
  - Implementer now records version bumps as preliminary until DevOps Stage 1 confirms the final version after tag pre-flight

- **P2 Scan `closed/` before allocating new ID**: ✅ Implemented
  - Planner, analyst, orchestrator, and document-lifecycle instructions now require collision checks across all `agent-output/` directories before claiming an ID from `.next-id`

- **P3 Open PR before tagging**: ✅ Implemented
  - DevOps Stage 2 now pushes the branch first, validates PR conflict status, and only then creates/pushes the tag

- **P4 Surface PR URL in response**: ✅ Implemented
  - DevOps must now include the compare URL after every branch push instead of relying on GitHub's temporary PR banner

- **P5 Prohibit shell heredocs for markdown**: ✅ Implemented
  - DevOps shell safety now explicitly forbids markdown heredocs and directs agents toward file tools or `/tmp/` scripts instead

- **P6 Amend formatter changes before rebase**: ✅ Implemented
  - DevOps Stage 2 now includes an explicit `git diff --name-only` inspection and amend step for formatter-only changes

## Validation Plan

Monitor the next 2 to 3 planning/release chains for:

- plan IDs that would previously have collided but now advance cleanly
- implementation docs that mark version bumps as preliminary rather than final
- release flows that surface PR links immediately and detect conflicts before tagging
- zero terminal corruption incidents from markdown heredocs during release/document work
- fewer Stage 2 pauses caused by stray formatter-only changes

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/048-provider-modal-barakah-badges-retrospective.md`
- PI analysis: `agent-output/process-improvement/048-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/048-agent-instruction-updates.md`