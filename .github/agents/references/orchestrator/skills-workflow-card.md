## Phase 2: Skill Auto-Detection

For each phase in the selected pipeline, select the best-fit skills using a three-layer priority system.

### Layer 1 — UFlow Project Skills (Highest Priority)

Always check these 11 skills first. They are curated for this project and override general catalog matches.

| Skill                   | Trigger Conditions                          | Primary Phases                                |
| ----------------------- | ------------------------------------------- | --------------------------------------------- |
| `analysis-methodology`  | Investigation, root cause, unknowns, POC    | Analyst phases                                |
| `architecture-patterns` | ADR, patterns, anti-patterns, system design | Architect, Planner phases                     |
| `code-review-checklist` | Pre-implementation review, plan quality     | Critic phases                                 |
| `code-review-standards` | Post-implementation review, code quality    | Code Reviewer phases                          |
| `cross-repo-contract`   | Multi-repo, API contracts, cross-service    | Planner, Architect, Implementer               |
| `document-lifecycle`    | ALL phases (MANDATORY)                      | Every phase                                   |
| `engineering-standards` | SOLID, DRY, YAGNI, KISS, code quality       | Architect, Critic, Implementer, Code Reviewer |
| `memory-contract`       | ALL phases (MANDATORY)                      | Every phase                                   |
| `release-procedures`    | Versioning, semver, packaging, deploy       | DevOps phases                                 |
| `security-patterns`     | OWASP, auth, secrets, dependencies          | Security, Code Reviewer                       |
| `testing-patterns`      | TDD, test pyramid, coverage, mocking        | QA, Implementer, Code Reviewer                |

**Matching**: Tokenize the task description. If any token matches a skill's trigger conditions, include that skill. Skills marked MANDATORY are always included regardless of match.

### Layer 2 — Agent-Native Skills (Already Wired)

Each agent already loads specific skills per its `.agent.md` definition. These do NOT need separate routing — the agent handles them. The Orchestrator only lists them in the Workflow Card for visibility.

Reference: See the skill-to-agent mapping in each agent's `.agent.md` file.

### Layer 3 — General Catalog Skills (Supplement)

The general skills catalog (~950 skills) provides task-specific guidance beyond the UFlow baseline.

#### Step 1: Discover the Catalog (MANDATORY)

Before selecting Layer 3 skills, you **MUST** locate the catalog file:

1. **Search** the workspace for `catalog.json` using the `search` tool (query: `catalog.json` in `**/data/catalog.json`).
2. If found, read the file to access the `skills[]` array. Note the resolved path for the Workflow Card.
3. **If NOT found**: Print a warning in the Workflow Card: `⚠️ Catalog not found — proceeding with UFlow skills only (Layer 1). To enable dynamic skills, ensure the .agent skills workspace is open.` Then skip Layer 3 entirely.

**Common locations** (for reference, but always use search — never hard-code):

- Multi-root workspace: `.agent/skills/data/catalog.json`
- The catalog `skills[].path` values are relative to the `.agent/skills/` root (e.g., `skills/react-best-practices/SKILL.md`)

#### Step 2: Match and Score

1. Tokenize task description into keywords (lowercase, remove punctuation, filter words < 3 chars)
2. For each skill in catalog, compare tokens against `triggers[]` array
3. Score: Exact trigger match = 10 points, Partial match (substring) = 3 points
4. **UFlow stack bonus**: +15 points for skills matching Next.js, Supabase, React, Tailwind, TypeScript, Docker, PostgreSQL, Vitest
5. Filter by phase-relevant categories:
   - Plan/Architect phases: `workflow`, `architecture`
   - Build/Implement phases: `development`, `data-ai`, `infrastructure`
   - Review/QA phases: `testing`, `security`
   - Learn/Retro phases: `workflow`
6. Take top 1–3 matches per phase (avoid overloading agents with too many skills)
7. **Dedup**: If a general catalog skill overlaps with a UFlow skill, keep only the UFlow skill
8. **Load SKILL.md only** (i.e., the catalog `path` field). If the skill folder also contains `AGENTS.md`, downstream agents may consult it for deeper guidance — but Orchestrator routes only the `SKILL.md`.

#### Step 3: Emit Evidence (MANDATORY)

For every Layer 3 skill selected, emit a directive in the Workflow Card and handoff prompt:

```
Load skill '{skill-name}' from '{resolved-path-to-SKILL.md}' — {one-line reason}
```

The Workflow Card **MUST** always include the `Catalog:` line — either with matched skills or `(none — no matches above threshold)` or the catalog-not-found warning.

### Skill Selection Heuristics

When the task matches one of these categories, **you MUST include the listed UFlow skill AND search the catalog for the listed catalog candidates**. List at least one catalog skill in the Workflow Card if the catalog is available.

| Category          | Token triggers                                                                     | UFlow skill (Layer 1)   | Catalog candidates (Layer 3) — search by ID                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Database**      | database, schema, migration, table, query, index, RLS, postgres                    | `architecture-patterns` | `postgres-best-practices`, `postgresql`, `postgresql-optimization`, `sql-optimization-patterns`, `supabase-automation`, `nextjs-supabase-auth`, `neon-postgres`          |
| **Auth**          | auth, login, signup, session, JWT, password, OAuth                                 | `security-patterns`     | `auth-implementation-patterns`, `nextjs-supabase-auth`, `clerk-auth`, `broken-authentication`                                                                            |
| **API**           | API, endpoint, route, REST, handler                                                | `cross-repo-contract`   | `api-patterns`, `api-design-principles`, `api-documentation`, `api-security-best-practices`                                                                              |
| **UI**            | component, page, form, modal, UI, UX, responsive, tailwind                         | (none specific)         | `react-best-practices`, `react-patterns`, `react-ui-patterns`, `tailwind-design-system`, `tailwind-patterns`, `cc-skill-frontend-patterns`, `nextjs-app-router-patterns` |
| **Performance**   | slow, optimize, cache, latency, performance                                        | (none specific)         | `web-performance-optimization`, `performance-profiling`, `performance-engineer`, `application-performance-performance-optimization`                                      |
| **Testing**       | test, coverage, TDD, mock, fixture, vitest                                         | `testing-patterns`      | `javascript-testing-patterns`                                                                                                                                            |
| **TypeScript**    | typescript, types, generics, type-safe                                             | (none specific)         | `typescript-advanced-types`, `typescript-expert`, `typescript-pro`                                                                                                       |
| **Docker/Infra**  | docker, container, deploy, CI, CD, nginx                                           | (none specific)         | `docker-expert`, `vercel-deployment`, `cdk-patterns`                                                                                                                     |
| **Next.js**       | nextjs, app router, server component, RSC, middleware                              | (none specific)         | `nextjs-best-practices`, `nextjs-app-router-patterns`, `react-nextjs-development`                                                                                        |
| **Investigation** | bug, error, broken, crash, trace, rca, root cause, investigate, unknown, reproduce | `analysis-methodology`  | `systematic-debugging`, `variant-analysis`, `audit-context-building`, `verification-before-completion`                                                                   |

**If none of the above categories match**, still run the general scoring algorithm (Step 2) against the full catalog. Only skip Layer 3 if the catalog was not found.

---

## Phase 3: Workflow Card Generation

At the start of every workflow and at each phase transition, produce a Workflow Card.

### Workflow Card Format

```
╔══════════════════════════════════════════════════════════════╗
║  WORKFLOW CARD — Task #{document_id}                        ║
╠══════════════════════════════════════════════════════════════╣
║  Task: {task description}                                   ║
║  Type: {Feature|Bugfix|Refactor|Hotfix|Verification|Security Audit} ║
║  Pipeline: {Full|Abbreviated|Focused|Minimal} ({N} phases)  ║
╠══════════════════════════════════════════════════════════════╣
║  PIPELINE STATUS                                            ║
║  {✅|🔵|○} Phase 1: {agent name} {status}                   ║
║  {✅|🔵|○} Phase 2: {agent name} {status}                   ║
║  ...                                                        ║
╠══════════════════════════════════════════════════════════════╣
║  CURRENT PHASE: {phase name}                                ║
║  Agent: @{agent}                                            ║
║  Next: @{next_agent} (gate: {gate condition})               ║
╠══════════════════════════════════════════════════════════════╣
║  SKILLS FOR CURRENT PHASE                                   ║
║  UFlow:   {skill1}, {skill2}                                ║
║  Native:  {agent-embedded skill1}, {skill2}                 ║
║  Catalog: {general-catalog-skill1} (score: N)               ║
╠══════════════════════════════════════════════════════════════╣
║  ACCEPTANCE CRITERIA (populated after Planner phase)        ║
║  - {observable outcome 1}                                   ║
║  - {observable outcome 2}                                   ║
║  OUT OF SCOPE: {what agents must NOT touch — 1-2 items}     ║
╠══════════════════════════════════════════════════════════════╣
║  INSTRUCTIONS FOR @{agent}                                  ║
║  Load skill '{name}' from '{path}' — {reason}               ║
║  Load skill '{name}' from '{path}' — {reason}               ║
║  ...                                                        ║
╚══════════════════════════════════════════════════════════════╝
```

**Status icons**: ✅ = completed, 🔵 = current/in-progress, ○ = not started, ❌ = failed/blocked, ⏭ = skipped

### Handoff Instructions

When handing off to the next agent, include in the handoff message:

1. The Workflow Card (updated)
2. **Skill loading instructions** (MANDATORY when Layer 3 skills were selected):
   - For each Layer 3 skill, include a concrete line: `Load skill '{name}' from '{resolved-path}' — {reason}`
   - The path must resolve to an actual `SKILL.md` file in the workspace (e.g., `.agent/skills/skills/react-best-practices/SKILL.md`)
   - If no Layer 3 skills were selected, state: "No additional catalog skills for this phase."
3. Document ID to inherit: "Continue work chain #{ID}"
4. Gate condition for the NEXT transition: "After you complete, the gate for {next phase} requires: {condition}"

### Populating Acceptance Criteria & Out of Scope

The `ACCEPTANCE CRITERIA` and `OUT OF SCOPE` sections in the Workflow Card are **blank at initial classification** (the Orchestrator doesn't know them yet). Populate them after the Planner creates the plan:

1. When the Planner completes, read the plan's acceptance criteria from `agent-output/planning/`
2. Extract 2–3 observable outcomes and 1–2 out-of-scope boundaries
3. Update the Workflow Card with these before handing off to the next phase (Critic or Implementer)
4. If the plan doesn't define clear acceptance criteria, flag this to the user: "Plan lacks acceptance criteria — agents may drift"

---
