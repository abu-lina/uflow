---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Implemented
---

# Agent Instruction Updates 114 — DB Schema Staged Refactor (Phase 5 Dual-PK Consolidation)

**Source**: `agent-output/process-improvement/114-process-improvement-analysis.md`
**Date**: 2026-04-30T17:00Z
**Implementation commit**: `fc859ce4`

## Summary

- **Recommendations implemented**: 5 (R1–R5)
- **Files updated**: 4 agent instruction files
- **Net effect**: Prevents Code Review rejection cycles for FK-safe migrations, eliminates mid-QA migration rename cascades, catches hardcoded migration filename references before CI, makes PROD migration apply a first-class DevOps step, and ensures performance baselines are captured for schema-affecting migrations.

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added **FK-Safe PK Cutover** checklist (R1): enumerate inbound FKs, preserve UNIQUE constraints during PK promotion

- `.github/agents/qa.agent.md`
  - Added **Migration Prefix Collision Check** (R2): one-liner check before `supabase db push`
  - Added **EXPLAIN ANALYZE Gate** (R5): Option A (evidence) / Option B (named deferral with owner + due date) for schema-affecting migrations

- `.github/agents/code-reviewer.agent.md`
  - Added **Migration Filename Reference Check** item 6i (R3): flag literal migration filename strings in test files

- `.github/agents/devops.agent.md`
  - Added **PROD Migration Apply** section §3g (R4): MCP / CLI tool options, environment ref mapping, apply order, verification SQL

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-30T17:00Z | devops (closeout) | Agent instruction updates doc created — post-merge recovery |
