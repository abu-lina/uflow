---
ID: 009
Origin: 009
UUID: 2d7a6c1e
Status: Resolved
---

# Agent Instruction Updates 009 — Implementing PI 009 (Option 1)

**Source analysis**: `agent-output/process-improvement/009-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/008-search-index-validation-and-fallback-guards.md`
**Date**: 2026-02-22

## Summary

- **Option implemented**: Option 1 (apply now)
- **Files updated**: 5 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)
- **Recommendations implemented**:
  - ✅ P1: Memory retrieval validation after storage
  - ✅ P2: Delta-lint default for QA
  - ✅ P3: Document lifecycle preflight for QA/UAT domains
  - ✅ P5: Conditional EXPLAIN evidence gate for search changes
  - ✅ P4 noted as already present (two-stage DevOps)
  - ⏸️ P6/P7 deferred (templates/tooling)

## Files Updated

- `.github/agents/implementer.agent.md`
  - Added **DB Plan Evidence Gate (Search)** (mandatory when applicable) with escape hatch
  - Added **Memory Retrieval Validation (MANDATORY)** to prevent non-discoverable memory entries

- `.github/agents/devops.agent.md`
  - Added **post-store retrieval sanity checks** for Stage 1 and Stage 2 memory entries

- `.github/agents/retrospective.agent.md`
  - Added **Flowbaby memory retrieval strategy** to the Process steps, including explicit **NO-MEMORY MODE** fallback

- `.github/agents/qa.agent.md`
  - Added **Self-check on start** for terminal-status docs outside `closed/`
  - Updated lint guidance to **delta-lint default** (repo-wide lint informational unless explicitly requested)

- `.github/agents/uat.agent.md`
  - Added **Self-check on start** for terminal-status docs outside `closed/`

## Validation Plan

1. Next multi-phase plan: store a memory checkpoint and immediately retrieve with query including `Plan <ID>` + phase keyword; confirm ≥1 result.
2. Next QA execution: delta-lint used by default; repo-wide lint recorded as informational if pre-existing.
3. Next UAT execution: `agent-output/uat/` domain preflight prevents terminal-status docs outside `closed/`.
4. Next search-index/RPC plan: implementation doc includes EXPLAIN evidence or explicit deferral with owner and risk note.

## Related Artifacts

- PI analysis: `agent-output/process-improvement/009-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/008-search-index-validation-and-fallback-guards.md`
