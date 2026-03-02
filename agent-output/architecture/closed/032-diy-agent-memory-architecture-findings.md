---
ID: 032
Origin: 032
UUID: b7e3a1f9
Status: Committed
---

# 032 — DIY Agent Memory System: Architecture Findings

## Changelog

| Date | Change |
|------|--------|
| 2026-03-02 | Created findings to resolve key design choices for Plan 032 (integration point, embeddings v1, migration policy) |

## Trigger / Handoff Context

Plan 032 proposes replacing Flowbaby’s backend (Python daemon + Cognee + Bedrock) with a local-first memory system that preserves the existing store/retrieve contract. The user requested explicit architectural decisions on:

1. Integration point: new lightweight VS Code extension vs extending/forking Flowbaby
2. Embeddings in v1: keyword-only MVP vs local embeddings immediately
3. Migration: optional vs required for v1

## Architecture Assessment (What matters)

### Primary Quality Attribute: Reliability

Flowbaby’s dominant failure mode is **daemon ownership / single-instance lock** across multiple VS Code windows, producing frequent NO-MEMORY MODE operation. Any replacement MUST be:

- **Multi-window safe by design** (no “single owner” gate that blocks read/write)
- **Local-first** (no mandatory cloud auth to perform basic store/retrieve)
- **Transparent** (inspectable storage, minimal moving parts)

### Secondary Attributes

- Maintainability: small codebase, low dependency surface, testable ranking/search
- Performance: retrieval should be sub-second on typical memory sizes
- Privacy: avoid storing secrets/PII; logging must be safe-by-default

## Decisions (Required)

### D1 — Integration Point

**Choice (REQUIRED): Build a new lightweight VS Code extension that registers the tools, with a thin wrapper around a standalone local memory backend library. Do NOT extend or fork Flowbaby.**

- Rationale:
  - Extending/forking Flowbaby inherits the very complexity that caused instability (Python daemon lifecycle, Cognee SDK drift, Bedrock auth, daemon locking).
  - A new extension can keep the same conceptual tool contract while eliminating the daemon pattern entirely.
  - SRP/KISS: keep the extension as “tool registration + minimal plumbing”; keep storage/ranking in a small library.

- Alternatives considered:
  - Fork Flowbaby and remove Cognee (rejected): still leaves daemon ownership, operational coupling, and upgrade risk.
  - MCP server without extension (rejected for now): VS Code `languageModelTools` still need an extension contribution.

- Consequences:
  - Requires packaging/maintaining a small extension.
  - Allows clean multi-window semantics and stable local storage.

**Plan impact (MUST update Plan 032):** make the “integration point” non-optional and specify “new extension + backend library” as the default.

### D2 — Embeddings in v1

**Choice (REQUIRED): Ship v1 with keyword + metadata retrieval and the proven recency/status ranking. Make embeddings an optional follow-up milestone (v1.1), not a v1 requirement.**

- Rationale:
  - YAGNI: semantic embeddings increase build size, dependency complexity, and potential platform-specific issues.
  - For UFlow agent memory, the stored entries are already structured, short, and queryable via keyword + metadata.
  - The core failure to address is reliability, not retrieval sophistication.

- Guardrail:
  - The storage schema MUST leave room for embeddings later (stable memory IDs, content hash, “embedding_version”, and a vector index that can be built incrementally).

- Consequences:
  - Retrieval quality may be weaker for fuzzy queries initially.
  - Reduced implementation risk and faster time-to-reliability.

**Plan impact (MUST update Plan 032):** define v1 as keyword+metadata, and label embeddings as an explicitly deferred milestone with success criteria.

### D3 — Migration policy

**Choice (REQUIRED): Migration is OPTIONAL for v1.**

- Rationale:
  - Existing Flowbaby storage is large (~1GB in one workspace) and stored in opaque/internal formats (Cognee/Lance/Kuzu). Forced migration increases scope and risk.
  - The replacement should prove reliability first; migration can be layered later.

- Consequences:
  - Users may temporarily “lose” older Flowbaby memories unless they manually re-store key decisions.
  - Add a follow-up milestone for “curated import” (manual selection of key decisions) before “full automated migration”.

**Plan impact (MUST update Plan 032):** explicitly state “no migration required to ship v1” and add a phased migration approach.

## Integration Requirements (Non-Negotiable)

### Multi-window correctness

- Avoid any per-workspace single-owner daemon lock.
- Prefer a storage primitive that is safe across processes:
  - SQLite with WAL mode (recommended) OR
  - Append-only JSONL with atomic renames + conservative file locking.

### Observability (Normal vs Debug)

- Normal (always on):
  - `tool_invocation_id`, `operation` (store/retrieve), `duration_ms`, `result_count` (retrieve), `success`.
  - No secrets/PII; truncate user-provided text lengths only.
- Debug (opt-in):
  - Query string (maybe), memory IDs returned, ranking breakdown.

## Verdict

✅ **APPROVED_WITH_CHANGES**

Plan 032 is directionally correct but MUST be updated to lock in D1–D3 explicitly (integration point, embeddings deferral, migration optional) and to include multi-window storage design as a non-negotiable requirement.
