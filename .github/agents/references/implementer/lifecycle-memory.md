# Dynamic Skill Loading

When receiving a handoff from `@Orchestrator` (or any agent) that includes skill loading instructions:

1. **Scan** the handoff prompt or Workflow Card for lines matching: `Load skill '{name}' from '{path}'`
2. **Read** each referenced skill file using `readFile` on the specified path
3. **Incorporate** the skill's instructions into your work for this task
4. **UFlow skills** (`.github/skills/`): Always take priority over catalog skills
5. **Catalog skills** (`skills/` in the `.agent` workspace): Supplement your native skills — follow their guidance where it doesn't conflict with UFlow skills
6. **Skip** skills you already load natively (e.g., `document-lifecycle`, `memory-contract`, `engineering-standards`, `testing-patterns`)

**Catalog skills available for this agent** (load when the task touches these domains):

| Skill                     | Path                                                    | When to load                                                                                       |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `react-best-practices`    | `.agent/skills/skills/react-best-practices/SKILL.md`    | Any React/Next.js component work — server/client split, waterfall elimination, bundle optimization |
| `nextjs-best-practices`   | `.agent/skills/skills/nextjs-best-practices/SKILL.md`   | App Router data fetching, layouts, streaming, server actions                                       |
| `postgres-best-practices` | `.agent/skills/skills/postgres-best-practices/SKILL.md` | Any Supabase/Postgres work — RLS, indexing, query optimization                                     |

---

# Document Lifecycle

**MANDATORY**: Load `document-lifecycle` skill. You **inherit** document IDs.

**ID inheritance (MANDATORY)**: When creating an implementation doc, copy `ID`, `Origin`, `UUID` from the plan you are implementing.

- Treat `ID` / `Origin` / `UUID` as immutable identifiers for the plan chain (copy/paste exactly).
- Do not invent new values (e.g., do not set `Origin: Orchestrator`).
- If a mismatch is discovered between your doc header and the plan header, stop and request clarification from Planner before proceeding.

**Document header**:

```yaml
---
ID: [from plan]
Origin: [from plan]
UUID: [from plan]
Status: Active
---
```

**Self-check on start**: Before starting work, scan `agent-output/implementation/` for docs with terminal Status (Committed, Released, Abandoned, Deferred, Superseded) outside `closed/`. Move them to `closed/` first.

**Closure**: DevOps closes your implementation doc after successful commit.

---

## Memory Health Check (MANDATORY)

At the start of work (before substantive decisions), run **one** uflow memory retrieval.

- If the retrieval tool is unavailable or errors, explicitly declare: **NO-MEMORY MODE** and proceed artifact-first.
- Do not silently fall back to alternative stores (notes/SQLite) without declaring no-memory mode.

# Memory Contract

**MANDATORY**: Load `memory-contract` skill at session start. Memory is core to your reasoning.

**Key behaviors:**

- Retrieve at decision points (2–5 times per task)
- Store at value boundaries (decisions, findings, constraints)
- If tools fail, announce no-memory mode immediately

**Quick reference:**

- Retrieve: `#uflow.uflow-memory/flowbaby_retrieveMemory { "query": "specific question", "maxResults": 3 }`
- Store: `#uflow.uflow-memory/flowbaby_storeMemory { "topic": "3-7 words", "context": "what/why", "decisions": [...] }`

Full contract details: `memory-contract` skill

---

# Completion & Next Step

When you finish your work, **always end your response** with a clear next-step block:

```
✅ PHASE COMPLETE: [N] Implementer
📄 Output: agent-output/implementation/{document}
➡️ NEXT: Pick the next agent from the active Workflow Card pipeline
   Gate: Review verdict must be APPROVED or APPROVED_WITH_COMMENTS
```

Adjust routing based on the active Workflow Card pipeline (e.g., Feature: next is Code Reviewer; Bugfix: may go direct to QA).
