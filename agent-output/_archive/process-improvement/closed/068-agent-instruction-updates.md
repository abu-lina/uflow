---
ID: 068
Origin: 064
UUID: 6c2a1e4d
Status: Implemented
---

# Agent Instruction Updates 068 (from Retrospective 064)

**Source**: `agent-output/retrospectives/closed/064-iconify-sw-cors-fix-retrospective.md`
**PI Analysis**: `agent-output/process-improvement/closed/068-process-improvement-analysis.md`
**Date**: 2026-03-29

## Summary

Implemented the approved Option **B** changes to reduce recurring pipeline rework:

- **R1**: Add mandatory post-commit working-tree verification (`git status --short`) before handoff
- **R2 (hybrid)**: Ensure pipeline artifacts are committed before QA runs clean-tree checks
- **R3**: Document a scoped env-gated build exception pattern for QA (with explicit alternative evidence requirements)

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added to `Pre-Handoff QA Gate (MANDATORY)`:
    - commit implementation doc before handoff
    - `git status --short` check to detect unintended working-tree changes

- `.github/agents/code-reviewer.agent.md`
  - Expanded workflow step `9. If APPROVED` to commit the Code Review doc before handing off to QA

- `.github/agents/qa.agent.md`
  - Added `Build Gate: Env-Gated Failure Exception (WHEN APPLICABLE)` with strict scope and evidence requirements

## Changes by Recommendation

| Rec | Status | Notes |
|-----|--------|------|
| R1 | ✅ Implemented | Prevents silent working-tree reversions from reaching QA/UAT |
| R2 | ✅ Implemented | Reduces QA failures caused by uncommitted pipeline docs |
| R3 | ✅ Implemented | Prevents repeated negotiation of DF-4 env-gated build failures |
| R4 | ⏸️ Deferred | Low impact for Plan 064; revisit if scope drift recurs |

## Validation Plan

- Next plan run:
  - Implementer handoff should have committed implementation doc + clean `git status --short`
  - Code Reviewer handoff to QA should include committed CR doc
  - QA should cite env-gated build exception only when failure matches known DF-4 pattern and evidence is recorded

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-29T12:45Z | process-improvement | Created update summary document |
