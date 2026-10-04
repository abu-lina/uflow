---
ID: 31
Origin: 31
UUID: 5f2c9d8a
Status: Planned
---

# Orchestrator Dynamic Skill Loading — Analysis

## Value Statement and Business Objective
Ensure the workflow router (Orchestrator) actually varies its skill selection based on task context, so downstream agents load the most relevant domain skills instead of repeatedly using the same baseline set.

## Objective
Determine whether [.github/agents/orchestrator.agent.md](.github/agents/orchestrator.agent.md) *ensures* dynamic skills (from the general catalog) are used, and identify why it may appear to always pick the same skills.

## Context
- The Orchestrator spec describes a three-layer skill selection system: UFlow skills (Layer 1), agent-native skills (Layer 2), and general catalog skills (Layer 3).
- The user reports the Orchestrator appears to always use the same set of skills.
- Flowbaby memory tools are currently unavailable in this workspace (another VS Code window managing the daemon), so this analysis is based on repo artifacts only.

## Methodology
- Read the Orchestrator spec in [.github/agents/orchestrator.agent.md](.github/agents/orchestrator.agent.md), focusing on “Phase 2: Skill Auto-Detection”.
- Verified whether the referenced general catalog file exists in this multi-root workspace.
- Searched `agent-output/` for evidence of emitted `Load skill ...` directives (acknowledging Workflow Cards live in chat and may not be persisted).

## Findings

### 1) The Orchestrator is specified to do dynamic catalog selection, but it’s not “guaranteed” by enforcement
**Confidence: Inferred (Level 3)**
- The Orchestrator is an LLM agent following instructions. The spec says it *should*:
  - Tokenize the task, match against triggers, and pick top catalog skills.
  - Emit explicit directives in the Workflow Card like:
    - `Load skill '{skill-name}' from '{path}' — {reason}`
- There is no hard enforcement mechanism in the spec beyond “do this” instructions. If the Orchestrator doesn’t execute the described selection steps, downstream agents will not automatically discover extra skills.

### 2) The catalog path in the Orchestrator spec may not match this workspace layout
**Confidence: Observed (Level 2)**
- Orchestrator spec says: search the general skills catalog at `skills/data/catalog.json`.
- In this workspace, the catalog exists at:
  - `/Users/NARAFIQ/01 Personal/Projects/.agent/skills/data/catalog.json`
- There is no `skills/data/catalog.json` under the `uflow/` repo root.

**Implication (Inferred)**: if the Orchestrator naively tries to load `skills/data/catalog.json` relative to the `uflow/` root, it may fail to locate the catalog and silently fall back to the Layer 1 UFlow skill set (which would look “always the same”).

### 3) Lack of persisted evidence in `agent-output/` is expected
**Confidence: Observed (Level 2)**
- The Orchestrator’s Workflow Card is specified to “live in the chat, not as a file”.
- A text search of `agent-output/**` found no `Load skill '...'` directives, but that does not prove the Orchestrator isn’t emitting them in-chat.

### 4) Some repetition is “by design” even when dynamic selection works
**Confidence: Inferred (Level 3)**
- Two skills are mandatory in all phases: `document-lifecycle`, `memory-contract`.
- Many common tasks will repeatedly trigger the same UFlow skills (e.g., `testing-patterns` for tests, `security-patterns` for auth/security review), making the set look constant unless Layer 3 skills are clearly listed.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does the Orchestrator actually emit Layer 3 (Catalog) skills in practice? | Workflow Cards are not persisted to `agent-output/` | Run Orchestrator once on a clearly-scoped task and verify the Workflow Card includes `Catalog:` plus at least one `Load skill ... from ...` line. | User/Orchestrator |
| 2 | Does the Orchestrator resolve the catalog path correctly in a multi-root workspace? | Spec uses a potentially incorrect relative path | In an Orchestrator run, verify it references `.agent/skills/data/catalog.json` (or otherwise finds the catalog). | User/Orchestrator |

## Analysis Recommendations (Validation Steps)
1. Trigger an Orchestrator run with a highly specific domain prompt (e.g., “Postgres RLS migration”, “Next.js App Router middleware”, “Vitest mocking strategy”) and check whether the Workflow Card contains a `Catalog:` section and explicit `Load skill ... from ...` lines.
2. If `Catalog:` is always empty, ask the Orchestrator to print the resolved catalog path it used (or couldn’t find). This isolates whether the issue is selection logic vs path resolution.

## Changelog

| Date | Agent | Change |
|---|---|---|
| 2026-03-01 | Analyst | Created analysis of Orchestrator dynamic skill selection + catalog path mismatch risk |
| 2026-03-01 | Planner | Closed as Planned; superseded by Plan 031 |
