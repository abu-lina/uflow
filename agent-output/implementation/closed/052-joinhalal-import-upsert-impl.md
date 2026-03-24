---
ID: 052
Origin: 052
UUID: b4e91c3f
Status: Released
---

# Implementation 052 — JoinHalal Import Upsert with Unique ID

## Plan Reference

[agent-output/planning/052-joinhalal-import-upsert-plan.md](../planning/052-joinhalal-import-upsert-plan.md)

## Date

2026-03-22

## Changelog

| Date       | Handoff        | Request                 | Summary                                                                                                                                                   |
| ---------- | -------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-22 | Planner → Impl | Implement Plan 052 (R1) | All 6 milestones implemented, 391 tests pass, v0.8.12                                                                                                     |
| 2026-03-22 | QA → Impl      | QA re-fix (3 findings)  | [HIGH] Created RPC function with explicit DO UPDATE SET; [MED] Fixed WriteStats.updated; [BUG] Fixed seenImportKeys init; 395 tests pass, tsc/lint clean |

## Implementation Summary

**What**: Adds true upsert capability to the JoinHalal import pipeline. Each listing's WordPress post ID (`vxconfig.current_post.id`) is extracted as a stable unique identifier and stored in new `import_source` + `import_source_id` columns. Re-running the import updates existing providers instead of skipping or duplicating them.

**How this delivers value**: Operators can now re-run `--write` against JoinHalal sitemaps and have existing providers updated with fresh data (name, address, contacts, category, social links, offers). Admin-modified fields (review_status, provider_owner_id, images, barakah_effects, etc.) are **preserved** through a dedicated PostgreSQL RPC function (`upsert_joinhalal_providers`) that uses `ON CONFLICT DO UPDATE SET` with an explicit allowlist of source-controlled fields. The dry-run report distinguishes created vs. updated disposition, giving operators full impact visibility before committing.

## Milestones Completed

- [x] M1: Schema Migration 062 — `import_source`, `import_source_id` columns, partial unique index, `updated_at` trigger
- [x] M2: Parser `extractJoinHalalPostId` — pure function + shared `parseVxConfig` helper + 6 TDD tests
- [x] M3: Wire Upsert Logic — selective dedup, `.upsert()` with `onConflict`, dual-path write (upsert + insert-only)
- [x] M4: Dry-Run Reporting — `wouldUpdate` counter, import-source key loading, CLI + dashboard UI update
- [x] M5: Regression Tests — 4 new Plan 052 tests + DryRunResult contract update + all 391 tests pass
- [x] M6: Version Management — v0.8.12, CHANGELOG entry, lockfile aligned

## Files Modified

| Path                                                         | Changes                                                                                                                                                                                                                                                                                                                               | Lines |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `src/utils/joinhalal-parser.ts`                              | Added shared `parseVxConfig()` helper; refactored `extractDisplayNameFromHtml`; added `extractJoinHalalPostId()` export                                                                                                                                                                                                               | ~35   |
| `src/lib/import/joinhalal.ts`                                | Added `wouldUpdate` to `DryRunStats`; updated `ProviderRecord` with import fields; updated `transformPage()` to extract post ID; extended `loadExistingProviderKeys()` to return import-source keys; updated dry-run processing for create-vs-update classification; **[QA fix]** `seenImportKeys` now starts empty for correct dedup | ~65   |
| `scripts/import-joinhalal.ts`                                | Updated `ProviderUpsert` + `WriteStats`; updated `transformPageToProvider()`; selective dedup (Task 3.7); **[QA fix]** upsert path now calls `.rpc('upsert_joinhalal_providers')` for safe field preservation; `printWriteReport` shows inserted + updated counts; fixed stale banner text                                            | ~110  |
| `src/features/import/components/ImportDryRunPageContent.tsx` | Added "Would UPDATE" row to stats table                                                                                                                                                                                                                                                                                               | 1     |
| `src/__tests__/utils/joinhalal-parser.test.ts`               | 6 new tests for `extractJoinHalalPostId`                                                                                                                                                                                                                                                                                              | ~50   |
| `src/__tests__/lib/import/joinhalal-dry-run.test.ts`         | 4 new Plan 052 tests (wouldUpdate classification); updated DryRunResult contract test                                                                                                                                                                                                                                                 | ~150  |
| `package.json`                                               | Version bump to 0.8.12                                                                                                                                                                                                                                                                                                                | 1     |
| `package-lock.json`                                          | Lockfile aligned to 0.8.12                                                                                                                                                                                                                                                                                                            | 1     |
| `CHANGELOG.md`                                               | Added v0.8.12 entry                                                                                                                                                                                                                                                                                                                   | ~5    |

## Files Created

| Path                                                      | Purpose                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/062_add_import_source_columns.sql`   | Schema migration: `import_source` TEXT, `import_source_id` TEXT, partial unique index, `updated_at` trigger      |
| `supabase/migrations/063_upsert_joinhalal_provider_rpc.sql` | **[QA fix]** RPC function with `ON CONFLICT DO UPDATE SET` allowlist — preserves admin fields on conflict        |
| `src/lib/import/joinhalal-fields.ts`                      | **[QA fix]** Field classification constants (SOURCE_CONTROLLED_FIELDS, ADMIN_CONTROLLED_FIELDS) for contract tests |
| `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts` | **[QA fix]** Contract tests verifying field classification correctness                                           |

## Code Quality Validation

- [x] `npx tsc --noEmit` — exits 0
- [x] `npx vitest run` — 395 passed, 18 skipped, 0 failures
- [x] `npx eslint` on modified files — clean (warnings only)
- [ ] `npm run build` — blocked by missing `.env.local` (pre-existing, not Plan 052 regression)

## Value Statement Validation

**Original**: "As an import operator, I want to re-run the JoinHalal import and have it update existing providers with fresh data instead of skipping or duplicating them, so that provider information stays current."

**Implementation delivers**: Records with `import_source_id` are upserted via the `upsert_joinhalal_providers` RPC function which uses `ON CONFLICT DO UPDATE SET` with an explicit allowlist of source-controlled fields. Admin-controlled fields (`review_status`, `provider_owner_id`, `barakah_effects`, `needs_ids`, `show_address`, etc.) are **preserved** on conflict updates. Records without a post ID fall back to name+city dedup. Dry-run shows created vs. updated split. Write-mode report shows distinct inserted and updated counts. `updated_at` trigger ensures timestamps reflect re-import time.

## TDD Compliance

| Function/Class                 | Test File                        | Test Written First?                                              | Failure Verified? | Failure Reason                      | Pass After Impl? |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------- | ----------------- | ----------------------------------- | ---------------- |
| `extractJoinHalalPostId()`     | `joinhalal-parser.test.ts`       | ✅ Yes                                                           | ✅ Yes            | ReferenceError (not exported)       | ✅ Yes           |
| `parseVxConfig()` (internal)   | `joinhalal-parser.test.ts`       | ⚠️ Refactor (existing coverage via `extractDisplayNameFromHtml`) | ✅ Yes            | N/A (internal helper)               | ✅ Yes           |
| `DryRunStats.wouldUpdate`      | `joinhalal-dry-run.test.ts`      | ✅ Yes                                                           | ✅ Yes            | `wouldUpdate` undefined             | ✅ Yes           |
| Selective dedup (Task 3.7)     | `joinhalal-dry-run.test.ts`      | ✅ Yes (via wouldUpdate/skip classification)                     | ✅ Yes            | Incorrect classification            | ✅ Yes           |
| Field classification constants | `joinhalal-upsert-fields.test.ts` | ✅ Yes                                                           | ✅ Yes            | Module not found                    | ✅ Yes           |
| RPC upsert function            | N/A (SQL migration)              | ⚠️ DB integration (tested via field classification contract)     | N/A               | N/A                                 | N/A              |
| CLI `.rpc()` call              | N/A (integration path)           | ⚠️ Manual/UAT verification                                       | N/A               | N/A                                 | N/A              |

## Test Coverage

### Unit Tests (14 new)

- `extractJoinHalalPostId`: 6 tests (valid extraction, missing vxconfig, missing id, numeric-to-string, null id, empty HTML)
- `wouldUpdate classification`: 4 tests (matching import-source, new post ID, no vxconfig fallback, mixed invariant)
- `field classification contract`: 4 tests (disjoint sets, complete coverage, source allowlist match, admin allowlist match)

### Integration Tests

- DryRunResult contract shape updated to include `wouldUpdate`
- Mixed create/update/skip invariant: `wouldInsert + wouldUpdate = parsed - skipped`

### Regression

- All 395 tests pass (up from 391 before QA re-fix)

## Test Execution Results

```
$ npx vitest run
 Test Files  41 passed | 1 skipped (42)
      Tests  395 passed | 18 skipped (413)

$ npx tsc --noEmit
(clean — 0 errors)

$ npx eslint (modified files)
(clean — 0 errors, 2 warnings)
```

## Outstanding Items

1. **`npm run build` blocked**: Missing `.env.local` prevents full build verification. This is a pre-existing environment issue — all prior plans (047–051) were approved with this same blocker. Not a Plan 052 regression.
2. **First re-import behavior**: Pre-migration rows (NULL import columns) will continue to be deduped by name+city. On re-import, pages with a vxconfig post ID will INSERT new rows with both columns set. Operator can clean up stale name+city duplicates manually.

## QA Re-Fix Summary

### [HIGH] Conflict updates overwrite admin-controlled fields
**Root cause**: The original implementation used generic Supabase `.upsert()` with the full payload, which updates ALL columns on conflict.
**Fix**: Created PostgreSQL RPC function `upsert_joinhalal_providers` (migration 063) that uses `ON CONFLICT DO UPDATE SET` with an explicit allowlist of source-controlled fields only. The CLI now calls `.rpc('upsert_joinhalal_providers')` instead of `.upsert()`.

### [MEDIUM] WriteStats.updated never incremented
**Root cause**: Supabase `.upsert()` doesn't return insert vs update distinction.
**Fix**: The RPC function uses `xmax = 0` technique to return separate `inserted_count` and `updated_count`. CLI now populates `stats.inserted` and `stats.updated` from the RPC response. `printWriteReport` displays both.

### [BUG] Dry-run wouldUpdate tests failing
**Root cause**: Code Review fix-in-review #1 initialized `seenImportKeys` with `importSourceKeys` content, causing DB duplicates to be incorrectly skipped as intra-run duplicates before the `wouldUpdate` check.
**Fix**: `seenImportKeys` now starts empty for true intra-run dedup.

## Next Steps

✅ PHASE COMPLETE: ⑤ Implementer (QA re-fix)
📄 Output: agent-output/implementation/052-joinhalal-import-upsert-impl.md
➡️ NEXT: Pick "⑦ QA" from the Orchestrator handoff suggestions (re-QA)
Gate: QA verdict must be PASSED
