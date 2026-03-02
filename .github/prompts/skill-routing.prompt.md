# Skill Routing Instructions

**Purpose**: Reusable skill auto-detection algorithm. Can be referenced by any agent that needs to discover relevant skills for a task beyond its natively-loaded skills.

## How to Use

When given a task description, apply this three-layer skill selection:

### Layer 1 — UFlow Project Skills (Priority)

Check against the 11 curated skills in `.github/skills/`. These always override general catalog matches.

| Skill                   | Load When Task Mentions                                    | Path                                            |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `analysis-methodology`  | investigation, root cause, unknown, debug, trace, POC      | `.github/skills/analysis-methodology/SKILL.md`  |
| `architecture-patterns` | architecture, ADR, pattern, anti-pattern, design, system   | `.github/skills/architecture-patterns/SKILL.md` |
| `code-review-checklist` | review plan, pre-implementation, critique, evaluate        | `.github/skills/code-review-checklist/SKILL.md` |
| `code-review-standards` | review code, post-implementation, quality, maintainability | `.github/skills/code-review-standards/SKILL.md` |
| `cross-repo-contract`   | multi-repo, API contract, cross-service, integration       | `.github/skills/cross-repo-contract/SKILL.md`   |
| `document-lifecycle`    | _(always loaded — mandatory for all agents)_               | `.github/skills/document-lifecycle/SKILL.md`    |
| `engineering-standards` | SOLID, DRY, YAGNI, KISS, clean code, refactor              | `.github/skills/engineering-standards/SKILL.md` |
| `memory-contract`       | _(always loaded — mandatory for all agents)_               | `.github/skills/memory-contract/SKILL.md`       |
| `release-procedures`    | release, deploy, version, semver, package, changelog       | `.github/skills/release-procedures/SKILL.md`    |
| `security-patterns`     | security, OWASP, auth, secrets, vulnerability, XSS, CSRF   | `.github/skills/security-patterns/SKILL.md`     |
| `testing-patterns`      | test, TDD, coverage, mock, fixture, test pyramid           | `.github/skills/testing-patterns/SKILL.md`      |

### Layer 2 — Agent-Native Skills

Each agent already loads skills defined in its `.agent.md` file. Do NOT duplicate these. Only supplement with additional skills the agent doesn't natively load.

### Layer 3 — General Catalog (Supplement)

Search the workspace for the skills catalog file (often `.agent/skills/data/catalog.json` in a multi-root workspace) for additional matches:

1. **Tokenize** task description: lowercase, remove punctuation, filter words < 3 characters
2. **Score** each catalog skill: compare tokens to its `triggers[]` array
   - Exact trigger match: **10 points**
   - Partial match (substring): **3 points**
   - **UFlow stack bonus** (+15 points): Next.js, Supabase, React, Tailwind, TypeScript, Docker, PostgreSQL, Vitest
3. **Filter** by phase-relevant categories:
   - Plan/Architect: `workflow`, `architecture`
   - Build/Implement: `development`, `data-ai`, `infrastructure`
   - Review/QA: `testing`, `security`
   - Learn/Retrospective: `workflow`
4. **Take** top 3 per phase. Deduplicate against UFlow skills.

### Domain Heuristics

When the task falls into a known domain, always include these skills:

| Domain      | Signal Tokens                                                   | Always Include          | Search Catalog For                                                                          |
| ----------- | --------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Database    | database, schema, migration, table, query, index, RLS, postgres | `architecture-patterns` | `database-design`, `postgres-best-practices`, `nextjs-supabase-auth`, `supabase-automation` |
| Auth        | auth, login, signup, session, JWT, password, OAuth              | `security-patterns`     | `auth-implementation-patterns`, `nextjs-supabase-auth`                                      |
| API         | API, endpoint, route, REST, handler                             | `cross-repo-contract`   | `api-patterns`, `api-design-principles`                                                     |
| UI          | component, page, form, modal, UI, UX, responsive                | _(none mandatory)_      | `react-best-practices`, `frontend-developer`, `tailwind-design-system`, `tailwind-patterns` |
| Performance | slow, optimize, cache, latency, performance                     | _(none mandatory)_      | `web-performance-optimization`, `performance-profiling`, `performance-engineer`             |
| Testing     | test, coverage, TDD, mock, fixture                              | `testing-patterns`      | `test-driven-development`                                                                   |

### Output Format

For each skill selected, output:

```
Load skill '{skill-name}' from '{path}' — {one-line reason why it's relevant for this task}
```

Example:

```
Load skill 'security-patterns' from '.github/skills/security-patterns/SKILL.md' — task involves auth changes requiring OWASP review
Load skill 'auth-implementation-patterns' from 'skills/auth-implementation-patterns/SKILL.md' — catalog skill for OAuth/session patterns (score: 25)
```
