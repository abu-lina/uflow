---
ID: 119
Origin: 119
UUID: b7c3e2f1
Status: Processed
---

# Retrospective 119: Category Filter Shows Wrong Section Categories

**Plan Reference**: `agent-output/planning/closed/119-category-filter-section-mismatch-plan.md`
**Date**: 2026-05-02T07:15Z
**Retrospective Facilitator**: retrospective

---

## Summary

**Value Statement**: As a user browsing the UFlow Food section, I want to see only categories that are relevant to the Food section, so that I can trust the platform's category accuracy and navigate efficiently to the services I need.
**Value Delivered**: YES
**Implementation Duration**: ~7h (2026-05-02T00:00Z plan created → 2026-05-02T07:00Z DF-1 confirmed and closed)
**Overall Assessment**: Compact standalone bugfix that exposed a systemic schema vocabulary drift between the app layer (`store`) and the DB layer (`business`). Code review correctly rejected the first implementation for using the wrong canonical value — a HIGH finding that would have shipped silent breakage to provider edit flows. The remediation pattern (shared constant + backward-compatible scope) is broadly applicable. DevOps required non-trivial selective staging due to a concurrent in-progress plan (Plan 115) occupying the working tree. One migration error (`min(uuid)`) caught and fixed before PROD application. All deferred items fully resolved by end of session.
**Focus**: Emphasises repeatable process improvements over one-off technical details.

---

## Timeline Analysis

| Phase | Planned Duration | Actual Duration | Variance | Notes |
| --- | --- | --- | --- | --- |
| Planning | Not estimated | ~46min (T00:00Z → T00:46Z) | — | Single-pass; no critique required (abbreviated pipeline) |
| Implementation (round 1) | Not estimated | ~46min (T00:00Z → T00:46Z) | — | Initial implementation included vocabulary error |
| Code Review (round 1) | Not estimated | ~19min → REJECTED | Rejection loop added ~30min | HIGH: store/business vocab drift; MEDIUM: name-targeted migration |
| Implementation (round 2, remediation) | Not estimated | ~19min (T00:46Z → T01:05Z) | — | Shared constant + uniqueness-safe migration guard |
| Code Review (round 2) | Not estimated | ~5min → APPROVED | — | All findings resolved; no new issues |
| QA | Not estimated | ~15min (T01:05Z → T01:20Z) | — | All automated gates pass; browser validation deferred to UAT |
| UAT | Not estimated | ~5min (T01:20Z → T01:25Z) | — | Value validated; DF-1 deferred with 48h window |
| DevOps Stage 1 | Not estimated | ~19min (T01:25Z → T01:44Z) | — | Non-trivial selective staging; Plan 115 coexisted in working tree |
| DevOps Stage 2 | Not estimated | ~6min (T01:44Z → T01:50Z) | — | Migration error caught in dry-run; fixed before PROD application |
| DF-1 Closure | Not estimated | ~5h10min (T01:50Z → T07:00Z) | Deferred to user session | Browser confirmation via screenshot; doc closure committed |
| **Total (pipeline)** | — | **~7h end-to-end** | — | Includes DF-1 async window |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Abbreviated pipeline appropriate for scope**: The Planner correctly classified this as a standalone bugfix eligible for the abbreviated pipeline (no Analyst, no Critic). The plan was created, reviewed, and handed to implementation in a single pass with no multi-agent debate over scope.

- **Decision Record resolved blockers before implementation**: All six decisions (D1–D6) were marked RESOLVED in the plan. Critically, D2 (section type mapping: `store` → `business`) was explicitly documented. The implementer used the wrong canonical direction, but the decision record provided unambiguous reference for the code reviewer to call out the error.

- **Value statement held as the anchor**: UAT validated delivery against the original user story. The DF-1 deferred item was structured with a specific trigger condition and evidence requirement, which allowed clean closure once the user provided the screenshot. No ambiguity about what "done" looked like.

- **Dead code removal included in scope**: D5 (delete `CategoryFilter.tsx`) was included in the plan and executed cleanly. Code reviewer ran the deleted-module residue sweep and found zero stale references. Removing dead code during a related bugfix is efficient and reduces future confusion.

### Agent Collaboration Patterns

- **Code review caught a real production risk**: The initial implementation used `business` (legacy DB enum value) instead of `store` (canonical app value) in the guardrail filter. This HIGH finding was correctly identified and resulted in REJECTED verdict. Had it shipped, provider edit flows accessing `store`-section categories would have silently missed results unless the backward-compat scope was also present. The two-round cycle added ~30 minutes but prevented a silent regression.

- **Shared constant as the remediation pattern**: Instead of patching each file individually, the implementer created `PROVIDER_CATEGORY_SECTION_SCOPES` as an exported constant used by both the service layer and both provider edit pages. This transformed a per-file fix into a structural improvement. Code review Round 2 validated all three callsites.

- **Migration idempotence guard worked**: The `remaining_mismatches=0` result after PROD migration application confirmed the uniqueness-safe DO block executed correctly. The migration didn't error on an already-correct category — critical for confidence in re-runnable migrations.

- **DF-1 structured as a real closure condition**: Rather than marking browser validation as "done" without evidence, DF-1 was structured with a named trigger ("within 48h of migration"), a specific visual criterion ("Gesundheit & Sport absent from Food section"), and a named owner. This made closure unambiguous when the user provided the screenshot.

### Quality Gates

- **1203 tests with zero failures**: The test suite held. Four new TDD RED→GREEN regressions specifically target the guardrail and compatibility scope paths that are the root cause of the bug. Future regressions to this path will be caught automatically.

- **Type system validated the schema alignment**: The `Category.applicable_section` union update to include `'store'` was verified by `npm run type-check`. TypeScript compilation serves as a lightweight schema-to-code alignment check at no runtime cost.

- **Migration verified idempotent before PROD**: The `min(uuid)` error was caught during the dry-run phase (not in PROD). The fix — removing the `min()` aggregate from a non-aggregate query — was straightforward once identified.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **Code review rejection loop added latency**: The HIGH finding (store/business vocabulary drift) was a gap in the implementer's schema knowledge, not a logical error. The information needed to avoid this was present in the plan (D2: "DB CHECK constraint uses `'business'`, app uses `'store'`. Mapping is required at query time.") but the implementer implemented in the wrong direction. A pre-implementation schema verification step (checking the live CHECK constraint before writing the filter) would have avoided the loop entirely.

- **Concurrent working tree (Plan 115) complicated staging**: Plan 115's staged and unstaged changes coexisted with Plan 119's changes across the same files (`CHANGELOG.md`, config files). `git stash --staged` failed due to merge-mode conflict on `.next-id`. Resolution required: `git reset HEAD` on Plan 115 files, temporary removal of Plan 115's CHANGELOG block from the working tree, selective staging of Plan 119's hunk, then restoration of Plan 115's block. This is a fiddly, error-prone procedure that consumed ~19 minutes of DevOps time.

- **Migration `min(uuid)` error not caught before DevOps**: The migration used `min(category_id)` in a SELECT — an invalid expression for a UUID column — that wasn't caught during implementation or QA because migrations aren't run as part of `npm test`. It surfaced only during DevOps dry-run. This pattern (SQL logical errors in migrations not caught until staging) is a recurring latency source.

### Agent Collaboration Gaps

- **Implementer did not verify live schema before writing guardrail**: The plan explicitly documented the `store` → `business` mapping requirement. The implementer wrote `business` in the filter instead of checking the live Supabase schema or testing against the CHECK constraint. A habit of running a quick schema check (`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'listing_type_enum'::regtype`) before writing schema-dependent code would catch this class of error.

- **Migration SQL review during implementation, not at DevOps**: No agent explicitly reviewed the migration SQL for correctness before the DevOps phase. The implementer wrote the `min(uuid)` SELECT, code review validated the guard structure but didn't spot the type-invalid aggregate, and QA can't catch SQL execution errors without running the migration. A dedicated migration SQL checklist step during code review would close this gap.

### Quality Gate Failures

- **No migration execution gate in CI**: `npm test` + `npm run build` do not run migrations against a test database. SQL syntax and type-correctness errors (like `min(uuid)`) reach DevOps undetected. This is an infrastructure gap; not a process failure per se, but it creates a systemic blind spot.

- **Browser-interactive validation could not be part of QA**: DF-1 required a live environment with migration applied. Since QA runs against mocks/fixtures, the visual section-tab verification was deferred. The deferred item was well-structured (named, triggered, evidenced) but added a ~5h async window before full closure. For future bugs where visual confirmation is the primary acceptance criterion, plan for UAT to include the live environment test directly.

### Misalignment Patterns

- **DB-layer vocabulary not reflected in implementation constants**: The `store`/`business` divergence (app vocab vs. DB enum vocab) is a broader pattern. The type system has `listing_type_enum` with `food`, `store`, `ummah` but the DB CHECK constraint on `applicable_section` uses `business`. This divergence is a latent source of future bugs. The shared constant (`PROVIDER_CATEGORY_SECTION_SCOPES`) is a mitigation; a canonical mapping definition in the types layer would be a more durable fix.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 9 (Planner → Implementer → Code Reviewer → Implementer → Code Reviewer → QA → UAT → DevOps → DevOps)
**Handoff Chain**: `planner → implementer → code-reviewer (REJECT) → implementer (remediation) → code-reviewer (APPROVE) → qa → uat → devops stage 1 → devops stage 2 → user (DF-1 confirmation)`

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
| --- | --- | --- | --- | --- |
| Planner | Implementer | Plan 119 | Implement 5 milestones (guardrail, type fix, migration, dead code removal, edit page consistency) | None at handoff |
| Implementer | Code Reviewer | Implementation doc | Review implementation quality | HIGH: store/business vocab drift; MEDIUM: name-targeted migration |
| Code Reviewer | Implementer | Code review (REJECTED) | Remediate HIGH + MEDIUM findings | — |
| Implementer | Code Reviewer | Implementation doc (updated) | Re-review remediation | All findings resolved; INFO: plan wording drift (non-blocking) |
| Code Reviewer | QA | Code review (APPROVED) | Execute test strategy | None |
| QA | UAT | QA report | Validate value delivery | DF-1 deferred (browser validation requires live env) |
| UAT | DevOps | UAT report (APPROVED) | Release v0.12.1 | Plan 115 working tree coexists; selective staging required |
| DevOps | DevOps | Stage 1 doc | Stage 2 (push, tag, migrate) | Migration `min(uuid)` error caught in dry-run |
| User | — | Screenshot | DF-1 browser confirmation | None; DF-1 closed |

**Handoff Quality Assessment**:
- Were handoffs clear and complete? **Yes** — each artifact had a clear status and explicit next-step.
- Was context preserved across handoffs? **Yes** — memory retrieval at each phase recovered prior decisions.
- Were unnecessary handoffs made? **One** — the code-review rejection added a round-trip. The round-trip was correct (it caught a real error), but preventable with a pre-implementation schema check.

### Issues and Blockers Documented

**Total Issues Tracked**: 5

| Issue | Artifact | Resolution | Escalated? | Time to Resolve |
| --- | --- | --- | --- | --- |
| HIGH: store/business vocab drift in guardrail filter | Code review | Shared constant + backward-compat read scope | No | ~19min (remediation) |
| MEDIUM: migration targeting by mutable display name | Code review | Uniqueness-safe DO block with count guard | No | ~19min (remediation) |
| Plan 115 concurrent working tree (staging conflict) | Deployment Stage 1 | git reset HEAD + temp CHANGELOG edit + selective add | No | ~19min |
| Migration `min(uuid)` type error | Deployment Stage 2 (dry-run) | Removed aggregate; used name directly in guarded DO block | No | ~5min |
| DF-1 browser validation (deferred) | UAT → DF-1 | User screenshot confirming Food section correct | No | ~5h async window |

**Issue Pattern Analysis**:
- Most common issue type: **Schema knowledge gap** (store vs. business vocab; min(uuid) type error). Two of five issues stem from implementer/reviewer not verifying live schema constraints before writing SQL.
- Were issues escalated appropriately? **Yes** — all issues were self-resolved within the pipeline.
- Did early issues predict later problems? **Partially** — both the vocab drift and the `min(uuid)` error share a root cause (SQL written without schema verification). Fixing the process (schema check first) addresses both.

---

## Technical Patterns (Secondary)

> Documented as secondary patterns for future reference.

### `store`/`business` Vocabulary Mapping

The application layer uses `store` as the canonical section identifier. The DB `applicable_section` CHECK constraint includes `business` as a legacy value alongside `store`. Any code filtering by section must include both `store` and `business` in the scope when querying Postgres. The shared constant `PROVIDER_CATEGORY_SECTION_SCOPES` (exported from `src/services/categories.ts`) is the authoritative reference for this scope set.

**Pattern**: When adding a new section filter anywhere in the codebase, import `PROVIDER_CATEGORY_SECTION_SCOPES` rather than hardcoding the value list.

### Uniqueness-Safe Migration Guard

When a migration must update a row targeted by a mutable display name, the safe pattern is:
1. Check count of rows matching the display name: `SELECT count(*) FROM ... WHERE name_de = '...'`
2. Only proceed with update if `count = 1` (uniqueness confirmed)
3. Use `category_id` (UUID PK) for the actual update, not the display name

This prevents nondeterministic updates when display names are not unique constraints.

### Selective Git Staging with Concurrent In-Progress Plans

When two plans' changes coexist in the working tree:
1. `git stash --staged` fails if both plans have modified the same file (merge-mode conflict on `.next-id`)
2. Safe procedure: `git reset HEAD <plan-B files>` to unstage Plan B, temporarily remove Plan B's CHANGELOG block from the working tree, stage Plan A's files, restore Plan B's CHANGELOG block
3. Never use `git checkout -- <file>` to "clean up" — it discards Plan B's work

**Recommendation**: When possible, complete and commit one plan before starting another plan's implementation. If that's not feasible, ensure Plan B work is on a separate branch before Plan A reaches DevOps.

---

## Lessons Learned

### Process Improvements (Prioritised)

#### P1 — Pre-Implementation Schema Verification Habit (HIGH IMPACT)

**Finding**: The code review rejection loop and the `min(uuid)` migration error both stem from the same root: schema-dependent code written without checking the live schema first.

**Recommendation**: Implementers working on any task involving Postgres schema values (enums, CHECK constraints, column types) should run a schema verification query before writing filters or migrations:

```sql
-- Check CHECK constraint values
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE 'applicable_section%';

-- Check enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'listing_type_enum'::regtype ORDER BY enumsortorder;

-- Check column type
SELECT data_type FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'applicable_section';
```

This is a 30-second check that prevents a 30-minute rejection loop.

#### P2 — Migration SQL Review Checklist in Code Review (MEDIUM IMPACT)

**Finding**: The `min(uuid)` error was not caught during code review because no explicit SQL correctness check was performed. The error surfaced at DevOps dry-run.

**Recommendation**: Add a migration SQL review step to the code review checklist:
- Does the SELECT include aggregates (`min`, `max`, `count`) applied to UUID or text columns? If so, is the aggregate valid for that type?
- Are targeted rows selected by mutable display names? If so, is a uniqueness guard present?
- Is the migration idempotent? (i.e., does it produce the same result if run twice?)

#### P3 — Plan Separately When Multiple Plans Are In-Flight (MEDIUM IMPACT)

**Finding**: Plan 115's concurrent in-progress state added ~19 minutes to DevOps Stage 1 and introduced selective staging risk (potential to accidentally include Plan 115 changes in the Plan 119 commit).

**Recommendation**: Before starting DevOps for any plan, check working tree state (`git status`). If another plan's changes are staged or modified, either:
(a) Complete and commit the other plan first, or
(b) Move the other plan's work to a named branch (`git checkout -b plan-115-wip`, cherry-pick its changes, return to main for Plan 119 DevOps)

Selective CHANGELOG staging by temporary file editing is valid but should be explicitly documented in the Stage 1 changelog entry (which it was for Plan 119 — this is good practice to retain).

#### P4 — Structure DF Items with Explicit Evidence Criteria (LOW IMPACT — ALREADY DOING)

**Finding**: DF-1 was structured with named trigger, owner, 48h window, and specific visual criterion. This made closure clean when the screenshot arrived.

**Recommendation**: Retain this pattern. Every deferred follow-up should specify: (1) who owns it, (2) what triggers it, (3) exactly what evidence closes it. "Screenshot showing X absent from Y section" is specific enough to be unambiguous.

---

## Successes Worth Repeating

1. **Two-round CR cycle with clear finding descriptions**: Each HIGH/MEDIUM finding included a root cause and a recommendation. The implementer could execute remediation without re-opening dialogue. Retain this format.

2. **Shared constant as remediation output**: The PR/commit for a vocabulary drift bug should always produce a shared constant, not per-file patches. This scales better as the codebase grows.

3. **Abbreviated pipeline for standalone bugfixes**: Plan 119 went from zero to released in ~7h. The abbreviated pipeline (no Analyst, no Critic) was appropriate for a well-understood bug with clear acceptance criteria. Future standalone bugfixes of similar scope should use the same abbreviated routing.

4. **`remaining_mismatches=0` as migration verification**: Verifying data remediation with a count query after migration is a clean, repeatable pattern. Any migration that remediates data should include a verification query in the Stage 2 evidence record.

---

## Recommended Next Actions

| Priority | Action | Owner | Horizon |
| --- | --- | --- | --- |
| HIGH | Implementer habit: run schema verification queries before writing SQL filters or migrations | Implementer instruction / process | Immediately |
| MEDIUM | Add migration SQL review checklist to code-review standards | Code Reviewer instruction | Next CR cycle |
| MEDIUM | Check working tree before DevOps; resolve concurrent in-progress plans before staging | DevOps instruction | Before Plan 115 DevOps |
| LOW | Consider canonical vocabulary mapping type in `src/types/` for `store`/`business` DB divergence | Planner/Architect | Next schema review |

---

## Sign-Off

| Role | Status | Notes |
| --- | --- | --- |
| Retrospective | ✅ Complete | All lessons captured; process improvements documented |
| Process Improvement | Pending | Extract P1–P3 as formal instruction updates |
