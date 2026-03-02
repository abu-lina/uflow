---
ID: 032
Origin: 032
UUID: b7e3a1f9
Status: Committed for Release memory-extension-v0.1.0
---

# Plan 032 — DIY Agent Memory System (Replace Flowbaby Backend)

## Changelog

| Date (UTC) | Agent | Change | Rationale |
|---|---|---|---|
| 2026-03-02T11:15Z | devops | Status updated to "Committed for Release memory-extension-v0.1.0" | Stage 1 complete — committed locally (cec74f7), all plan changes staged for tooling release v0.1.0 |
| 2026-03-02T11:00Z | uat | Status updated to "UAT Approved" | UAT Complete — implementation delivers stated value (eliminates daemon lock root cause), multi-window safety validated, all success metrics met, APPROVED FOR RELEASE |
| 2026-03-02T10:45Z | implementer | Status updated to "QA Complete" | Fixed failing test gate by adding `@iconify/react` mock in test setup; all automated gates now pass |
| 2026-03-02T10:20Z | qa | Status updated to "QA Failed" | Automated gates: backend + extension PASS; main repo tests FAIL due to Vitest unhandled errors (`window is not defined`), requiring fix before proceeding |
| 2026-03-02T09:00Z | code-reviewer | Status updated to "Code Review Approved" | Implementation passed code review with APPROVED_WITH_COMMENTS verdict (3 LOW-severity findings documented) |
| 2026-03-02 | planner | Updated plan per Architecture Findings (D1–D3) + Critic findings | Remove ambiguity, lock integration/embeddings/migration decisions, elevate multi-window safety |

## Plan Header

- **Target Release**: N/A (workflow/tooling change; not a UFlow runtime release)
- **Epic Alignment**: Developer productivity / workflow correctness / agent reliability
- **Status**: QA Complete (pending UAT → DevOps)
- **Related Issues**: None

## Release Strategy

Release Strategy: **Standalone** (tooling/workflow change; not bundled into a product release).

## Value Statement and Business Objective

As a **developer/workflow operator**, I want a **reliable, local-first agent memory system** compatible with our existing store/retrieve tool contract, so that **agents retain cross-session context without frequent NO-MEMORY MODE failures caused by daemon lock contention, cloud auth, or heavy dependencies**.

Success metrics (initial):
- Multi-window: two VS Code windows can store/retrieve concurrently with **0 daemon-ownership/lock failures** across 5 consecutive sessions
- Reliability: NO-MEMORY MODE incidents attributable to memory backend drop to **near-zero** (track qualitatively if telemetry is not available)

## Context (From Analysis 032)

Analysis 032 found:
- Flowbaby is a VS Code extension registering `flowbabyStoreSummary` / `flowbabyRetrieveMemory`, which calls a Python JSON-RPC daemon wrapping Cognee + Bedrock.
- The dominant reliability issue is single-instance daemon ownership (“another VS Code window owns the daemon”).
- For our use case, Flowbaby is overengineered: we mostly need **persist structured summaries → retrieve by relevance with recency/status ranking**; we do not need LLM-based entity extraction.

**Memory status for this planning session**: NO-MEMORY MODE — `flowbabyRetrieveMemory` failed due to daemon ownership in another VS Code window.

## Objective

1. Provide a drop-in-equivalent **store** and **retrieve** capability for Copilot agents using a **local-first** backend.
2. Eliminate the top failure mode: **multi-window daemon lock contention**.
3. Reduce operational complexity (remove Cognee + Bedrock coupling for memory).
4. Keep the system transparent and debuggable (file-backed artifacts, simple commands).

## Scope

### In Scope

- A minimal “DIY memory backend” that persists structured summaries and supports retrieval.
- A stable interface compatible with the existing contract shape (topic/context/decisions/rationale/metadata + query/maxResults).
- Recency + status-aware ranking (port the proven ranking behavior).
- Workspace-local storage location and data isolation.
- Multi-window correctness (no single-window lock that blocks read/write).

### Out of Scope

- Full knowledge graph extraction, ontology-based entity matching, temporal KG traversal (explicitly avoid rebuilding Flowbaby/Cognee).
- New UX surfaces (dashboards, memory browsers) beyond what’s required to unblock agents.
- Cloud-hosted memory services (unless explicitly requested later).
- v1 semantic embeddings (explicitly deferred to follow-up release)
- v1 automated migration of existing Flowbaby storage (explicitly optional and deferred)

## Key Constraints

- **KISS/YAGNI**: Solve reliability + retrieval first; avoid complex graph infrastructure.
- **Local-first**: Must work without Flowbaby Cloud auth or external hosted services.
- **Auditability**: Memory entries must be inspectable as plain files or simple JSON.
- **Compatibility**: Preserve the “memory-contract” shape so downstream agent behavior doesn’t need re-training.
- **Multi-window safety (NON-NEGOTIABLE)**: Storage must be safe for concurrent access across multiple VS Code windows/processes (no single-owner daemon lock).

## Locked Decisions (D1–D3)

These decisions are required by [agent-output/architecture/032-diy-agent-memory-architecture-findings.md](../architecture/032-diy-agent-memory-architecture-findings.md) and are not open for re-decision during implementation.

- **D1 — Integration Point (LOCKED)**: Build a new lightweight VS Code extension that registers the memory tools, wrapping a standalone local backend library. Do **not** extend or fork Flowbaby.
- **D2 — Embeddings in v1 (LOCKED)**: v1 ships with keyword + metadata retrieval plus recency/status ranking. Embeddings are a follow-up (v1.1), not a v1 requirement.
- **D3 — Migration (LOCKED)**: Migration from Flowbaby is **optional** and must not block v1.

## Assumptions

- We can introduce a small tooling package inside this repo (or adjacent workspace) without impacting UFlow runtime.
- Agents primarily need episodic summaries (not raw chat logs).
- Semantic retrieval is desirable but not mandatory for v1; keyword + metadata filtering is the planned v1 approach.

## Open Questions

- **OPEN QUESTION [RESOLVED — D1] (Integration Point)**: New lightweight VS Code extension + backend library. No Flowbaby fork.
- **OPEN QUESTION [RESOLVED — D2] (Embeddings in v1)**: Deferred; v1 is keyword + metadata + ranking. Embeddings are a follow-up (v1.1).
- **OPEN QUESTION [RESOLVED — D3] (Migration)**: Optional; not required for v1. Follow-up can be phased (curated import → automated migration).

## Duration Estimates

- Analysis: 0.5–1.0 day (integration choice + data model)
- Planning: 0.5 day (this doc + alignment)
- Implementation: 3–5 days (backend + VS Code integration; embeddings optional)
- QA: 0.5–1.5 days (unit + integration + VS Code smoke)
- UAT: 0.5–1.0 day (multi-window verification)
- DevOps: 0.5–1.0 day (packaging/release of tooling artifacts)

Uncertainty drivers: storage primitive choice (SQLite WAL vs JSONL), extension packaging logistics, and operational rollout (keeping Flowbaby as fallback).

## Milestone Dependencies

```mermaid
graph LR
  M1[Backend: storage format & persistence] --> M2[Backend: retrieval + ranking]
  M2 --> M3[VS Code extension: tools registration]
  M3 --> M4[Operational hardening (multi-window)]
  M4 --> M5[Docs + rollout + versioning]
  M3 -.-> D1[Deferred: optional migration]
  M3 -.-> D2[Deferred: local embeddings]
```

Sequencing rule: VS Code integration (M3) starts once retrieval contract is stable (M2).

## Plan (Milestones)

1. **Define the minimal memory data model + storage layout**
   - Objective: Lock a stable on-disk representation for memories that supports filtering, status, timestamps, and references.
   - Work:
     - Define required fields (topic, context, decisions, rationale, metadata.status, timestamps, optional plan_id).
     - Decide storage primitive that is multi-window safe by design (e.g., SQLite WAL-mode OR append-only JSONL with conservative locking + atomic operations).
     - Decide storage layout (workspace-local directory) and atomic write strategy.
   - Acceptance Criteria:
     - A written schema (in this plan or a small internal doc) that implementers can follow.
     - Storage location and retention expectations are clear.
     - Multi-window correctness is addressed at the storage layer (no single-owner daemon lock).

2. **Implement store pipeline (write path) with durability**
   - Objective: Store summaries reliably and deterministically.
   - Work:
     - Validate inputs against memory-contract expectations (topic/context required, context size bounds).
     - Persist entries with stable IDs; support `metadata.status`.
   - Acceptance Criteria:
     - Store operation succeeds across multiple VS Code windows.
     - Entries are human-inspectable.

3. **Implement retrieval pipeline (read path) + ranking**
   - Objective: Retrieve relevant memories and rank them with recency and status weighting.
   - Work:
     - Implement metadata filtering and keyword search.
     - Port the recency half-life decay and status multipliers.
   - Acceptance Criteria:
     - Retrieval returns consistent results for repeated queries.
     - Superseded items are de-prioritized unless explicitly included.

4. **VS Code extension integration: register language model tools**
   - Objective: Make the system callable by Copilot agents via tools.
   - Work:
     - Provide two tools: store and retrieve, matching the existing memory contract shape.
     - Prefer maintaining the existing tool identifiers used in this workspace (e.g., `flowbaby_storeMemory` / `flowbaby_retrieveMemory`) to avoid agent retraining.
     - Ensure tool invocations are auditable (basic logging).
   - Acceptance Criteria:
     - A Copilot agent can store and retrieve memory in a fresh workspace session.

5. **Operational hardening: multi-window + concurrency**
   - Objective: Ensure no “single owner” lock blocks usage.
   - Work:
     - If a daemon/process is used, define multi-client access (socket, file-based, or per-window processes with safe merge).
   - Acceptance Criteria:
     - Two VS Code windows can both store and retrieve without failures.

6. **Docs + rollout + versioning (tooling)**
   - Objective: Ship as a coherent, supportable tooling release.
   - Work:
     - Document install/update steps and how to enable/disable as fallback to Flowbaby.
     - Add/maintain a versioned changelog for the tooling artifacts.
     - Document the multi-window validation procedure at a high level.
   - Acceptance Criteria:
     - A clear version identifier exists for the tooling release.
     - Rollout steps are clear and reversible.

## Deferred Work (Not Required for v1)

These items may be implemented after v1 stability is proven.

1. **Deferred (v1.1): Local semantic embeddings**
   - Objective: Improve retrieval quality for fuzzy queries without adding cloud dependencies.
   - Acceptance Criteria:
     - Storage schema supports incremental embedding builds (stable IDs, content hash, embedding versioning).

2. **Deferred (post-v1): Optional migration from Flowbaby**
   - Objective: Preserve existing Flowbaby memories without blocking v1.
   - Acceptance Criteria:
     - Migration is phased (curated import first; automated migration later) and idempotent.

## Testing Strategy (High Level Only)

- Unit tests for ranking, filtering, and parsing (deterministic, no network).
- Integration tests for store→retrieve round-trip on a temporary workspace directory.
- Smoke validation in VS Code: tool calls work across restarts and across two windows.

## Validation & Rollback

- Validation: Demonstrate multi-window store/retrieve without NO-MEMORY MODE fallback.
- Rollback: Keep Flowbaby available as a fallback path until the DIY system proves stable; switching should be a configuration choice, not a destructive migration.

## Risks

- Extension packaging risk: building and distributing a new extension adds a small maintenance burden.
- Retrieval quality risk: keyword-only MVP may feel weaker than semantic retrieval; mitigate by adding local embeddings milestone.
- Migration risk: existing Flowbaby store is large and in opaque formats; keep migration optional.

## Notes on Skill Usage (Catalog)

This plan is informed by the attached catalog skills:
- `agent-memory-mcp`: use an MCP-style interface and keep memory operations simple and observable.
- `agent-memory-systems` + `memory-systems`: prefer retrieval reliability and metadata filtering; avoid overbuilding knowledge graph infrastructure.
- `embedding-strategies` + `rag-engineer`: if embeddings are added, use disciplined chunking + metadata filters; don’t “embed everything”.
- `hierarchical-agent-memory`: bias toward file-based, transparent memory artifacts.
