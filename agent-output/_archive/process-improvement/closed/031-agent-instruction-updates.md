---
ID: 31
Origin: 31
UUID: 5f2c9d8a
Status: Resolved
---

# Agent Instruction Updates 031 — Implementing Retro 031 Improvements (Wave A)

**Source analysis**: `agent-output/process-improvement/closed/031-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/031-orchestrator-dynamic-skills-retrospective.md`
**Date**: 2026-03-01

## Summary

- **Decision**: Update now (user-approved Wave A: R1/R2/R3/R5)
- **Files updated**: 12 agent instruction files (root + exports)
- **Scope**: Instruction-only changes (no source code/tests)

**Drift repair note (2026-03-01)**: Root agent instruction files were re-synced to match the export mirrors for Wave A after drift was detected.

## Files Updated

- `.github/agents/orchestrator.agent.md`
  - Added **Memory Health Check (MANDATORY)**: attempt one retrieval early; if tool errors, declare **NO-MEMORY MODE** and proceed artifact-first

- `.github/agents/pi.agent.md`
  - Added **Memory Health Check (MANDATORY)** at start of PI process

- `.github/agents/retrospective.agent.md`
  - Added **Memory Health Check (MANDATORY)** that handles tool errors (daemon lock), not just empty results

- `.github/agents/code-reviewer.agent.md`
  - Added **Agent Spec / Cross-Workspace Path Checklist (MANDATORY when applicable)** to prevent silent failures from path assumptions

- `.github/agents/qa.agent.md`
  - Added **Workflow-Only / Agent Instruction Changes (WHEN APPLICABLE)** guidance to formalize spec/document QA without misapplying to runtime code changes

- `.github/agents/devops.agent.md`
  - Made **multi-line commit message reliability** mandatory: create temp commit message file and use `git commit -F` (no heredocs)

- `exports/generic-workflow/.github/agents/orchestrator.agent.md`
  - Mirrored root changes

- `exports/generic-workflow/.github/agents/pi.agent.md`
  - Mirrored root changes

- `exports/generic-workflow/.github/agents/retrospective.agent.md`
  - Mirrored root changes

- `exports/generic-workflow/.github/agents/code-reviewer.agent.md`
  - Mirrored root changes

- `exports/generic-workflow/.github/agents/qa.agent.md`
  - Mirrored root changes

- `exports/generic-workflow/.github/agents/devops.agent.md`
  - Mirrored root changes

## Additional Workflow Hygiene

- `agent-output/.next-id`
  - Bumped to `32` to avoid ID collisions (max observed chain ID is `031`)

- `.github/prompts/skill-routing.prompt.md`
  - Removed hard-coded `skills/data/catalog.json` reference; now instructs search-based discovery (consistent with multi-root workspaces)

## Changes by Recommendation

| Recommendation                                        | Status | Notes                                                                                          |
| ----------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| PI-031-R1 — Session-start memory health check         | ✅     | Prevents late discovery of Flowbaby daemon lock; standardizes early NO-MEMORY MODE declaration |
| PI-031-R2 — Cross-workspace path audit in Code Review | ✅     | Targets agent specs/path references; requires explicit fallback for cross-root paths           |
| PI-031-R3 — QA workflow-only/spec QA template         | ✅     | Constrains use to workflow-only plans; avoids forcing meaningless unit tests                   |
| PI-031-R5 — DevOps multi-line commit message standard | ✅     | Eliminates heredoc/quoting failures by making `git commit -F` mandatory when multi-line        |

## Validation Plan

1. Next session where Flowbaby is locked:
   - Orchestrator/PI/Retrospective explicitly declare **NO-MEMORY MODE** on turn 1 (not mid-task)

2. Next plan that changes `.github/agents/*.agent.md` or references cross-root paths:
   - Code Reviewer records path checks + fallback verification in the Code Review doc

3. Next workflow-only plan (agent spec/doc changes only):
   - QA uses the workflow-only/spec QA checklist and documents any deferred interactive validations with owner + deadline window

4. Next time DevOps needs a multi-paragraph commit message:
   - Uses a temp commit message file + `git commit -F` (no heredocs)

## Related Artifacts

- Analysis: `agent-output/process-improvement/closed/031-process-improvement-analysis.md`
- Retrospective: `agent-output/retrospectives/closed/031-orchestrator-dynamic-skills-retrospective.md`
