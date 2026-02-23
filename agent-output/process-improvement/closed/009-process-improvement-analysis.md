---
ID: 009
Origin: 009
UUID: 8f2c1a6d
Status: Resolved
---

# Process Improvement Analysis 009 — From Retro 008 (Search Index Validation & Fallback Guards)

**Source Retrospective**: `agent-output/retrospectives/008-search-index-validation-and-fallback-guards.md`
**Related Plan**: `agent-output/planning/closed/008-search-index-validation-and-fallback-guards.md`
**Date**: 2026-02-22
**Mode**: ProcessImprovement (no source code changes)

## Changelog

| Date | Action | Summary |
| --- | --- | --- |
| 2026-02-22 | Analysis created | Extracted P1–P7 from Retro 008 and validated against current agent instructions |
| 2026-02-22 | Updates implemented | Applied Option 1 instruction updates across Implementer/DevOps/QA/UAT/Retrospective |

---

## Executive Summary

- **Recommendations extracted**: 7 (P1–P7)
  - High impact: 3 (P1, P3, P5)
  - Medium impact: 2 (P2, P4)
  - Low impact: 2 (P6, P7)
- **Already implemented / largely present**: 2
  - P2 partially present (QA already prefers delta-lint)
  - P4 already present (DevOps agent already mandates two-stage model)
- **Conflicts found**: 2 (scope constraints vs proposed owners)
- **Overall risk**: LOW–MEDIUM (instruction-only changes; risk is workflow friction if made too strict)
- **Recommendation**: Implement P1 + P3 + P5 as small, additive checklist gates across affected agent instructions; record P2/P4 as “already aligned” with minor clarifications.

---

## Changelog Pattern Analysis

### Documents Reviewed

- Retrospective: `agent-output/retrospectives/008-search-index-validation-and-fallback-guards.md`
- Plan: `agent-output/planning/closed/008-search-index-validation-and-fallback-guards.md`
- Implementation: `agent-output/implementation/closed/008-search-index-validation-and-fallback-guards.md`
- QA: `agent-output/qa/closed/008-search-index-validation-and-fallback-guards-qa.md`
- UAT: `agent-output/uat/closed/008-search-index-validation-and-fallback-guards-uat.md`
- Deployment: `agent-output/deployment/v0.4.1.md`
- Agent instructions (current):
  - `.github/agents/implementer.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/code-reviewer.agent.md`
  - `.github/agents/retrospective.agent.md`
  - `.github/agents/pi.agent.md`

### Handoff Patterns Observed (Retro 008)

| Pattern | Frequency | Root Cause | Impact | Recommendation |
|---|---:|---|---|---|
| Memory stored but not retrievable | 1 | Memory entries lack consistent “retrieval keywords”; no post-store retrieval validation | Retrospective had to re-derive context from artifacts | P1: Validate retrieval immediately after storing memory |
| Orphaned docs found during QA preflight | 1 | Not all phases enforce folder hygiene checks | Risk of duplicate/conflicting docs; confusion in later phases | P3: Mandatory doc preflight across phases |
| Repo-wide lint noise | Persistent | Legacy lint backlog (6,837 errors) | Slows QA unless delta-lint is used | P2: Standardize delta-lint (already partially present) |

### Efficiency Metrics

| Metric | Value | Evidence |
|---|---:|---|
| Total duration (end-to-end) | ~3 hours | Retro 008 timeline table |
| Rejections | 0% | Retro 008 (“Linear progression with zero rejections”) |
| Rework | 0% | Retro 008 (“zero rework required”) |
| Quality gates first-pass | 100% | QA + UAT docs |

---

## Recommendation Analysis

### P1 — Validate Memory Retrieval After Storage (HIGH)

- **Source**: Retro 008 “Memory retrieval gap at retrospective”
- **Current state**:
  - Most agents include a general “Use Flowbaby memory for continuity” requirement.
  - Implementer/DevOps already define *when* to store memory (“Memory Checkpoints”), but no agent requires a **post-store retrieval sanity check**.
- **Problem**:
  - If memory is stored with inconsistent topics/terms, later retrieval queries won’t match (observed: 0 results for retro query).

**Proposed change (instruction-only)**

Add a lightweight, conditional step: after storing a memory checkpoint, run a retrieval query that should match it and confirm at least 1 result.

**Implementation template (copy/paste)**

1) `.github/agents/implementer.agent.md` — extend “Memory Checkpoints (MANDATORY)” section:

```markdown
### Memory Retrieval Validation (MANDATORY)

Immediately after storing a Flowbaby memory checkpoint, run a retrieval query that should match it.

- Required: the retrieval returns ≥ 1 result.
- If retrieval returns 0 results:
  - Store a second memory entry with a clearer topic that includes: `Plan <ID>`, phase name, and 2–3 stable keywords (e.g., `migration`, `EXPLAIN`, `fallback`, `release`).
  - Then re-run retrieval to confirm discoverability.
```

2) `.github/agents/devops.agent.md` — add under Stage 1 and Stage 2 memory steps:

```markdown
- After storing Flowbaby memory, immediately retrieve using query:
  "Plan <ID> DevOps Stage <1|2> <version>"
  Confirm at least one result.
```

3) `.github/agents/retrospective.agent.md` — add a “memory retrieval strategy” bullet in Process:

```markdown
- Retrieve using at least 2 queries:
  - "Plan <ID> release <version>" (phase summary)
  - "Plan <ID> handoff issues" (process gaps)
If retrieval returns 0 results, document "NO-MEMORY MODE" and proceed artifact-first.
```

**Risk level**: LOW

**Mitigation**: Make it conditional (only for milestone/phase boundary checkpoints) to avoid busywork.

---

### P2 — Standardize Delta-Lint for QA (MEDIUM)

- **Source**: Retro 008 “Delta-lint pattern effective”
- **Current state**:
  - QA instructions already include: **“Lint guidance (delta lint preferred)”**.
- **Gap**:
  - “Preferred” can be interpreted as optional; in repos with known lint backlog, QA needs a stronger default.

**Proposed change (instruction-only)**

Tighten language in QA doc: delta-lint is the default path; repo-wide lint is informational unless explicitly requested.

**Implementation template (copy/paste)**

`.github/agents/qa.agent.md` — update the lint guidance block:

```markdown
6. **Lint guidance (delta lint default)**:

- Default: lint only files changed by the plan.
- Treat repo-wide lint failures as **informational** unless the plan touches lint configuration or the user explicitly asks for repo-wide compliance.
- If delta-lint passes but repo-wide lint is huge, record it as known debt (do not block the plan).
```

**Risk level**: LOW

---

### P3 — Enforce Document Lifecycle Preflight Across Phases (HIGH)

- **Source**: Retro 008 “QA preflight orphan detection”
- **Current state**:
  - Code Reviewer / DevOps / Retrospective already have “Self-check on start” preflight scans.
  - QA and UAT currently have tooling preflights, but do not explicitly require **terminal-status doc cleanup** in their domain.

**Proposed change (instruction-only)**

Add “Self-check on start” blocks to QA + UAT that match the established pattern.

**Implementation template (copy/paste)**

1) `.github/agents/qa.agent.md` — add near the start of **Process** Phase 1:

```markdown
**Self-check on start (MANDATORY)**: Before starting QA, scan `agent-output/qa/` for docs with terminal Status (QA Complete, Released, Abandoned, Deferred, Processed) outside `closed/`. Move them to `agent-output/qa/closed/` first.
```

2) `.github/agents/uat.agent.md` — add near the start of **Core Responsibilities** or Workflow:

```markdown
**Self-check on start (MANDATORY)**: Before starting UAT, scan `agent-output/uat/` for docs with terminal Status (UAT Complete, Released, Abandoned, Deferred, Processed) outside `closed/`. Move them to `agent-output/uat/closed/` first.
```

**Risk level**: LOW

**Mitigation**: Limit scope to the agent’s own domain folder to avoid cross-agent interference.

---

### P4 — Two-Stage DevOps as Standard (MEDIUM)

- **Source**: Retro 008 “Two-stage DevOps workflow”
- **Current state**:
  - Already implemented in `.github/agents/devops.agent.md` as **Two-Stage Release Model**.

**Proposed action**: Mark as ✅ already aligned; no change needed.

---

### P5 — EXPLAIN ANALYZE Gate for Search Migrations (HIGH)

- **Source**: Retro 008 “EXPLAIN as mandatory gate proved index effectiveness”
- **Current state**:
  - Plans can include EXPLAIN requirements, but there is no cross-agent standard requiring DB plan evidence when search indexes/RPCs are introduced.
  - Implementer has a Schema Verification Gate, but not a DB query-plan validation gate.

**Proposed change (instruction-only)**

Add a conditional “DB Plan Evidence Gate” for search-index/RPC work: provide EXPLAIN evidence OR document why it’s not feasible.

**Implementation template (copy/paste)**

`.github/agents/implementer.agent.md` — add near “Schema Verification Gate”:

```markdown
### DB Plan Evidence Gate (Search) (MANDATORY WHEN APPLICABLE)

If a plan adds/changes search-related indexes or RPCs, you MUST provide one of:

- **Option A (preferred)**: `EXPLAIN (ANALYZE, BUFFERS)` evidence showing index usage on representative queries.
- **Option B**: A documented reason EXPLAIN cannot be run (missing access/data) plus a follow-up action owner (QA/UAT/DevOps) and explicit risk note.

Record evidence (or deferral rationale) in the implementation doc.
```

**Risk level**: MEDIUM

**Mitigation**: Conditional applicability + explicit escape hatch prevents deadlocks when DB access is limited.

---

### P6 — Memory Storage Descriptor Templates (LOW)

- **Source**: Retro 008 “Memory storage descriptor templates”
- **Current state**:
  - Agents store memory but with variable topic naming.

**Proposed action**: Defer until P1 is implemented; P1 provides immediate benefit with minimal standardization.

---

### P7 — Automated Changelog Entry Validation (LOW)

- **Source**: Retro 008 “Automated changelog entry validation”
- **Current state**:
  - Would require tooling/scripts (out of scope for instruction-only changes).

**Proposed action**: Defer; capture as “future tooling idea”.

---

## Conflict Analysis

| Conflict | Recommendation | Conflicting instruction | Nature | Impact | Proposed resolution | Resolved? |
|---|---|---|---|---|---|---|
| C-1 | P1 owner suggests “Memory Contract update” | PI constraints: only edit `.agent.md` and README.md | Scope constraint | Cannot edit `memory-contract` skill doc directly under current constraints | Implement P1 via agent instruction additions (Implementer/DevOps/Retrospective) instead of skill doc | ✅ |
| C-2 | P3 owner suggests “Document lifecycle skill update” | PI constraints: only edit `.agent.md` and README.md | Scope constraint | Cannot edit `document-lifecycle` skill doc directly under current constraints | Implement P3 via QA/UAT agent “Self-check on start” blocks (consistent with Code Reviewer/DevOps/Retrospective) | ✅ |

---

## Logical Challenges

| Challenge | Affected recommendations | Clarification needed | Proposed solution |
|---|---|---|---|
| Memory retrieval depends on user’s query wording | P1, P6 | What queries are “standard” across phases? | Require inclusion of `Plan <ID>` + phase keyword in topic, and post-store retrieval verification |
| EXPLAIN depends on DB access and data volume | P5 | What counts as representative evidence? | Allow escape hatch (Option B) but require risk note + follow-up owner |

---

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| P1: Retrieval validation | LOW | Small added step; prevents silent memory loss | Conditional only at checkpoints |
| P2: Delta-lint default | LOW | Already present; wording change | Keep repo-wide lint as informational |
| P3: Preflight across phases | LOW | Reuses existing pattern from other agents | Domain-limited scan only |
| P5: EXPLAIN gate | MEDIUM | Could block plans without DB access if too rigid | Conditional applicability + escape hatch |

---

## Implementation Recommendations

### High-Impact, Low-Risk (Implement First)

- 🆕 P1: Memory retrieval validation (Implementer + DevOps + Retrospective)
- 🆕 P3: Doc preflight for QA + UAT
- 🆕 P2: Tighten QA delta-lint default (minor)

### Medium-Impact or Medium-Risk

- 🆕 P5: Conditional EXPLAIN gate for search-index/RPC changes

### Low-Impact or High-Risk (Defer)

- ⏸️ P6: Descriptor templates (after P1)
- ⏸️ P7: Automated changelog validation (tooling)

---

## Suggested Agent Instruction Updates

**Files to update (after approval):**

- `.github/agents/implementer.agent.md`
  - Add “Memory Retrieval Validation (MANDATORY)”
  - Add “DB Plan Evidence Gate (Search) (MANDATORY WHEN APPLICABLE)”

- `.github/agents/devops.agent.md`
  - Add explicit “post-store retrieval sanity check” for Stage 1 / Stage 2 memory entries

- `.github/agents/retrospective.agent.md`
  - Add retrieval query guidance + explicit “NO-MEMORY MODE” documentation path

- `.github/agents/qa.agent.md`
  - Add doc lifecycle self-check on start
  - Strengthen delta-lint wording from “preferred” to “default”

- `.github/agents/uat.agent.md`
  - Add doc lifecycle self-check on start

**Validation plan:**

1. Next plan: at least one mid-phase memory entry is retrievable by query `Plan <ID> <phase>`.
2. Next QA run: delta-lint used by default; repo-wide lint recorded as informational when pre-existing.
3. Next pipeline: no terminal-status docs remain outside `closed/` for QA/UAT domains.
4. Next search index/RPC plan: includes EXPLAIN evidence OR explicit deferral with owner.

---

## User Decision Required

Choose one:

1. **Update now (recommended)**: Apply the instruction updates above immediately.
2. **Review first**: I’ll produce a patch preview (diff-only) for each agent file, then you approve.
3. **Phase rollout**: Implement only P1 + P3 now; defer P2 + P5.
4. **Defer**: Keep as recommendations only.

---

## Related Artifacts

- Source retrospective: `agent-output/retrospectives/008-search-index-validation-and-fallback-guards.md`
- Related plan: `agent-output/planning/closed/008-search-index-validation-and-fallback-guards.md`
- Prior PI: `agent-output/process-improvement/closed/008-process-improvement-analysis.md`
- Prior PI updates: `agent-output/process-improvement/closed/008-agent-instruction-updates.md`
- Current agent instructions:
  - `.github/agents/implementer.agent.md`
  - `.github/agents/devops.agent.md`
  - `.github/agents/qa.agent.md`
  - `.github/agents/uat.agent.md`
  - `.github/agents/retrospective.agent.md`
