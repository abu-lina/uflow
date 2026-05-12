---
ID: 129
Origin: 129
UUID: c7e3a91f
Status: Active
---

# Retrospective: Plan 129 — `search_food_concepts` RPC Junction-Table Hotfix

**Date**: 2026-05-12
**Release**: v0.12.12
**Pipeline**: Analyst → Implementer → Code Reviewer → QA → DevOps
**Duration**: ~3h (same-day hotfix from detection to release)

---

## What Went Well

### 1. Hotfix pipeline was fast and correct end-to-end

The dedicated hotfix pipeline (no Planner/Architect step) worked exactly as designed for a P0 outage. Analyst → Implementer → Code Reviewer → QA → DevOps executed sequentially with clean handoffs and no rework. Total time from RCA to tag was a single session.

### 2. Root cause was L1-Proven immediately

The Analyst found the exact broken line (`001_baseline.sql:916`) and the exact causing migration (`006_phase3_referential_integrity.sql:323`) in a single pass. Direct code inspection was sufficient — no speculation required.

### 3. TDD contract test was the right tool for a migration hotfix

A migration file is pure SQL text. Testing its content with `readFileSync` + string assertions is simpler and more reliable than trying to test via a live database connection. The test correctly served as both a TDD gate (red/green) and a permanent regression guard (`not.toContain('p.offers_ids')`).

### 4. Additive migration strategy was the right call

Writing migration `089` as a new file rather than editing `001_baseline.sql` preserved the complete audit trail of how the schema evolved. The `DROP FUNCTION IF EXISTS` + `CREATE OR REPLACE` pattern made it safe to re-apply.

### 5. Scope isolation was confirmed early

The Analyst explicitly verified that `search_food_categories` and `search_food_menu_items` were unaffected. This prevented unnecessary scope creep and kept the hotfix surgical.

---

## What Could Be Improved

### 1. Migration drift window: SQL functions are lazily parsed

**Observation**: Postgres SQL functions are parsed at invocation time, not at `CREATE FUNCTION` time. This means a broken function can silently exist in the database for an indefinite period — it only fails when called. Migration 006 broke `search_food_concepts` in production but the error was undetectable until the endpoint was actually hit.

**Lesson**: Any migration that drops or renames a column should include a check: _"What SQL functions reference this column?"_

**Recommendation**: Add a pre-migration drift check step to the migration authoring guideline — e.g., grep `sql/` and `supabase/migrations/` for column names before dropping them.

### 2. The Stage 1 `git mv` did not capture the preceding `replace_string_in_file`

**Observation**: The `Status: Active → Committed` change on the implementation doc was applied to the working tree but the committed version in Stage 1 retained `Status: Active`. This left a trailing unstaged diff that was caught before push and fixed in the Stage 2 record amend.

**Root cause**: When `git mv` renames a tracked file, it stages the rename using the current index — if the `replace_string_in_file` was applied to the working tree but not yet staged separately, the index still held the old content. The `git add` after `git mv` only staged the new-path file, not the pending working-tree diff.

**Lesson**: When making a file-content change immediately followed by `git mv`, always `git add` the content change FIRST, then `git mv`. Or verify with `git diff --cached` before committing.

### 3. Lifecycle doc closures should be verified against `git diff --cached` before committing

**Observation**: Status fields were updated in a multi_replace batch, then files were moved. The batch operation and the move/add sequence should have been verified with `git diff --cached --name-only` to confirm all intended changes were staged.

**Lesson**: Add a `git diff --cached` read to the Stage 1 pre-commit checklist for sessions that include lifecycle doc closures.

---

## Process Improvements (Actionable)

| # | Finding | Proposed Change | Owner |
|---|---------|-----------------|-------|
| PI-1 | Column-drop migrations can silently break SQL functions (lazy parse) | Add "grep functions for column name before dropping" to migration authoring guide | Implementer / Architecture doc |
| PI-2 | `git mv` does not capture a preceding working-tree edit in the same staged set | In Stage 1, always `git add` content changes before `git mv`; verify with `git diff --cached` | DevOps Stage 1 checklist |
| PI-3 | Lifecycle batch-close (status change + move) should be verified before commit | Add `git diff --cached --name-only` read to Stage 1 pre-commit checkpoint | DevOps Stage 1 checklist |

---

## TDD Pattern: Migration Contract Test

This hotfix established a clean pattern for migration-scoped TDD:

```typescript
// pattern: test migration file content, not live DB execution
const sql = readFileSync(path.resolve(cwd, 'supabase/migrations/089_*.sql'), 'utf8');
expect(sql).toContain('INNER JOIN public.provider_offers po');
expect(sql).not.toContain('p.offers_ids');           // regression guard
expect(sql).toContain('GRANT EXECUTE ON FUNCTION');  // permissions preserved
```

**Worth codifying** in the testing patterns guide as the canonical approach for "migration adds/modifies a SQL function" coverage.

---

## Timeline

| Stage | Duration | Notes |
|---|---|---|
| Analysis | ~30m | L1-Proven RCA, no unknowns |
| Implementation (TDD) | ~45m | Red → Green → verification gates |
| Code Review | ~20m | APPROVED_WITH_COMMENTS; 1 MEDIUM finding |
| QA | ~15m | All gates re-verified |
| DevOps Stage 1 | ~30m | Rebase, migration apply, smoke tests, version bump, commit |
| DevOps Stage 2 | ~15m | CI watch, squash merge, tag |
| **Total** | **~2h 35m** | Same-session P0 hotfix |

---

## Metrics

- **Tests added**: 1 (migration contract test)
- **SQL functions fixed**: 1 (`search_food_concepts`)
- **Migrations added**: 1 (`089_fix_search_food_concepts_junction.sql`)
- **Lines of production SQL**: 116
- **Lines of test code**: 37
- **Regressions introduced**: 0
- **CI checks failed**: 0
- **Code Review blockers**: 0
