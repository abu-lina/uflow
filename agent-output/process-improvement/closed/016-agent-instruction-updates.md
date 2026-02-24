---
ID: 016
Origin: 016
UUID: b84a0f3d
Status: Resolved
---

# Agent Instruction Updates 016 — Implementing Retro 015 Improvements

**Source analysis**: `agent-output/process-improvement/016-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/015-pwa-miui-form-rendering-retrospective.md`
**Date**: 2026-02-23

## Summary

- **Decision**: Update now (user-approved)
- **Files updated**: 5 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)

## Files Updated

- `.github/agents/planner.agent.md`
  - Added **Related issues linking (REQUIRED)** guidance
  - Added UTC ISO-8601 timestamp guidance

- `.github/agents/critic.agent.md`
  - Added UTC ISO-8601 timestamp guidance

- `.github/agents/qa.agent.md`
  - Added **CSS/layout-only changes** guidance (automated-first evidence + explicit manual validation deferral tracking)
  - Added a conditional note clarifying TDD-table exceptions for CSS-only changes

- `.github/agents/uat.agent.md`
  - Added **Design-review UAT for CSS/layout-only changes** rule (conditional, evidence-gated)

- `.github/agents/devops.agent.md`
  - Added Stage 1 evidence block template (recommended)
  - Added Stage 2 evidence formatting guidance (recommended)

## Changes by Recommendation

| Recommendation | Status | Notes |
| --- | --- | --- |
| R1 — Design-review UAT for CSS/layout-only | ✅ | Added conditional rule + evidence prerequisites in UAT agent instructions |
| R2 — Automated-first QA for CSS/layout-only | ✅ | Added guidance + explicit manual validation executed/deferred requirement |
| R3 — DevOps evidence template reuse | ✅ | Added recommended evidence blocks for Stage 1 and formatting guidance for Stage 2 |
| R4 — UTC timestamps consistency | ✅ | Extended guidance to Planner + Critic (QA/UAT/DevOps already had it) |
| R5 — Related issues linking | ✅ | Added required plan header guidance (Planner) |

## Validation Plan

1. Next CSS/layout-only plan:
   - Plan includes **Related Issues** links/IDs (or “None”)
   - QA report explicitly records manual validation status: executed vs deferred (owner/rationale/severity/fallback)
   - UAT uses design-review approach only when QA is QA Complete and Code Review is APPROVED

2. Next release:
   - DevOps Stage 1 doc includes the evidence block outputs
   - DevOps Stage 2 readiness doc includes the evidence subsection outputs consistently

## Related Artifacts

- PI analysis: `agent-output/process-improvement/016-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/015-pwa-miui-form-rendering-retrospective.md`
