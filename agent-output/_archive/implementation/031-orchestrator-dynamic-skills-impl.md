---
ID: 31
Origin: 31
UUID: 5f2c9d8a
Status: Active
---

# Implementation: Plan 031 — Orchestrator Dynamic Skill Selection

## Plan Reference

[agent-output/planning/031-orchestrator-dynamic-skills-plan.md](../planning/031-orchestrator-dynamic-skills-plan.md)

## Date

2026-03-01

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-03-01T19:15Z | Critic → Implementer | Implement Plan 031 (APPROVED) | Milestones 1–5 complete; orchestrator.agent.md updated |

## Implementation Summary

Plan 031 addressed the root cause of why the Orchestrator appeared to always select the same set of skills: the Layer 3 (general catalog) discovery relied on a hard-coded relative path (`skills/data/catalog.json`) that doesn't exist under the `uflow/` repo root. In this multi-root workspace, the catalog lives under `.agent/skills/data/catalog.json`.

**What changed** (single file: `.github/agents/orchestrator.agent.md`):

1. **Catalog discovery** (Milestone 1): Replaced the hard-coded path with a mandatory search-based discovery step. If the catalog is not found, the Orchestrator now prints an explicit warning instead of silently falling back.

2. **Deterministic evidence** (Milestone 2): Added a mandatory "Emit Evidence" step requiring every Workflow Card to include a `Catalog:` line (with matches, `(none)`, or a warning) and concrete `Load skill '...' from '...'` directives in handoff prompts.

3. **Heuristic tuning** (Milestone 3): Replaced the old bullet-list heuristics with a structured table mapping 9 common task categories to specific UFlow skills (Layer 1) AND catalog candidate IDs (Layer 3). Each category now references real, verified catalog skill IDs (e.g., `postgres-best-practices`, `react-best-practices`, `auth-implementation-patterns`).

4. **Verification docs** (Milestone 4): Added a "Verifying Dynamic Skill Selection" section to the Orchestrator spec explaining how maintainers can confirm dynamic skills are working in under 2 minutes.

5. **Release artifacts** (Milestone 5): No product version bump (workflow-only). Plan changelog updated.

6. **Critic F1** addressed: Remaining open question marked as `[DEFERRED]`.

## Milestones Completed

- [x] Milestone 1: Catalog discovery + path resolution
- [x] Milestone 2: Deterministic Layer 3 selection + explicit handoff directives
- [x] Milestone 3: Heuristic tuning for common UFlow task types
- [x] Milestone 4: Documentation: 'How to tell dynamic skills are working'
- [x] Milestone 5: Update Version and Release Artifacts (no version bump)
- [x] Critic F1: Mark remaining open question as DEFERRED

## Files Modified

| Path | Changes | Lines Changed |
|------|---------|---------------|
| `.github/agents/orchestrator.agent.md` | Layer 3 section rewritten with 3-step discovery/match/emit protocol; heuristics table expanded to 9 categories with real catalog IDs; handoff instructions made explicit; verification section added | ~120 lines replaced/added (net +49 lines: 499→548) |

## Files Created

| Path | Purpose |
|------|---------|
| `agent-output/implementation/031-orchestrator-dynamic-skills-impl.md` | This implementation doc |

## Code Quality Validation

- [x] Compilation (type-check): `npx tsc --noEmit` — exit 0
- [x] Linter: N/A (markdown changes only; no lint rules for `.agent.md`)
- [x] Tests: `npx vitest run` — 163 passed, 18 skipped, 0 failed
- [x] Build: `npm run build` — exit 0
- [x] Compatibility: Workflow-only change; no runtime impact

## Value Statement Validation

- **Original**: "As a developer/workflow operator, I want the Orchestrator to reliably select and instruct dynamic skills from the attached skill catalog, so that downstream agents receive task-specific guidance instead of repeatedly relying on the same baseline skill set."
- **Implementation delivers**: The Orchestrator spec now has a mandatory discovery step, structured evidence output, and a verified heuristics table with real catalog skill IDs. Task-specific catalog skills will now appear in Workflow Cards when the catalog is available.

## TDD Compliance

This plan introduced **no new functions or classes** — all changes are to agent instruction markdown. TDD does not apply.

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---------------|-----------|--------------------|--------------------|----------------|-----------------|
| N/A — markdown instruction changes only | N/A | N/A | N/A | N/A | N/A |

**Exception rationale**: Plan 031 is workflow-only (changes to `.github/agents/orchestrator.agent.md`). No TypeScript/JavaScript code was created or modified. The TDD gate applies to "new feature code" per the Implementer spec.

## Test Coverage

- **Unit tests**: N/A (no code changes)
- **Integration tests**: N/A (no code changes)
- **Manual verification**: Orchestrator runs with domain-specific prompts can confirm Workflow Card includes a `Catalog:` section with ≥1 skill (see the "Verifying Dynamic Skill Selection" section added to the Orchestrator spec)

## Test Execution Results

| Command | Result | Issues | Coverage |
|---------|--------|--------|----------|
| `npx vitest run` | 163 passed, 18 skipped, 0 failed | None | N/A |
| `npx tsc --noEmit` | Exit 0 | None | N/A |
| `npm run build` | Exit 0 | None | N/A |

## Outstanding Items

- **None blocking**
- The remaining open question about a "local catalog stub" for single-root workspace usage is **DEFERRED** per Critic F1 recommendation

## Next Steps

1. Code Review → QA
