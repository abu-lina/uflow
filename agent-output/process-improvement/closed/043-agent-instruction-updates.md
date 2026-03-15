---
ID: 043
Origin: 043
UUID: b387acd5
Status: Resolved
---

# Agent Instruction Updates 043: Plan 042 Workflow Hardening

**Source**: `agent-output/retrospectives/closed/042-parallel-copilot-sessions-retrospective.md`
**PI analysis**: `agent-output/process-improvement/043-process-improvement-analysis.md`
**Date**: 2026-03-15

## Summary

- **Recommendations implemented**: 2 (`PI-043-1`, `PI-043-2`)
- **Files updated**: 2 agent instruction files
- **Net effect**:
  - QA now explicitly verifies Analysis doc `ID/Origin/UUID` chain invariants when an analysis doc exists.
  - DevOps now explicitly prefers tool-based commit-message file creation to avoid terminal heredoc/quote-state failures.

## Files Updated

- `.github/agents/qa.agent.md`
  - Added **Chain invariant check (MANDATORY)** under Document Lifecycle:
    - If an Analysis doc exists for the plan, verify `ID/Origin/UUID` matches the plan.
    - Fix mismatch before finalizing QA.

- `.github/agents/devops.agent.md`
  - Added a clarifying line under **Commit message reliability**:
    - Prefer tool-based file writes (e.g., `create_file`) or a small Python one-liner to write the temp commit message file; avoid shell heredocs.

## Changes by Recommendation

- **PI-043-1 QA chain invariant includes analysis doc**: ✅ Implemented
- **PI-043-2 DevOps commit message file creation guidance**: ✅ Implemented
- **PI-043-3 Stage 2 status alignment for chain docs**: ⏸️ Deferred (optional)
- **PI-043-4 Reduce dependence on memory availability**: ⏸️ Deferred (guideline only)

## Validation Plan

Monitor over the next 1–2 workflow cycles:

- QA should catch any Analysis UUID mismatch before UAT.
- DevOps should avoid heredoc-related quote-state failures when creating multi-line commit messages.

## Related Artifacts

- Retrospective (closed): `agent-output/retrospectives/closed/042-parallel-copilot-sessions-retrospective.md`
- PI analysis: `agent-output/process-improvement/043-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/043-agent-instruction-updates.md`
