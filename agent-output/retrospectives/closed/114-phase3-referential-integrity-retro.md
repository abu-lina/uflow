---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Processed
---

# Retrospective 114: Plan 114 Phase 3 — Referential Integrity

**Plan Reference**: `agent-output/planning/closed/114-db-schema-staged-refactor-plan.md`  
**Date**: 2026-04-30T01:10Z  
**Retrospective Facilitator**: retrospective  
**Focus**: Repeatable process improvements over one-off technical details

---

## Summary

**Value Statement**: Replace application-enforced integrity with database-enforced integrity for many-to-many relationships (junction tables) and polymorphic associations (typed FKs).  
**Value Delivered**: YES — Both F-2 (junction tables) and F-4 (typed FKs) fully shipped. All acceptance criteria met. Zero scope drift.  
**Implementation Duration**: ~3 hours (2026-04-29T23:00Z → 2026-04-30T01:00Z)  
**Overall Assessment**: Highly efficient delivery for a significant schema refactor spanning 37 files. One necessary code-review cycle-back caught a real release blocker (stale runtime column references). All quality gates passed cleanly. Released as v0.11.5.

---

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
| --- | --- | --- | --- | --- |
| Implementation | 2–3 days (est.) | ~2 hours | -22+ hours | Clean-slate project with no active users; operator context enabled aggressive delivery |
| Code Review | 1 pass | 2 passes | +1 pass | REJECTED → remediate → APPROVED; HIGH finding caught real blocker |
| QA | 30–45 min | ~30 min | On target | Test pyramid executed sequentially; all gates clear |
| UAT | 15–30 min | ~15 min | On target | All criteria verified from artifacts; no ambiguity |
| DevOps Stage 1 | 15 min | ~20 min | Slightly over | Rebase check, gitignore audit, doc status updates |
| DevOps Stage 2 | 10 min | ~10 min | On target | Push, tag, release, roadmap update |
| **Total** | ~3 days | ~3 hours | **-22+ hours** | Operational context (no active users) dominated timeline compression |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Acceptance criteria were concrete and binary**: The plan defined five explicit criteria for Phase 3 (junction tables with CASCADE, no UUID arrays, typed FKs, cascade deletes, queries updated and tested). This made every downstream agent's verification unambiguous — no interpretation drift.
- **TDD-first discipline held end-to-end**: All new code was test-first. When implementation reached badge services, tests caught a subtle query-chain ordering issue *before* the code was committed. This prevented a silent correctness bug from reaching code review.
- **Backward compatibility via service-layer abstraction was pre-planned**: `withLegacyFields()` / `mapBadgeRowWithLegacyFields()` were defined as part of the design intent, not retrofitted. This made the migration safe for callers without requiring coordinated cross-file changes.

### Agent Collaboration Patterns

- **Code reviewer's residue sweep caught a real blocker**: The implementer migrated service-layer paths but missed 5 UI runtime components that queried dropped bookmark columns directly. The reviewer's structured residue sweep — grep for `bookmarkable_id|bookmarkable_type` across `src/app/**` and `src/components/**` — surfaced this as a HIGH finding. Without it, post-migration runtime would have failed silently on bookmark operations.
- **QA's regression guardrail test prevents recurrence**: Rather than just fixing the runtime paths, QA added a file-scan test (`plan114-bookmark-typed-fk-runtime.test.ts`) that will catch any future reintroduction of dropped columns in those 5 UI files. Catch-now AND prevent-forever.
- **UAT focused on value delivery, not re-testing**: UAT reviewed acceptance criteria against artifact evidence rather than re-running tests. This correctly delineates QA scope (does it work?) from UAT scope (does it deliver value?).

### Quality Gates

- **Migration contract tests provided early confidence**: 4 migration-contract tests verified the SQL structure before any service-layer tests ran. This top-down validation order meant issues were caught at the right layer (schema first, service second, runtime third).
- **Full test suite (1185 tests) as a regression gate worked cleanly**: 0 failures across a broad surface that covers all prior phases. The size of the suite provides meaningful confidence for a cross-cutting schema change.
- **Explicit file allowlist for `git add` prevented dev-artifact pollution**: DevOps used an allowlist rather than `git add -A`, avoiding staging of PWA build artifacts and other worktree noise.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **Service-layer migration did not include UI runtime audit by default**: The implementer migrated services correctly but did not sweep UI component files for direct DB queries. This is a structural gap: schema-drop migrations affect *all* query sites, not just the service abstraction layer. The gap required an extra code-review cycle with a REJECTED verdict before a re-review APPROVED.
  - **Root cause**: The implementer's checklist covered service-layer files but not direct client component database calls.
  - **Impact**: One additional handoff loop (implementer ↔ code reviewer twice instead of once).

- **Badge test failures during implementation were caused by mock order sensitivity**: The query chain order (filter → order) in `badges.ts` had to match exactly how Vitest's chained mock resolves. This is a test infrastructure fragility, not a code correctness issue. It required debug time to identify, as the failure message was non-obvious.

### Agent Collaboration Gaps

- **The implementer's TDD table did not cover UI runtime paths**: The TDD compliance table in the implementation doc covered service functions but not the 5 UI components that also query the database. If the table had flagged these as "requires test" up front, the residue gap might have been caught before code review rather than during it.

- **"No active users" context compresses timelines but can create false confidence**: The worktree session moved very quickly because breaking changes were acceptable. This is correct for the current project state, but the speed should not erode the discipline of the residue sweep. The gap was caught, but only because the code reviewer applied the sweep systematically.

### Quality Gate Observations

- **Build gate cannot be fully verified locally (DF-4 exception)**: The local worktree lacks `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so `npm run build` exits non-zero during page data collection. PWA compilation is verified, but full build confirmation requires CI. This is a known project constraint, but it means the build gate is split: local (partial) + CI (full). There is no process gate to confirm CI passed before marking the release complete.

- **Deployment-environment schema verification is permanently deferred**: Migration `006` must be applied to Supabase before production promotion, but there is no mechanism in the current workflow to verify this happened. It appears as a "Known Limitation" in every Phase 3 document but is not tracked as an open action.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 8 distinct changelog entries across planning + implementation + code-review + QA + UAT + DevOps  
**Handoff Chain**: planner → implementer → code-reviewer → **[REJECTED]** → implementer → code-reviewer → qa → uat → devops

| From | To | Artifact | What Requested | Issues |
| --- | --- | --- | --- | --- |
| planner | implementer | Plan 114 Phase 3 section | Implement F-2 + F-4 | None at handoff |
| implementer | code-reviewer | implementation doc | Review quality before QA | No runtime UI audit |
| code-reviewer | implementer | code-review REJECTED | Fix stale runtime bookmark refs | HIGH: 5 UI files query dropped columns |
| implementer | code-reviewer | updated implementation | Re-review after remediation | Regression guardrail added |
| code-reviewer | qa | code-review APPROVED | Execute test strategy | Zero blocking findings |
| qa | uat | qa report | Validate value delivery | DF-4 build exception noted |
| uat | devops | uat report | Release execution | Migration pre-deploy gate noted |
| devops | — | deployment doc + tag | Stage 1 commit + Stage 2 push | Vite vulns pre-existing (not new) |

**Handoff Quality Assessment**:
- Were handoffs clear and complete? **Mostly yes.** The REJECTED→remediate loop was necessary and correctly executed. The initial implementer → code-reviewer handoff was slightly under-scoped (missing UI audit assertion), but the code reviewer caught it.
- Was context preserved across handoffs? **Yes.** The plan's acceptance criteria were referenced consistently across all downstream artifacts.
- Were unnecessary handoffs made? **No.** The extra code-review round-trip was justified; the HIGH finding was real and release-blocking.

### Issues and Blockers

| Issue | Artifact | Resolution | Escalated? | Time to Resolve |
| --- | --- | --- | --- | --- |
| 5 UI files querying dropped bookmark columns | code-review | Implementer migrated all 5 files + added regression test | No | ~30 min |
| Badge service test failures (query chain order) | implementation | Reordered filter→order in badges.ts; updated test mocks | No | ~20 min |
| Badge server fixture mismatch (entity_id vs provider_id) | implementation | Updated fixture to include typed FK fields + legacy mapping | No | ~10 min |
| Build gate (DF-4): missing Supabase anon key locally | QA/DevOps | PWA compilation verified; full build deferred to CI | No | Deferred |
| Migration deployment verification | DevOps | Captured as known limitation; no open action created | No | Deferred indefinitely |
| Pre-existing Vite HIGH vulns (npm audit) | DevOps | Confirmed pre-existing via origin/main package-lock check | No | ~5 min |

**Issue Pattern Analysis**:
- Most common issue type: **Schema-drop residue in non-service query sites** (runtime UI components querying DB directly)
- Were issues escalated appropriately? **Yes** — no issue required user escalation; all resolved within the agent pipeline
- Did early issues predict later problems? **Yes** — the badge test fixture mismatch during implementation was the same category as the runtime UI gap caught in code review: code touching a schema boundary did not fully audit all callers of that schema

### Changes to Output Files

| Artifact | Initial Version | Updates | Reason |
| --- | --- | --- | --- |
| implementation doc | Created | 1 update (code-review remediations) | Expected: code-review cycle-back |
| code-review doc | Created (REJECTED) | Replaced with re-review (APPROVED) | 1 necessary cycle-back for HIGH finding |
| qa report | Created with test strategy | Updated with execution evidence + verdict | Normal QA execution flow |
| uat report | Created | None after creation | Clean first pass |
| deployment doc | Created | Updated statuses (Committed → Released) | Normal lifecycle progression |
| plan doc | Existing | 2 changelog entries (QA, DevOps) | Consistent with plan update discipline |

---

## Process Improvements

### PI-1: Extend Implementation's Schema-Drop Audit to Runtime UI Files

**Finding**: Implementer migrated service-layer files correctly but did not sweep UI component files that query the database directly. This required an extra code-review cycle.

**Recommendation**: When a migration **drops columns**, the implementer's self-check should explicitly include:
1. `grep -r '<dropped_column>' src/app/ src/components/ src/hooks/` — not just `src/services/`
2. Any direct Supabase client calls in UI components must be audited alongside service-layer calls

**Where to codify**: `copilot-instructions.md` under "Deleted-Module/Residue Sweep" guidance; implementer instruction for any migration that drops columns.

**Priority**: HIGH — the same gap will recur on any future schema-drop migration (Phase 5 dual-PK consolidation will drop `id` columns from 6 tables; UI files will need the same audit).

---

### PI-2: Track Migration Deployment as a First-Class Open Action

**Finding**: "Migration must be applied to Supabase before production promotion" appeared as a Known Limitation in every artifact (implementation, QA, UAT, DevOps) but was never converted to a tracked open action. There is no artifact that confirms or denies whether migration 006 was applied.

**Recommendation**: When a release includes a required migration:
1. Create a named open action: `114-open-actions.md` with `OA-1: Apply migration 006 to production Supabase` (Owner: Operator/DevOps, Status: Open)
2. DevOps's post-release checklist should require either closure of this item or explicit deferral with justification

**Where to codify**: DevOps agent instructions — after releasing a migration-containing version, create an open-actions file if one does not exist.

**Priority**: MEDIUM — current project has no active users so the risk is low, but this pattern will matter as the project grows.

---

### PI-3: Badge Service Mock Fragility Signals Design Debt

**Finding**: The Supabase query-builder mock chain in tests is order-sensitive (`.filter().order()` vs `.order().filter()`), causing test failures when implementation changed the chain order. This is a sign that the mock architecture couples tests too tightly to implementation internals.

**Recommendation**: For service functions where query-chain order is implementation detail (not contract), consider:
1. Testing the *output* (returned data shape) rather than the *chain order* (method call sequence)
2. Using a typed mock factory that normalizes chain order rather than asserting exact `.eq()/.order()` call sequences

**Where to codify**: `testing-patterns` skill — add a note on mock-chain fragility for Supabase builder mocks.

**Priority**: LOW — did not block delivery; resolved within implementation; recurs as technical friction on future badge service changes.

---

### PI-4: TDD Coverage Table Should Include Direct-DB UI Components

**Finding**: The TDD compliance table in implementation docs lists service-layer functions but not UI components that call Supabase directly. This creates a coverage blind spot for schema-drop migrations.

**Recommendation**: When implementation modifies or drops schema elements, the TDD table should include a row for each UI file that queries those elements directly, even if the test is a static grep/scan (like `plan114-bookmark-typed-fk-runtime.test.ts`).

**Where to codify**: `copilot-instructions.md` under "Bugfix Handoff Completeness" — TDD table must cover all direct DB query sites, not only service-layer abstractions.

**Priority**: MEDIUM — directly caused the code-review REJECTED cycle.

---

## Technical Patterns (Secondary)

> These are technical notes, not process improvements. Recorded for future reference.

- **Service-layer abstraction with legacy field mapping** (`withLegacyFields`, `mapBadgeRowWithLegacyFields`) is the correct pattern for zero-downtime-compatible schema migration. Callers retain backward-compatible response shapes while canonical storage moves to new columns. This pattern should be the default for any future column-type migration.

- **Static file-scan regression tests** (grep-based, no runtime DB) are fast, reliable, and appropriate for guarding against schema residue reintroduction. They run in milliseconds, need no environment setup, and catch a whole class of bugs at commit time.

- **Migration contract tests** (TDD assertions on SQL file contents) provide confidence in the migration's structural intent before the migration is applied to any environment. This is especially valuable when worktree sessions lack DB access.

- **Mutual exclusion CHECK** (`num_nonnulls(provider_id, community_service_id) = 1`) is the correct Postgres pattern for typed polymorphic FK replacement. Simpler and more maintainable than triggers.

---

## Recommendations for Next Actions

1. **Codify PI-1** in copilot-instructions.md before Phase 5 (dual-PK consolidation), which will drop `id` columns from 6 tables and trigger the same residue-sweep requirement across a much larger surface.

2. **Create 114-open-actions.md** for migration 006 deployment tracking (PI-2): Owner = Operator, Action = apply migration to production Supabase, Status = Open until confirmed.

3. **Review pre-existing Vite HIGH vulnerabilities** (`npm audit fix --force` was flagged as available): This is pre-existing technical debt on `origin/main`. A dedicated security patch sprint (Plan 037 precedent) may be warranted before production traffic grows.

---

## Next Steps

→ **ProcessImprovement agent** to codify PI-1 and PI-4 into agent instructions  
→ **Operator** to apply migration 006 to Supabase production before promoting v0.11.5  
→ **Phase 4 (Semantic Constraints)** is already in progress in worktree `S114p4-semantic-constraints`
