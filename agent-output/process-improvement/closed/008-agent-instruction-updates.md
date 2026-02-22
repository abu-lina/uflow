---
ID: 008
Origin: 008
UUID: 3b9c7d4a
Status: Resolved
---

# Agent Instruction Updates 008 — Implementing PI 008 (Option 1)

**Source analysis**: `agent-output/process-improvement/008-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/007-performance-improvements-v0.4.0.md`
**Date**: 2026-02-22

## Summary

- **Option implemented**: Option 1 (apply now)
- **Files updated**: 2 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)
- **Recommendations implemented**:
  - ✅ P1: Schema verification gate for DB migrations
  - ✅ P2: Milestone-boundary Flowbaby memory checkpoints

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added **Schema Verification Gate (DB migrations)** with SQL templates for:
    - Column existence checks via `information_schema.columns`
    - RPC existence checks via `pg_proc` + `pg_get_function_identity_arguments`
  - Added **Memory Checkpoints (MANDATORY)** section under Workflow

- `.github/agents/devops.agent.md`
  - Added **Migration readiness check (MANDATORY)** in Stage 2A readiness verification
  - Added explicit **Flowbaby memory checkpoint triggers**:
    - After Stage 1 local commit
    - After Stage 2 release

## Validation Plan

1. Next plan that includes a Supabase migration referencing existing columns must include a recorded schema verification query result in the implementation doc.
2. Next multi-milestone plan must include at least one mid-implementation Flowbaby memory checkpoint plus a pre-handoff checkpoint.
3. Next release that depends on new RPCs must include the DevOps migration readiness check (RPC presence/schema cache) before tagging/pushing.

## Related Artifacts

- PI analysis: `agent-output/process-improvement/008-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/007-performance-improvements-v0.4.0.md`
