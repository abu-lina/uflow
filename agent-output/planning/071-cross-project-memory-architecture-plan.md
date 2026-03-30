---
ID: 071
Origin: 071
UUID: a4c8f1e2
Status: Code Review Approved
---

# Plan 071 — Cross-Project Memory Architecture

| Field            | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| **Plan ID**      | 071                                                                    |
| **Epic**         | Internal Tooling — Agent Memory Reliability (relates to ADR-003)       |
| **Target Release** | N/A — internal tooling, no version bump, no deployment                |
| **Related Issues** | None                                                                 |
| **Architecture** | [071-cross-project-memory-architecture-findings.md](../architecture/071-cross-project-memory-architecture-findings.md) |

## Changelog

| Date                | Author  | Change                              |
| ------------------- | ------- | ----------------------------------- |
| 2026-03-30T07:30Z   | planner | Plan created from architecture findings |
| 2026-03-30T08:00Z   | implementer | Status → In Progress; implementation started |
| 2026-03-30T08:30Z   | code-reviewer | Status → Code Review Approved; APPROVED (0C/0H/0M/1L/2I) |

---

## Value Statement and Business Objective

**As a** developer working across uflow (personal) and vplus (work),
**I want to** have a well-structured, portable memory architecture with clear scope separation,
**so that** agents retain verified conventions, gotchas, and patterns across sessions — reducing repeated rediscovery and improving output quality in both projects.

---

## Success Criteria

1. All four memory scopes have defined content taxonomy and file organization
2. User memory (`/memories/`) seeded with cross-project preferences, patterns, and debugging notes — under 200 lines total
3. Repo memory (`/memories/repo/`) seeded with uflow-specific conventions, gotchas, and verified patterns (minimum 5 files)
4. `memory-contract` skill updated with four-scope taxonomy, scope-selection guidance, and expanded storage categories
5. Starter kit templates committed in `docs/templates/memory-starter-kit/` for bootstrapping new projects
6. Setup instructions added to `docs/guides/` documenting the memory bootstrap process
7. Entire pattern is portable — vplus can bootstrap by copying 2 assets + running template copy

---

## Assumptions

1. VS Code Copilot auto-loads the first 200 lines of `/memories/*.md` — this is a platform behavior, not configurable
2. `/memories/` remains gitignored — memory files are local-only, never committed
3. Flowbaby MCP remains the primary tool for plan lifecycle and decision storage — this plan supplements it, doesn't replace it
4. The developer is the same person across uflow and vplus — user memory is physically shared on the same machine
5. No runtime code depends on memory files — they're consumed only by VS Code Copilot context injection

---

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| D1 | Four-layer model: user/repo/session/Flowbaby with strict boundaries | [RESOLVED] ADR-009 — each scope has enumerated content types and isolation rules |
| D2 | HAM pattern not adopted | [RESOLVED] ADR-010 — tooling mismatch; VS Code Copilot uses copilot-instructions.md, not CLAUDE.md |
| D3 | Starter kit as committed templates, not generator script | [RESOLVED] ADR-011 — templates are faster and simpler than scripts for 5-8 markdown files |
| D4 | No version bump for this plan | [RESOLVED] Internal tooling — no user-facing changes, no deployment artifacts |
| D5 | User memory budget: 3 files, ~60 lines each, <180 lines total | [RESOLVED] Under 200-line auto-load threshold with margin |
| D6 | Repo memory: 5 topic files, no line budget (not auto-loaded) | [RESOLVED] More files = easier agent discovery by filename |
| D7 | Existing `qa-plan-049-auth-flow-regression.md` in repo memory preserved, merged into new `gotchas.md` | [RESOLVED] Content migrated, old file removed to avoid duplication |

---

## Release Strategy

Standalone — no other known plans for this version. (N/A version — internal tooling, not released.)

---

## Plan

### Milestone 1: Create Starter Kit Templates

**Objective**: Produce committed template files that serve as the bootstrap mechanism for new projects.

**Deliverables**:
1. Create `docs/templates/memory-starter-kit/user/preferences.md` — template for coding preferences, workflow habits, tool preferences (~30 lines)
2. Create `docs/templates/memory-starter-kit/user/patterns.md` — template for cross-project patterns (~30 lines)
3. Create `docs/templates/memory-starter-kit/user/debugging.md` — template for debugging lessons (~20 lines)
4. Create `docs/templates/memory-starter-kit/repo/conventions.md` — template with placeholder structure for project-specific conventions
5. Create `docs/templates/memory-starter-kit/repo/gotchas.md` — template with format guidance (Plan/Issue ID | What happened | Root cause | Fix)
6. Create `docs/templates/memory-starter-kit/repo/patterns.md` — template for verified implementation patterns
7. Create `docs/templates/memory-starter-kit/repo/dead-ends.md` — template for approaches tried and rejected
8. Create `docs/templates/memory-starter-kit/repo/tech-debt.md` — template for known debt items with context
9. Create `docs/templates/memory-starter-kit/README.md` — brief instructions for how to use the templates (copy commands, what to customize)

**Acceptance**:
- All 9 files exist and contain meaningful placeholder content (not empty)
- README includes copy commands for both user and repo memory
- Templates reference the architecture findings doc for rationale

---

### Milestone 2: Seed User Memory for Developer

**Objective**: Populate `/memories/` with the developer's actual cross-project preferences.

**Deliverables**:
1. Create `/memories/preferences.md` with actual developer preferences extracted from copilot-instructions.md and observed workflow patterns (~30 lines)
2. Create `/memories/patterns.md` with cross-project patterns verified across uflow sessions (~30 lines)
3. Create `/memories/debugging.md` with debugging lessons learned from past plans (~20 lines)

**Acceptance**:
- Total line count across 3 files < 200 lines
- NO project-specific content (no "Supabase", no "uflow", no "tsvector")
- Content is factual and verified, not aspirational

**Constraint**: These files are gitignored. They exist only on the developer's local machine.

---

### Milestone 3: Seed Repo Memory for uflow

**Objective**: Populate `/memories/repo/` with uflow-specific knowledge extracted from architecture docs, plan history, and copilot-instructions.

**Deliverables**:
1. Create `/memories/repo/conventions.md` — uflow-specific conventions (German locale tsvector, server components default, RPC over ILIKE, Postgres-first principle, etc.)
2. Create `/memories/repo/gotchas.md` — incorporate existing `qa-plan-049-auth-flow-regression.md` content plus known gotchas from plan history (service worker CORS, category image 400, safe-area gaps)
3. Create `/memories/repo/patterns.md` — verified uflow patterns (full-text search via RPC, admin routes via service-role, staging-first enrichment, worktree parallel sessions)
4. Create `/memories/repo/dead-ends.md` — approaches rejected (direct ILIKE search, client-side ranking, Redis caching, HAM pattern)
5. Create `/memories/repo/tech-debt.md` — current problem areas from system-architecture.md (role authority fragmentation, App Router value leakage, etc.)
6. Remove `/memories/repo/qa-plan-049-auth-flow-regression.md` after content is merged into `gotchas.md`

**Acceptance**:
- All 5 new files populated with verifiable uflow-specific content
- Old single-file format replaced by topic-organized files
- Content sourced from architecture doc, copilot-instructions, and plan history — not invented

**Constraint**: These files are gitignored. They exist only locally.

---

### Milestone 4: Update memory-contract Skill

**Objective**: Extend the memory-contract skill to teach agents about all four scopes and when to use each.

**Deliverables**:
1. Add a "Memory Scopes" section after the "Core Principle" section that enumerates all four layers (user, repo, session, Flowbaby) with:
   - Location, auto-load behavior, content types, budget constraints, isolation rules
2. Add scope-selection guidance: "Before storing, ask: Is this project-specific (→ repo memory or Flowbaby) or would any project benefit (→ user memory)?"
3. Expand "When to Store" to explicitly list categories: Decision, Gotcha, Pattern, Constraint, Dead End — with examples
4. Add a "Cross-Scope Query Guide" section: where to look for what type of information
5. Update the skill version in frontmatter from "1.0" to "2.0"

**Acceptance**:
- Skill file passes markdown lint
- All four scopes documented with examples
- Scope-selection decision tree present
- Existing content (retrieve/store/anti-patterns) preserved — this is additive

---

### Milestone 5: Setup Guide Documentation

**Objective**: Document the memory bootstrap process for new projects and new developer machines.

**Deliverables**:
1. Create `docs/guides/MEMORY_SETUP.md` with:
   - Overview of the four-layer model (brief, link to architecture findings for details)
   - Step-by-step bootstrap for a new project (6 steps from architecture findings section 5.4)
   - Step-by-step bootstrap for a new developer machine (copy user memory from existing workspace)
   - Maintenance guidance (when to update, how to prune, what to archive)

**Acceptance**:
- Guide is self-contained — a developer can follow it without reading the architecture findings
- Includes actual copy commands (not just prose)
- References `docs/templates/memory-starter-kit/` for templates

---

## Testing Strategy

- **Validation**: Content accuracy review — all seeded memory content must be traceable to source (architecture doc, copilot-instructions, plan history)
- **Line budget**: User memory files must total < 200 lines (automated count check)
- **Isolation**: User memory files must not contain project-specific terms (grep check for "supabase", "uflow", "tsvector", etc.)
- **Completeness**: All files listed in milestones must exist
- **Template integrity**: Template files must contain meaningful placeholder content, not empty bodies
- **Skill validity**: Updated memory-contract skill must preserve all existing sections

---

## Validation

1. `wc -l memories/*.md` — total < 200
2. `grep -il "supabase\|uflow\|tsvector\|ummahflow" memories/*.md` — must return 0 results
3. `ls memories/repo/` — must show 5 files (conventions, gotchas, patterns, dead-ends, tech-debt)
4. `ls docs/templates/memory-starter-kit/user/` — must show 3 files
5. `ls docs/templates/memory-starter-kit/repo/` — must show 5 files
6. `grep -c "Memory Scopes" .github/skills/memory-contract/SKILL.md` — must return 1
7. `test -f docs/guides/MEMORY_SETUP.md` — must exist

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| User memory auto-load budget exceeded (>200 lines) | Low | Medium — bloats every agent context | Strict line budget in M2 acceptance; validation check |
| Project-specific content leaks into user memory | Low | Medium — wrong conventions applied in vplus | Grep-based isolation check in validation |
| Memory files accidentally committed to git | Very Low | Low — gitignored already | .gitignore already covers `/memories/`; templates are separate |
| Agents ignore the updated memory-contract | Medium | Medium — behavior doesn't change | Memory-contract is loaded at session start by all agent modes |
| Seeded content becomes stale over time | Medium | Low — agents work with outdated info | Setup guide includes maintenance guidance |

---

## Duration Estimates

| Phase | Estimate | Notes |
|-------|----------|-------|
| Planning | 30min | This document |
| Critique | 15min | Straightforward documentation review |
| Implementation | 1-2h | Creating ~15 files, mostly markdown content |
| Code Review | 15min | Content accuracy check, no code logic |
| QA | 15min | Automated validation checks |
| **Total** | **~2-3h** | Low uncertainty — all deliverables are markdown files |

**Uncertainty drivers**: Primary risk is content quality (seeded memory must be accurate and sourced), not technical complexity.

---

## Out of Scope

- Replacing Flowbaby with a different memory backend (separate initiative per ADR-003)
- HAM directory-scoped CLAUDE.md files (rejected per ADR-010)
- Automated memory generation scripts or tooling
- Seeding repo memory for vplus (vplus owner's responsibility using the starter kit)
- Changes to copilot-instructions.md or agent mode files (memory-contract skill handles behavioral guidance)
- Runtime code changes or deployment artifacts

---

## Handoff Notes

- **For Implementer**: All deliverables are markdown files. No TypeScript, no builds, no tests to run. The validation section has 7 automated checks to run after completion.
- **For Code Reviewer**: Focus on content accuracy — is the seeded memory traceable to source docs? Does user memory stay project-agnostic?
- **For QA**: Run the 7 validation commands. Check that templates and seeded files are non-empty with meaningful content.
