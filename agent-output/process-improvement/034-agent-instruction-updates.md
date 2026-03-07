---
ID: 34
Origin: 34
UUID: 2c9c81f4
Status: Active
---

# Agent Instruction Updates 034

**Source**: `agent-output/retrospectives/034-provider-image-load-performance-retrospective.md`
**Date**: 2026-03-07

## Summary

- **Recommendations implemented**: 5 (R1–R5)
- **Files updated**: 6 agent instruction files
- **Net effect**: Makes deploy-path coverage explicit, prevents silent baseline drops, formalizes fix-in-review boundaries, and strengthens orphan-sweep + deferred perf validation handling.

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added **Deployment Path Audit** checklist (R1)
  - Added **Baseline & Measurements** integrity requirement + Implementation doc section (R2)

- `.github/agents/code-reviewer.agent.md`
  - Added **Deployment Path Audit Checklist** (R1)
  - Added bounded **Fix-in-Review Protocol** and updated constraints to allow it conditionally (R4)

- `.github/agents/planner.agent.md`
  - Added **Baseline/measurement milestone integrity** requirement (R2)
  - Added **Deployment Path Audit milestone** requirement for deploy-surface changes (R1)

- `.github/agents/uat.agent.md`
  - Added explicit **Performance Timing Gate** with PASS/DEFERRED semantics and baseline evidence/deferral expectation (R2/R5)

- `.github/agents/roadmap.agent.md`
  - Expanded orphan sweep terminal-status match set to include domain statuses like **UAT Complete** (R3)

- `.github/agents/devops.agent.md`
  - Added handling for **DEFERRED** perf validations post-deploy (R5)
  - Added **release hygiene** guidance for orphan cleanup as a docs-only commit (R3)

## Changes by Recommendation

- **R1 Deployment Path Audit**: ✅ Implemented (Implementer, Code Reviewer, Planner)
- **R2 Baseline Measurement Checkpoint**: ✅ Implemented (Planner, Implementer, UAT)
- **R3 Orphan Cleanup Automation (instruction-level)**: ✅ Implemented (Roadmap sweep broadened; DevOps docs-only cleanup guidance)
- **R4 Fix-in-Review Protocol**: ✅ Implemented (Code Reviewer)
- **R5 UAT Timing Gate**: ✅ Implemented (UAT; DevOps follow-up)

## Validation Plan

Next 2–3 plan cycles, monitor:

- **Deploy-path misses**: Any code review finding referencing “workflow not updated” should drop toward zero.
- **Baseline drops**: Any planned measurement milestone must be present as evidence or explicit deferral in implementation docs.
- **Deferred perf targets**: UAT reports should clearly mark PASS vs DEFERRED with owner/timebox.
- **Orphans**: Roadmap orphan sweeps should detect and clear `UAT Complete`/`QA Complete` statuses outside `closed/`.

## Related Artifacts

- Retrospective: `agent-output/retrospectives/034-provider-image-load-performance-retrospective.md`
- PI analysis: `agent-output/process-improvement/034-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/034-agent-instruction-updates.md`
