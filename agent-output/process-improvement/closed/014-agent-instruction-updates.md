---
ID: 014
Origin: 014
UUID: d1c3a9f2
Status: Resolved
---

# Agent Instruction Updates 014 — Implementing PI 014 (Apply Now)

**Source analysis**: `agent-output/process-improvement/014-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/013-v0.6.0-release-retrospective.md`
**Date**: 2026-02-23

## Summary

- **Option implemented**: Update now (apply changes directly)
- **Files updated**: 4 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)
- **Recommendations implemented**:
  - ✅ R1: Code Review checklist for file-move/path-refactor stale references
  - ✅ R2: QA conditional path regression check for file moves/renames
  - ✅ R3: Planner mandatory same-release scan + `## Release Strategy`
  - ✅ R4: DevOps Stage 2 stage-adherence evidence capture
  - ⏸️ R5: CI stale-path guard deferred (requires a separate plan + repo changes)

## Files Updated

- `.github/agents/code-reviewer.agent.md`
  - Added **Path Refactor / File-Move Checklist (MANDATORY when applicable)** to Core Responsibilities

- `.github/agents/qa.agent.md`
  - Added **Path regression check (MANDATORY when applicable)** to Phase 2 Post-Implementation Test Execution

- `.github/agents/planner.agent.md`
  - Added **Release bundling check (MANDATORY)** requirement and documented it in the planning Process

- `.github/agents/devops.agent.md`
  - Added **Stage adherence evidence (MANDATORY)** to Stage 2 readiness verification

## Changes by Recommendation

| Recommendation | Status | Notes |
| --- | --- | --- |
| R1 | ✅ | Conditional checklist + “if one found, search all” rule |
| R2 | ✅ | Conditional QA check; documents search terms/results |
| R3 | ✅ | Forces explicit bundling/standalone declaration |
| R4 | ✅ | Minimal evidence capture; anomalies must be documented |
| R5 | ⏸️ | Requires CI/script changes; not in ProcessImprovement scope |

## Validation Plan

1. Next file-move plan: Code Review doc records old-path search terms + results; QA should not find additional stale references.
2. Next multi-plan same-release scenario: each plan includes `## Release Strategy` and lists bundled plans.
3. Next release: DevOps readiness doc includes stage-adherence evidence commands and notes any anomalies.

## Related Artifacts

- PI analysis: `agent-output/process-improvement/014-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/013-v0.6.0-release-retrospective.md`
