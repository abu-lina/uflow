---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Active
---

# Retrospective 114: Database Schema Staged Refactor — Phase 5 (Dual-PK Consolidation)

**Plan Reference**: `agent-output/planning/closed/114-db-schema-staged-refactor-plan.md`
**Date**: 2026-04-30
**Retrospective Facilitator**: retrospective

---

## Summary

**Value Statement**: Eliminate the dual-PK anti-pattern (F-1) on 4 tables (`categories`, `users`, `community_services`, `providers`) by promoting `<entity>_id` as the sole PRIMARY KEY and dropping the vestigial `id` column.

**Value Delivered**: YES

**Implementation Duration**: ~12 hours from Phase 5 implementation start (`2026-04-30T00:00Z`) to PROD schema verified (`2026-04-30`, afternoon). The broader Plan 114 pipeline (all phases) spanned approximately 2 calendar days (2026-04-29 → 2026-04-30).

**Overall Assessment**: Phase 5 delivered its objective cleanly — zero dual-PK tables remain, admin authorization is fixed, and both DEV and PROD environments are verified. The pipeline surfaced two quality issues (Code Review REJECTION and post-release CI failure) that are both worth capturing as systemic improvements. The release cadence was high-velocity: full pipeline in a single session day.

**Focus**: Repeatable process improvements for migration-heavy schema refactor pipelines.

---

## Timeline Analysis (Phase 5 Only)

| Phase | Planned Duration | Actual Duration | Notes |
|-------|-----------------|-----------------|-------|
| Implementation | ~4h (estimated from plan) | ~10h (`00:00Z` → `10:05Z` CR approved) | Extended by Code Review rejection cycle — one return loop to Implementer |
| Code Review | ~1h | ~2h (two passes: rejection + re-review) | REJECTION on first pass — 2 HIGH findings required Implementer rework |
| QA | ~2h | ~45 min (`10:35Z` → `11:20Z`) | Efficient — C-3 and C-5 gates well-scoped; dev apply was prepared in advance |
| UAT | ~1h | ~10 min (`11:20Z` → `11:30Z`) | Straightforward — QA evidence was complete and well-organized |
| DevOps Stage 1+2 | ~1h | ~1h (`11:45Z` onward) | On-plan; CI failure discovered post-merge (handled as fix commit) |
| PROD Migration | Not planned (assumed CI) | ~30 min (manual MCP apply) | Gap: CI does not run `supabase db push`; manual step not pre-documented |
| **Total** | ~9h | ~12h | +3h from Code Review rejection cycle and CI failure remediation |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Code Reviewer caught HIGH bugs before QA/UAT/PROD**: Both HIGH findings (FK dependency violation in migration cutover sequencing; admin badge endpoints querying non-existent `raw_user_meta_data`) were caught at code review rather than at runtime. The Code Review REJECTION worked as designed — it stopped a deployment that would have introduced FK violations and broken admin authorization.
- **Systematic grep audit before migration authoring**: The Implementer searched `src/` for all stale `.select('id')` and `.eq('id', ...)` patterns before writing migrations. Found 8 source files, 11 individual edits. This prevented query-layer breakage post-migration.
- **Phase-by-phase independent releases**: Each phase (0′, 1, 2, 3, 4, 5) shipped as its own patch tag. Failures in one phase could not contaminate prior releases. QA and UAT gates were kept narrow and phase-specific.
- **Baseline inspection before migration authoring**: Implementer verified `offers` and `needs` tables were already consolidated in the baseline — avoiding unnecessary migrations for tables that didn't need them. Saved work and reduced risk.
- **MCP tools enabled direct PROD verification**: Without CLI access to PROD, MCP `apply_migration` and `execute_sql` tools allowed applying and verifying all 4 migrations without needing a separate access mechanism. Schema was confirmed clean in the same session.

### Agent Collaboration Patterns

- **Architect (ADR-114) early intervention**: The Architect's finding that the three environments had zero shared migration lineage (F-11) triggered a major plan restructure before any implementation. Inserting Phase 0′ (Migration Baseline Squash) as a prerequisite prevented catastrophic cross-environment drift that would have made later phases fragile.
- **Critic → Planner iterations**: The plan went through 3 critique rounds (initial approval, post-revision, post-ADR restructure). Each round refined specific gaps (barakah_effects drop, enum ordering, parity verification criteria) and the plan was materially stronger for it.
- **QA C-3/C-5 gate design**: QA pre-defined specific test gates for the migration-heavy work (per-table smoke tests, auth bridge verification) before execution. This made the testing phase fast and unambiguous.

### Quality Gates

- **Code Review REJECTION saved runtime regressions**: Specifically, the FK-safe PK cutover fix (preserving UNIQUE constraints during PK promotion) would have caused constraint violation failures if migrations had been applied to DEV without the fix.
- **UAT confirmed value delivery independently**: UAT reviewed QA evidence and plan objectives separately, confirming not just that tests passed but that the anti-pattern was genuinely eliminated.
- **PROD schema verification as final gate**: Executing a SQL verification query on PROD after migration apply (confirming `id_exists = 0` on all 4 tables) provided a reproducible, environment-level evidence record.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **Code Review REJECTION extended implementation by ~4 hours**: Both HIGH findings (FK cutover sequencing, admin badge auth) represent cases where the Implementer made assumptions that were not caught during implementation self-review. The Code Reviewer performed its role correctly; the gap is that these issues were discoverable earlier — the FK cutover pattern specifically is a known migration anti-pattern.
  
- **CI failure discovered post-release**: The `Run Tests` CI job failed after the PR was merged (`ENOENT: 006_phase4_semantic_constraints.sql`). The root cause was that two test files hardcoded the migration filename as a literal string, and the file was renamed during QA (`006_` → `0061_`) to resolve a naming collision. The fix was a 2-file test patch (`a5060361`), but it required an extra post-merge commit that was not clean.

- **Migration naming collision surfaced late**: Two migrations were assigned the `006_` prefix: `006_phase3_referential_integrity.sql` (existing) and `006_phase4_semantic_constraints.sql` (new). This was not caught until QA attempted `supabase db push --include-all`, at which point the collision forced a mid-QA rename and a downstream test file fix.

- **Manual PROD migration apply was unplanned**: The CI/CD pipeline (GitHub Actions) deploys the app via Docker build → Hetzner SSH, but does NOT run `supabase db push`. PROD migrations must be applied manually. This was not documented as a release step and was discovered during the post-Stage-2 conversation. The DevOps deployment doc and open-actions tracker were updated post-factum.

### Agent Collaboration Gaps

- **Implementer did not verify the FK-safe PK cutover pattern independently**: The cutover sequencing issue (HIGH-1) is a class of error well-documented in Postgres migration patterns. The Implementer should have applied a "check inbound FKs before dropping UNIQUE constraints" heuristic without needing the Code Reviewer to catch it. This is a knowledge gap in implementation standards for migration-heavy work.

- **Test file → migration filename coupling not caught by Code Reviewer on first pass**: The Code Reviewer's first pass reviewed the migrations and application code but did not inspect whether existing test files referenced migration filenames as literal strings. After the Phase 4 migration rename, those test files became broken. Adding "check for hardcoded migration filename references in tests" to the migration checklist would prevent recurrence.

- **PROD migration procedure not pre-documented in DevOps workflow**: The DevOps agent executed Stage 1 and Stage 2 without a defined procedure for applying migrations to PROD. The manual MCP tool application worked, but was reactive rather than planned. A migration runbook section in the DevOps instructions would make this a first-class step rather than an afterthought.

### Quality Gate Failures

- **EXPLAIN ANALYZE benchmarks not captured**: Both pre- and post-migration EXPLAIN ANALYZE outputs were deferred. The plan required these benchmarks; they remain Open in the tracker. This is a measurement gap — we have no performance baseline for the 4 affected tables post-Phase-5.

- **Local migration replay blocked (pre-existing)**: `supabase db reset --local` fails at migration 005 (`cannot change return type of existing function`). This means local full-chain replay is unavailable, reducing confidence in migration ordering and local dev experience. Tracked as DF-2 — not Phase 5's fault, but compounded by Phase 5 adding more migrations on top of a broken replay chain.

### Misalignment Patterns

- **Environment mapping gap**: Neither the DevOps doc nor the plan recorded which Supabase project ref maps to which environment. The question "which env was just migrated?" arose after PROD migrations were applied — requiring explicit user clarification. For a two-project setup, this mapping should be in a repo-level reference file.

- **Plan changelog timestamp anomaly**: The plan changelog records ADR-114 Architect timestamps as `2026-04-29T09:10Z` and `2026-04-29T09:20Z`, which appear earlier than entries timestamped `2026-04-29T22:00Z` and `2026-04-29T23:00Z` in the same changelog. Likely the Architect entries are from `2026-04-30` (the following day) with the wrong date. The causal order is preserved by logical reading, but the timestamps are inconsistent and will confuse future retrospective readers.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs (Phase 5)**: 6 substantive handoffs (Impl → CR, CR → Impl [rejected], Impl → CR [re-review], CR → QA, QA → UAT, UAT → DevOps)

**Handoff Chain**: `Orchestrator → Implementer → Code Reviewer → Implementer (rejected) → Code Reviewer (re-review) → QA → UAT → DevOps (Stage 1+2) → Retrospective`

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
|------------|----------|----------|----------------|-------------------|
| Orchestrator | Implementer | Implementation doc | Execute Phase 5 end-to-end | None at handoff |
| Implementer | Code Reviewer | Code Review doc | Review quality before QA | 2 HIGH findings → REJECTED |
| Code Reviewer | Implementer | Code Review doc (rejection) | Resolve HIGH-1 and HIGH-2 | FK cutover sequencing, badge auth bug |
| Implementer | Code Reviewer | Code Review doc (re-review) | Validate fixes | APPROVED_WITH_COMMENTS |
| Code Reviewer | QA | QA doc | Execute testing gates C-3, C-5 | LOW: migration 005 replay blocker (pre-existing) |
| QA | UAT | UAT doc | Validate value delivery | None — clean handoff |
| UAT | DevOps | Deployment doc | Stage 1 + Stage 2 | Post-release: CI failure (filename); PROD migration manual apply gap |
| DevOps | Retrospective | This doc | Capture lessons learned | — |

**Handoff Quality Assessment**:
- Handoffs were generally clear. The rejection handoff from Code Reviewer back to Implementer included specific HIGH finding descriptions and resolution criteria.
- Context was preserved across handoffs — each artifact referenced upstream artifacts explicitly.
- One unnecessary handoff pattern emerged: the Code Review rejection required a full Implementer loop that added ~4h. This is not inherently an unnecessary handoff — it is the correct behavior — but it highlights the value of implementation self-review checklists for migration work.

### Issues and Blockers Documented

**Total Issues Tracked**: 5 named issues across the pipeline

| Issue | Artifact | Resolution | Time to Resolve |
|-------|----------|------------|-----------------|
| HIGH-1: FK-safe PK cutover sequencing | Code Review | Fixed by Implementer; re-reviewed | ~4h (Impl return cycle) |
| HIGH-2: Badge endpoints using non-existent `raw_user_meta_data` | Code Review | Fixed by Implementer; re-reviewed | ~4h (same cycle) |
| Migration naming collision (`006_` prefix) | QA | Renamed Phase 4 file to `0061_` | ~15 min (mid-QA) |
| CI failure (hardcoded filename in tests) | Post-Stage-2 | Fix commit `a5060361` patching 2 test files | ~30 min (post-merge) |
| PROD migration apply procedure undefined | Post-Stage-2 | Applied via MCP tools; documented in deployment doc | ~30 min (same session) |

**Issue Pattern Analysis**:
- Most common issue type: **migration operation gaps** — issues related to how migrations are named, applied, tested, and deployed rather than logic bugs in application code.
- Issues were escalated appropriately (Code Review rejection is a correct gate, not an over-escalation).
- The CI failure and migration naming collision were both **late discoveries** — they surfaced after code was considered "done". Both were preventable with earlier checks.

---

## Lessons Learned

### What to Carry Forward

1. **FK-safe migration pattern should be in the implementation checklist**: Before any migration that promotes a column to PK or changes constraint structure, the Implementer should enumerate inbound FKs and verify UNIQUE constraints are preserved during the cutover. This is a standard Postgres migration pattern that should not require Code Review to enforce.

2. **Migration filename uniqueness check before QA push**: Before executing `supabase db push`, verify no two migrations share the same numeric prefix. A one-liner check: `ls supabase/migrations/*.sql | sed 's/_.*//' | sort | uniq -d` — any output is a collision.

3. **Test files should not hardcode migration filenames**: Test files that reference migration files should use glob patterns or `fs.readdirSync` to locate files by pattern rather than exact name. Exact-name references break silently on rename.

4. **PROD migration apply must be a named DevOps step**: The CI/CD pipeline does not auto-apply migrations. The Stage 2 deployment doc should include a "Migration Apply" section with the project ref, tool used (MCP or CLI), and verification SQL — not left as an implicit post-release task.

5. **EXPLAIN ANALYZE as required QA gate for schema-affecting migrations**: Deferring performance benchmarks makes it impossible to detect regressions introduced by the migration. At minimum, capture `EXPLAIN ANALYZE` for the most-queried endpoint per table (e.g., `search_providers`) before and after. This should be a C-gate, not a deferred DF item.

6. **Environment project ref mapping should be in a repo-level file**: A single `docs/architecture/ENVIRONMENTS.md` (or equivalent) recording which Supabase project ref maps to which environment eliminates confusion during deployment. Two facts: "DEV = qrekonfhaenjdnjhwdum" and "PROD = rdtdtcfntopcxcigkqoq" should not require user clarification mid-session.

7. **Plan changelog timestamps should be validated by DevOps**: The CHANGELOG date sanity-check step in DevOps Stage 1 checks the CHANGELOG.md file, but not the plan's own changelog section. A quick "do agent-assigned timestamps in the plan changelog look causally consistent?" check would catch the ADR-114 date anomaly before release.

### Secondary (Technical) Notes

- The FK-safe PK cutover strategy (keep UNIQUE constraint during PK promotion, never drop it first) is the correct Postgres pattern. It should be documented in `docs/guides/` or the implementer skill as a named pattern for future migration work.
- The `0061_` prefix was a workaround for a naming collision. The cleaner solution is a consistent 4-digit prefix convention (`0060_`, `0061_`, `0062_`...) enforced from migration creation time, not discovered at apply time.
- MCP `apply_migration` + `execute_sql` is a viable PROD migration mechanism and does not require Supabase CLI prod-linked access. This should be documented as the official PROD migration path in DevOps instructions.

---

## Process Improvement Recommendations

### Immediate (Apply to Next Migration-Heavy Plan)

| Recommendation | Category | Owner | Impact |
|----------------|----------|-------|--------|
| Add "FK-safe PK cutover" to Implementer migration checklist | Quality gate | Implementer instructions | Prevents Code Review rejection cycle for this class of migration |
| Add migration filename collision check to QA pre-push checklist | Quality gate | QA instructions | Prevents mid-QA rename + downstream test file breakage |
| Add "no hardcoded migration filenames in test files" to Code Review checklist | Code Review | Code Review skill/checklist | Prevents post-release CI failures from filename renames |
| Add "Migration Apply" as named DevOps Stage 2 step (PROD) | Workflow | DevOps instructions | Makes PROD migration explicit, documented, and reproducible |
| Add EXPLAIN ANALYZE as required C-gate (not deferred) for schema migrations | Quality gate | QA + Plan instructions | Provides performance baseline for schema-affecting releases |

### Near-Term (Within 2 Iterations)

| Recommendation | Category | Owner | Impact |
|----------------|----------|-------|--------|
| Create `docs/architecture/ENVIRONMENTS.md` with project ref mapping | Documentation | Anyone | Eliminates environment ambiguity during deployment |
| Adopt 4-digit migration prefix convention (`0001_`, `0002_`...) for all future migrations | Convention | Implementer + DevOps | Prevents naming collisions permanently |
| Add PROD migration runbook to DevOps instructions | Documentation | DevOps | First-class procedure instead of reactive workaround |

---

## Timeline Notes

All timestamps approximate unless explicitly marked with source. ADR-114 entries in plan changelog (`2026-04-29T09:10Z`, `2026-04-29T09:20Z`) appear to be `2026-04-30` events with incorrect date — causal order preserved, date anomaly noted but not corrected in source doc (ownership unclear).

---

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-30T00:00Z approx. | retrospective | Document created — Plan 114 Phase 5 retrospective |
