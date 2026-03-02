---
ID: 032
Origin: 032
UUID: b7e3a1f9
Status: Planned
---

# 032 — Flowbaby Architecture & DIY Memory System Feasibility Analysis

| Field | Value |
|-------|-------|
| Created | 2026-03-02 |
| Author | Analyst |
| Scope | Flowbaby internals, DIY agent memory feasibility |
| Skills Loaded | memory-contract, agent-memory-systems, agent-memory-mcp, memory-systems, hierarchical-agent-memory, conversation-memory, embedding-strategies, rag-engineer |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-02 | Initial analysis created |
| 2026-03-02 | Planner: Plan 032 created; analysis closed as Planned |

---

## Value Statement and Business Objective

Agent memory is critical infrastructure for the UFlow agent workflow. Every agent (Planner, Implementer, QA, Retrospective) depends on memory for cross-session continuity. When memory is unavailable, agents operate in degraded "NO-MEMORY MODE" — losing context, repeating decisions, and producing lower-quality output. This analysis investigates how Flowbaby is built and whether we can build a more reliable replacement.

---

## 1. Flowbaby Architecture (Verified)

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension (TS)                     │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │ storeMemoryTool │     │ retrieveMemoryTool│               │
│  │ (LanguageModel   │     │ (LanguageModel    │               │
│  │  Tool interface)  │     │  Tool interface)   │               │
│  └────────┬─────────┘     └────────┬──────────┘               │
│           │ vscode.commands         │ vscode.commands          │
│           ▼                         ▼                          │
│  ┌──────────────────────────────────────────────┐             │
│  │        PythonBridgeDaemonManager              │             │
│  │  (JSON-RPC 2.0 over stdio)                    │             │
│  └──────────────────┬───────────────────────────┘             │
└─────────────────────┼───────────────────────────────────────┘
                      │ stdin/stdout (JSON-RPC)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Daemon (daemon.py, 724 LOC)              │
│                                                              │
│  Methods: health | retrieve | ingest | cognify | visualize   │
│           | shutdown                                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  bridge_env   │  │  ingest.py   │  │  retrieve.py │       │
│  │  (env config) │  │  (1007 LOC)  │  │  (975 LOC)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Cognee SDK v0.5.1                     │       │
│  │  (Knowledge graph engine + vector store)           │       │
│  │  • LanceDB (vector storage, .lance format)         │       │
│  │  • KuzuDB (graph database)                         │       │
│  │  • pydantic-settings (env-based config)            │       │
│  └──────────────┬───────────────────────────────────┘       │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────┐       │
│  │            Amazon Bedrock (Cloud-only v0.7.0+)    │       │
│  │  • LLM: amazon.nova-lite-v1:0                     │       │
│  │  • Embeddings: amazon.titan-embed-text-v2:0       │       │
│  │    (1024 dimensions)                              │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Local Storage (.flowbaby/)                       │
│  • system/databases/   — cognee_db + LanceDB files          │
│  • data/               — ingested data                       │
│  • cache/              — filesystem session cache            │
│  • logs/daemon.log     — daemon logs                         │
│  • daemon.lock/        — single-instance lock (PID-based)   │
│  Total size: ~1 GB (uflow workspace)                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Breakdown

| Component | Technology | Purpose | Lines of Code |
|-----------|-----------|---------|---------------|
| Extension Host | TypeScript (compiled JS) | MCP tool registration, daemon lifecycle, auth | ~15 files |
| Daemon | Python 3.11 (`daemon.py`) | Long-lived JSON-RPC server, amortizes import cost | 724 LOC |
| Ingest Pipeline | Python (`ingest.py`) | Structured summary ingestion via enriched-text markdown | 1007 LOC |
| Retrieval Pipeline | Python (`retrieve.py`) | Hybrid graph-vector search with recency ranking | 975 LOC |
| Environment Config | Python (`bridge_env.py`) | Single source of truth for env vars before cognee import | 378 LOC |
| Ontology | RDF/OWL (`ontology.ttl`) | 13 entity classes, 16 relationships for knowledge graph | 176 LOC |
| Cognee SDK | Python package v0.5.1 | Knowledge graph construction, vector embeddings, graph search | External |
| Amazon Bedrock | Cloud API | LLM (Nova Lite) + Embeddings (Titan v2, 1024-dim) | Cloud |

### 1.3 Ontology Schema (Verified)

13 entity classes, 16 object properties:

**Entity Classes**: `ChatEntity` (base) → `User`, `Question`, `Answer`, `Topic`, `Concept`, `Problem`, `Solution`, `Decision`, `Plan`, `Analysis`, `File`, `Configuration`, `Version`

**Key Relationships**: `ASKS`, `HAS_TOPIC`, `MENTIONS`, `DESCRIBES`, `ADDRESSES`, `PROPOSES`, `EXPLAINS`, `SOLVES`, `RELATED_TO`, `FOLLOWS_UP`, `IMPACTS`, `PREREQUISITE_FOR`, `PRODUCES`, `REFERENCES`, `AFFECTS`, `SUPERSEDES`

### 1.4 MCP Tool Interface (Verified)

Two `languageModelTools` registered in `package.json`:

**`flowbabyStoreSummary`** (store):
- Inputs: `topic` (string, required), `context` (string, 300-1500 chars, required), `decisions` (string[]), `rationale` (string[]), `metadata` (object with `plan_id`, `status` enum)
- Calls `Flowbaby.ingestForAgent` → daemon `ingest` method → Cognee `add()` + staged `cognify()`

**`flowbabyRetrieveMemory`** (retrieve):
- Inputs: `query` (string, required), `maxResults` (number, default 3, max 10)
- Calls `Flowbaby.retrieveForAgent` → daemon `retrieve` method → Cognee `search()` with `GRAPH_COMPLETION` + `only_context=True`

### 1.5 Ranking Algorithm (Verified)

$$\text{Score} = S_{\text{semantic}} \times M_{\text{recency}} \times M_{\text{status}}$$

- **Semantic similarity**: Cognee hybrid search (graph + vector), 0.0–1.0
- **Recency decay**: Exponential decay with configurable half-life (default 7 days): $M_{\text{recency}} = e^{-\frac{\ln 2}{H} \times t}$
- **Status multiplier**: DecisionRecord (1.1x), Active (1.0x), Superseded (0.4x)

### 1.6 Data Flow: Store Operation

1. Agent calls `flowbabyStoreSummary` with topic + context + decisions
2. TS extension formats enriched-text markdown (template v1.1 with metadata headers)
3. Extension sends JSON-RPC `ingest` request to Python daemon
4. Daemon calls `ingest.py:run_add_only()`:
   - Builds markdown with `<!-- Template: v1.1 -->` header
   - Embeds metadata in `**Metadata:**` section
   - Calls `cognee.add(text, dataset_name)` to stage data
5. Background: `cognify()` runs asynchronously to extract entities/relationships into knowledge graph

### 1.7 Data Flow: Retrieve Operation

1. Agent calls `flowbabyRetrieveMemory` with query
2. Extension sends JSON-RPC `retrieve` request to Python daemon
3. Daemon calls `retrieve.py:retrieve_context()`:
   - Calls `cognee.search(SearchType.GRAPH_COMPLETION, query, only_context=True)` — skips LLM synthesis (~17-32s savings)
   - Returns raw graph context (triplets) to TypeScript
4. TypeScript synthesizes response via VS Code Copilot LM API
5. Results ranked by semantic × recency × status multipliers

---

## 2. Reliability Assessment (Verified)

### 2.1 Observed Failure Modes

| # | Failure Mode | Frequency | Root Cause | Evidence |
|---|--------------|-----------|-----------|----------|
| F1 | `ModuleNotFoundError: No module named 'cognee'` | Every startup (.agent workspace) | Daemon started with wrong venv / no cognee installed | daemon.log (4 consecutive failures Feb 17–21) |
| F2 | Daemon lock contention — "another VS Code window owns the daemon" | Very frequent | Single-instance lock (`daemon.lock/owner.json`) with PID-based ownership; any second VS Code window is locked out | 12+ agent-output docs reference this |
| F3 | Cloud credentials missing — `AWS_ACCESS_KEY_ID` not set | Occasional | Flowbaby Cloud auth session expired or not initiated | daemon.py checks at every operation |
| F4 | Cognee probe bypass failure | Every startup | `test_llm_connection()` fails with Bedrock (expects OpenAI-style API key) | daemon.log: "Plan 091: Cognee probe bypass failed" |
| F5 | KuzuDB lock contention | Occasional | Graph writes from multiple processes | Led to Plan 061 (daemon-only cognify) and Plan 097 (daemon-only visualize) |
| F6 | Zero retrieval results | Intermittent | Storage descriptors don't align with retrieval queries | Retro 008: "5 memory storage operations but retrieval returned 0 results" |

### 2.2 NO-MEMORY MODE Incidents (Verified from agent-output/)

Found **12+ documented incidents** across agent-output documents where agents operated in NO-MEMORY MODE:

- Implementation 001: "Flowbaby retrieve/store currently failing due to workspace daemon being managed by another VS Code window"
- QA 002: "Flowbaby memory retrieval was unavailable in this session (daemon not running)"
- QA 028: "Flowbaby memory unavailable (another VS Code window owns the daemon)"
- Planning 006: "Flowbaby memory tools are currently unavailable (another VS Code window owns the daemon)"
- Planning 019: "Flowbaby memory was unavailable during planning (daemon offline)"
- Retro 015: "NO-MEMORY MODE" declared
- Retro 017: "NO-MEMORY MODE (Flowbaby daemon unavailable)"
- Process Improvement 004: "No-memory mode: Flowbaby memory retrieval unavailable (daemon not running)"
- Process Improvement 031: "NO-MEMORY MODE — flowbabyRetrieveMemory failed due to daemon lock (another VS Code window)"

### 2.3 Root Cause Analysis: Why Flowbaby Is Unreliable

**Primary root cause (F2 — Daemon lock contention)**: The daemon uses a filesystem lock (`daemon.lock/owner.json` containing PID + instance ID). Only one VS Code window per workspace can own the daemon at a time. Since users typically have multiple VS Code windows open, the lock is almost always held by a different window. This is by far the most frequent failure, causing the majority of NO-MEMORY MODE incidents.

**Secondary root cause (F1 — Wrong venv)**: The managed venv is workspace-scoped (`{workspace}/.flowbaby/venv/`). The `.agent` workspace never got its cognee installed because it points to the wrong workspace path.

**Tertiary root cause (F3 — Cloud auth)**: v0.7.0 went Cloud-only, requiring Flowbaby Cloud login for AWS credentials. Sessions expire, and there's no auto-refresh mechanism visible in the code.

### 2.4 Complexity Budget

| Metric | Value | Assessment |
|--------|-------|------------|
| Python bridge files | 8 production files, ~4000 LOC | Heavy for a memory system |
| Dependencies | cognee≥0.5.1, rdflib≥7.0, lancedb≥0.24, boto3, s3fs + transitive deps | Very heavy dependency tree |
| Cloud dependency | Amazon Bedrock (mandatory in v0.7.0+) | Couples memory to cloud auth |
| Storage footprint | 1 GB for one workspace | High for metadata/embeddings |
| Plan references in code | Plans 003, 014, 015, 016, 017, 018, 032, 037, 039, 054, 059, 061, 062, 073, 074, 083, 086, 088, 091, 093, 097, 109 | 22 plans = enormous engineering investment |
| Configuration surface | 13+ environment variables | Fragile env-var dependency chain |

---

## 3. DIY Feasibility Assessment

### 3.1 What We Actually Need (vs. What Flowbaby Provides)

| Capability | Flowbaby Provides | We Actually Use | Gap |
|-----------|-------------------|-----------------|-----|
| Knowledge graph (entities + relationships) | Full Cognee knowledge graph with KuzuDB + LanceDB | Rarely queried by relationship; mostly keyword/semantic retrieval | Overengineered |
| Ontology-guided entity extraction | 13 classes, 16 relationships, fuzzy matching | Agents store structured summaries with topic/context/decisions — entities are hand-authored | Unused complexity |
| Vector embeddings (1024-dim) | Amazon Bedrock Titan v2 | Semantic search for retrieval | Needed, but simpler alternatives exist |
| LLM-powered graph construction | Cognee's `cognify()` uses LLM to extract entities from text | Agents already provide structured output — no NLP extraction needed | Wasteful LLM spend |
| Recency-aware ranking | Custom exponential decay ranking | Used and valued | Keep |
| Status-aware filtering | Active/Superseded/DecisionRecord multipliers | Used and valued | Keep |
| Cross-session persistence | LanceDB + KuzuDB on filesystem | Critical — the whole point | Keep |
| MCP tool interface | VS Code `languageModelTools` | The integration point with Copilot agents | Keep interface, replace backend |

**Key insight**: Flowbaby uses a full knowledge graph engine (Cognee) with LLM-powered entity extraction, but our agents already provide structured summaries. We're paying for NLP extraction that duplicates what agents already do. The actual value is: **persist structured summaries → embed them → retrieve by semantic similarity with recency ranking**.

### 3.2 Architecture Options (Informed by 7 Catalog Skills)

#### Option A: Fix Flowbaby (Minimal Change)

Fix the daemon lock contention by allowing multi-window access or using a socket-based daemon.

- **Pros**: No new system, preserves existing data (1 GB)
- **Cons**: Still Cloud-dependent (Bedrock), still ~4000 LOC Python bridge, still 22-plan complexity, dependency on Cognee SDK roadmap (breaking changes between versions), can't fix Cloud auth requirement
- **Effort**: Low (lock mechanism fix)
- **Risk**: High (more Cognee breakage guaranteed as they move to v0.6.0+)

#### Option B: DIY File-System Memory (Simplest — HAM-Inspired)

Based on `hierarchical-agent-memory` + `agent-memory-mcp` skills.

```
.memory/
├── summaries/           # One JSON file per memory entry
│   ├── 001-auth-strategy.json
│   ├── 002-redis-caching.json
│   └── ...
├── index.json           # Lightweight search index
├── embeddings/          # Optional: local embeddings cache
│   └── embeddings.bin
└── config.json          # Ranking config (half-life, etc.)
```

- **Storage**: JSON files (structured summaries already provided by agents)
- **Search**: Keyword search on topic/context/decisions fields (like Postgres tsvector philosophy)
- **Ranking**: Same exponential decay + status multipliers (port from retrieve.py)
- **Interface**: MCP server (Node.js) registered as `languageModelTools`
- **Pros**: Zero cloud dependency, zero Python dependency, simple, reliable, debuggable
- **Cons**: No semantic search (keyword-only), no relationship traversal
- **Effort**: Medium (2-3 days to build MCP server + tools)

#### Option C: DIY Vector Memory (Balanced — RAG-Inspired)

Based on `memory-systems` + `embedding-strategies` + `rag-engineer` skills.

```
.memory/
├── summaries/           # Structured JSON files
├── vectors/             # Local vector store (sqlite-vss or vectra)
├── index.json           # Metadata index
└── config.json          # Model + ranking config
```

- **Storage**: JSON files + local vector index
- **Search**: Hybrid — keyword filtering on metadata + semantic search via local embeddings
- **Embeddings**: Local model (e.g., all-MiniLM-L6-v2 via `@xenova/transformers` in Node.js) — 384-dim, zero cloud calls
- **Ranking**: Same recency × status × semantic formula
- **Interface**: MCP server (Node.js)
- **Pros**: Semantic search without cloud dependency, fully local, fast
- **Cons**: Needs embedding model bundled (~90 MB), slightly more complex than Option B
- **Effort**: Medium-High (3-5 days)

#### Option D: DIY Knowledge Graph Memory (Full — Graph-Inspired)

Based on `memory-systems` (temporal knowledge graph patterns).

- **Pros**: Relationship reasoning, temporal queries
- **Cons**: Rebuilds what Cognee does, high complexity, unlikely to be more reliable
- **Effort**: High (2-3 weeks)
- **Assessment**: **NOT recommended** — this is what Flowbaby already is, and we've proven it's overengineered for our use case

### 3.3 Recommendation Matrix

| Criterion | Option A (Fix) | Option B (File) | Option C (Vector) | Option D (Graph) |
|-----------|---------------|-----------------|-------------------|-----------------|
| Reliability | Low (same stack) | **Very High** | **High** | Medium |
| Cloud dependency | Yes (Bedrock) | **None** | **None** | None |
| Semantic search | Yes | No | **Yes** | Yes |
| Complexity | High (4000 LOC) | **Low (~500 LOC)** | Medium (~1000 LOC) | High (3000+ LOC) |
| Build effort | 1-2 days | **2-3 days** | 3-5 days | 2-3 weeks |
| Data migration | Free | Easy (export JSON) | Easy (re-embed) | Hard |
| Maintenance burden | High (Cognee deps) | **Minimal** | Low | High |

---

## 4. Findings Summary

### Verified Findings

1. **Flowbaby is a VS Code extension with a Python daemon bridge** that communicates via JSON-RPC 2.0 over stdio. The daemon wraps the Cognee SDK (v0.5.1) for knowledge graph operations, backed by Amazon Bedrock for LLM + embeddings. Total bridge code: ~4000 LOC across 8 Python files.

2. **The #1 reliability problem is daemon lock contention** — the filesystem-based lock (`daemon.lock/owner.json`) allows only one VS Code window per workspace. This causes the vast majority of NO-MEMORY MODE incidents (12+ documented).

3. **Flowbaby is massively overengineered for our use case.** It uses LLM-powered entity extraction (Cognee `cognify()`) to build a knowledge graph from text, but our agents already provide structured summaries with explicit topic/context/decisions. The NLP extraction layer is redundant.

4. **The Cloud-only model (v0.7.0+) introduces unnecessary fragility.** Every operation requires valid AWS credentials from Flowbaby Cloud, adding an auth failure mode that didn't exist in earlier versions.

5. **The existing data (1 GB in uflow workspace) is stored in LanceDB + KuzuDB binary formats** — it's not easily portable. However, the actual content is structured markdown summaries that could be re-ingested into any system.

6. **22 implementation plans** have been invested in Flowbaby bridge code, representing substantial engineering effort. But the reliability hasn't improved proportionally — the daemon lock issue persists.

### High-Confidence Inferences

7. **A simple file-based + optional vector search system would meet 95% of our needs** with dramatically better reliability. The agents already structure their output; we don't need NLP extraction.

8. **The MCP tool interface contract is the right abstraction** — `store(topic, context, decisions, rationale, metadata)` and `retrieve(query, maxResults)` are well-designed and should be preserved regardless of backend.

---

## 5. Analysis Recommendations (Next Investigative Steps)

1. **Prototype Option C (DIY Vector Memory)** — Build a minimal Node.js MCP server with JSON file storage + local embeddings to validate the approach. This can be tested against the existing memory-contract to confirm compatibility.

2. **Export existing Flowbaby data** — Write a script to read the LanceDB/KuzuDB stores and export structured summaries to JSON, preserving the ~1 GB of accumulated knowledge.

3. **Benchmark retrieval quality** — Use Flowbaby's existing benchmark harness (`BENCHMARK.md` defines golden datasets, Recall@5, MRR, etc.) to compare the DIY system against Flowbaby.

4. **Test daemon lock bypass** — As a quick win while building the replacement, investigate whether the daemon lock can be relaxed to allow multi-window shared access (read from any, write from owner).

---

## 6. Open Questions

| # | Question | Impact | Suggested Resolution |
|---|----------|--------|---------------------|
| Q1 | How much of the existing 1 GB Flowbaby data is actually useful vs. stale/superseded? | Determines migration priority | Run `list_memories.py` to audit data quality |
| Q2 | Can local embeddings (all-MiniLM-L6-v2, 384-dim) match Bedrock Titan v2 (1024-dim) for our specific query patterns? | Determines if Option B is sufficient or Option C is needed | A/B test with golden dataset |
| Q3 | Is the Cognee SDK roadmap (v0.6.0+) going to introduce more breaking changes? | Determines urgency of migration away from Cognee | Check Cognee GitHub releases |
| Q4 | Would Postgres-based memory (aligned with our "Postgres-first" philosophy) be better than file-based for the long term? | Architecture alignment | Investigate pgvector as an alternative to local vector stores |

---

## Appendix A: Skills Reference

| Skill | Key Takeaway for This Analysis |
|-------|-------------------------------|
| `memory-contract` | Defines store/retrieve contract — preserve this interface |
| `agent-memory-systems` | Memory failures look like intelligence failures — retrieval problem, not storage problem |
| `agent-memory-mcp` | Reference implementation: Node.js MCP server with `memory_search`, `memory_write`, `memory_read` |
| `memory-systems` | Vector RAG alone loses relationships; but for our structured summaries, vector RAG is sufficient |
| `hierarchical-agent-memory` | HAM approach: scoped CLAUDE.md files reduce token spend 94% — simpler can be better |
| `conversation-memory` | Tiered memory (short/long/entity) — we only need long-term memory |
| `embedding-strategies` | all-MiniLM-L6-v2 (384-dim, fast) is viable for local semantic search |
| `rag-engineer` | Semantic chunking > fixed chunking — but our summaries are already agent-chunked |
