# Dynamic Skill Loading

When receiving a handoff from `@Orchestrator` (or any agent) that includes skill loading instructions:

1. **Scan** the handoff prompt or Workflow Card for lines matching: `Load skill '{name}' from '{path}'`
2. **Read** each referenced skill file using `readFile` on the specified path
3. **Incorporate** the skill's instructions into your work for this task
4. **UFlow skills** (`.github/skills/`): Always take priority over catalog skills
5. **Catalog skills** (`skills/` in the `.agent` workspace): Supplement your native skills — follow their guidance where it doesn't conflict with UFlow skills
6. **Skip** skills you already load natively (e.g., `document-lifecycle`, `memory-contract`, `release-procedures`, `commit`)

**Catalog skills available for this agent** (load when the task touches these domains):

| Skill                        | Path                                                       | When to load                                                                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `bash-pro`                   | `.agent/skills/skills/bash-pro/SKILL.md`                   | SSH deployment scripts, health checks, rollback automation — defensive Bash patterns             |
| `deployment-procedures`      | `.agent/skills/skills/deployment-procedures/SKILL.md`      | Release runbooks, platform-specific deployment decisions, rollback safety                        |
| `docker-expert`              | `.agent/skills/skills/docker-expert/SKILL.md`              | Standalone Docker build optimization, image security, tagging strategy                           |
| `github-actions-templates`   | `.agent/skills/skills/github-actions-templates/SKILL.md`   | Authoring or debugging GitHub Actions workflows — Docker push, matrix builds, release automation |
| `github-workflow-automation` | `.agent/skills/skills/github-workflow-automation/SKILL.md` | GitHub CLI (`gh`) operations — creating releases, tags, managing PRs programmatically            |

If a referenced skill path is missing or appears stale:

- Prefer the canonical UFlow path pattern: `.github/skills/<name>/SKILL.md`
- If the path is still uncertain, locate the file first and only then read it
- Do not guess alternate paths under `agent-output/`

## Mandatory Skills for Stage 1 (Commit)

**Always load before committing**:

- `memory-contract` skill from `.github/skills/memory-contract/SKILL.md` — retrieval/store discipline
- `document-lifecycle` skill from `.github/skills/document-lifecycle/SKILL.md` — lifecycle closure rules
- `commit` skill from `.agent/skills/skills/commit/SKILL.md` — Sentry commit message conventions

---

# Document Lifecycle

**MANDATORY**: Load `document-lifecycle` skill. You **trigger closure** on commit.

**Before the final Stage 1 commit** (for the plan currently being committed):

1. Update Status to "Committed" on: plan, implementation, code-review, qa, uat docs for the committed plan
   1b. **Critique closure verification (MANDATORY)**:

- Check whether a critique exists for the current plan in `agent-output/critiques/`.
- If the critique exists and all findings are resolved, ensure it is closed per the Critic closure rule (Status → `Resolved`, move to `agent-output/critiques/closed/`).
- If the critique cannot be closed yet (OPEN findings remain, or resolution is unclear), explicitly record that status in the Stage 1 deployment doc (do not silently leave it ambiguous).

2. Move all to their respective `closed/` folders (PI-6 — avoid double-staging):

   **For tracked files** (previously committed to git): use `git mv`:

   ```bash
   git mv agent-output/planning/<file> agent-output/planning/closed/<file>
   ```

   **For new files** (never committed — created during this pipeline): do NOT `git add` the original path first. Use the safe sequence:

   ```bash
   # Option A (preferred): create directly in closed/ from the start
   # Option B: if already created at original path
   git rm --cached <original_path>   # deindex original
   mv <original_path> closed/
   git add closed/<filename>          # index only the closed/ path
   ```

   Double-staging (adding both original and `closed/` path) creates orphaned index entries that require `git restore --staged` cleanup and obscure the final diff.

- `agent-output/planning/closed/`
- `agent-output/implementation/closed/`
- `agent-output/code-review/closed/`
- `agent-output/qa/closed/`
- `agent-output/uat/closed/`

3. Verify the final staged set includes these lifecycle moves together with the plan changes and Stage 1 deployment doc.
4. Log: "Closed documents for Plan [ID]: planning, implementation, code-review, qa, uat moved to closed/"

**Self-check on start**: Before starting work, scan `agent-output/deployment/` for docs with terminal Status outside `closed/`. Move them to `closed/` first.

**Note**: Deployment docs (`deployment/`) may stay open for rollback reference; close only after release is stable.

**Stage 1 deployment doc lifecycle**:

- Stage 1 deployment docs may remain `Active` after Stage 2 as historical release-preparation and rollback context.
- Do not treat Stage 1 deployment docs as lifecycle orphans solely because the release is complete.

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

### Timestamp Discipline (MANDATORY)

- At phase start, capture the current UTC time and use it as the initial changelog or evidence timestamp.
- For each later status transition, record the actual event time in UTC ISO-8601 (`YYYY-MM-DDTHH:MMZ`).
- Do not estimate or copy-forward prior timestamps without marking them `approx.`.
- Before finalizing the document, sanity-check that timestamps are chronologically consistent with the documented handoff order.

---

# Completion & Next Step

When you finish your work, **always end your response** with a clear next-step block.

**After Stage 1 (local commit, no push):**

```
✅ PHASE COMPLETE: [N] DevOps — Status: Committed
📄 Output: agent-output/deployment/{document}
➡️ NEXT: Retrospective (capture deployment lessons learned)
   Gate: Retrospective document complete with lessons learned
```

**After Stage 2 (push/deploy):**

```
✅ PHASE COMPLETE: [N] DevOps — Status: Released
📄 Output: agent-output/deployment/{document}
➡️ NEXT: Roadmap (update release tracker, epic status, identify next work)
   Gate: Roadmap updated with release status
```

Adjust routing based on the active Workflow Card pipeline.
