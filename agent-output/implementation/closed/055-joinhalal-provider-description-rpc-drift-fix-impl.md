---
ID: 055
Origin: 055
UUID: 7d2f4a9c
Status: Released
---

# Implementation 055 — JoinHalal RPC `provider_description` Schema Drift Fix

## Plan Reference

`agent-output/planning/055-joinhalal-provider-description-rpc-drift-fix.md`

## Date

2026-03-23

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-03-23T08:38Z | User → Implementer | Implement Plan 055 | Initial implementation of all 5 milestones |
| 2026-03-23T08:04Z | DevOps → Stage 1 | Local Commit | Implementation document moved to terminal Committed state for local release commit |
| 2026-03-23T08:12Z | DevOps → Stage 2 | Release | Implementation artifact marked Released after `v0.8.15` tag and branch push |

---

## Implementation Summary

Fixes the schema-contract mismatch between the PostgreSQL RPC `upsert_joinhalal_providers` (migration 063) and production-shaped environments where `providers.provider_description` is absent. The fix removes `provider_description` from the RPC function definition via a new migration (064), aligns TypeScript field metadata, adds regression tests, and improves write-mode preflight diagnostics.

### How This Delivers Value

The value statement requires write-mode imports to succeed on production-shaped environments and surface schema mismatches before data writes begin. This implementation:
1. **M1**: Creates migration 064 that uses `CREATE OR REPLACE` to redefine `upsert_joinhalal_providers` without any `provider_description` references — fixing the root cause at the database boundary.
2. **M2**: Removes `provider_description` from `SOURCE_CONTROLLED_FIELDS` in `joinhalal-fields.ts` so the TypeScript contract matches the repaired SQL.
3. **M3**: Adds 3 regression tests that make the schema drift bug permanently visible in CI.
4. **M4**: Adds a pre-write RPC existence check that fails fast with actionable messaging if the target environment lacks the function, and updates the existing `provider_description` probe to be informational-only.
5. **M5**: Bumps version to 0.8.15, aligns lockfile, updates CHANGELOG.

### Critique MEDIUM Finding Decisions

- **M1 column-present behavior**: Removed `provider_description` unconditionally from the RPC (per Plan Assumption #4: "preserving safe writes is more important than persisting that field"). Environments that have the column simply won't populate it via the import RPC.
- **M4 preflight scope**: Implemented the Critic's option (c) — verifying the RPC function exists and is callable before the first batch write, by calling it with an empty array `[]`. Also updated the existing `provider_description` probe messaging from warning-style to informational-style since the RPC no longer depends on it.

---

## Milestones Completed

- [x] M1 — Repair the RPC Schema Contract
- [x] M2 — Align Importer and TypeScript Contract Metadata
- [x] M3 — Add Regression Coverage for Schema-Optional Upsert Behavior
- [x] M4 — Improve Operator-Facing Preflight Visibility
- [x] M5 — Version and Release Artifacts

---

## Files Modified

| Path | Changes | Lines |
| --- | --- | --- |
| `src/lib/import/joinhalal-fields.ts` | Removed `provider_description` from `SOURCE_CONTROLLED_FIELDS`; updated doc comment to reference migration 064 | ~5 |
| `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts` | Removed `provider_description` from existing test expectations; added 3 Plan 055 regression tests | ~30 |
| `scripts/import-joinhalal.ts` | Added `checkUpsertRpcExists()` function; added RPC preflight check before first write; updated `provider_description` probe to informational messaging | ~30 |
| `package.json` | Version bump 0.8.14 → 0.8.15 | 1 |
| `package-lock.json` | Lockfile aligned to 0.8.15 | auto |
| `CHANGELOG.md` | Added [0.8.15] entry describing both fixes | ~6 |
| `agent-output/planning/055-*.md` | Status → In Progress; changelog entry added | 1 |

## Files Created

| Path | Purpose |
| --- | --- |
| `supabase/migrations/064_fix_upsert_joinhalal_remove_provider_description.sql` | New migration: `CREATE OR REPLACE` of `upsert_joinhalal_providers` without `provider_description` |

---

## Code Quality Validation

- [x] `npx vitest run` — 416 passed, 18 skipped, 0 failed ✅
- [x] `npm run type-check` — clean (exit 0) ✅
- [x] `npm run build` — ❌ Pre-existing failure on `/api/admin/badges/unverify` (confirmed same failure without Plan 055 changes via `git stash` + build)
- [x] Lockfile aligned — both `package.json` and `package-lock.json` show `0.8.15` ✅

### Build Failure Note

The `npm run build` failure on `/api/admin/badges/unverify` is **pre-existing** and unrelated to Plan 055. Verified by stashing all Plan 055 changes and running `npm run build` — same error. This is a known issue in the admin badges route, not introduced by this change.

---

## Value Statement Validation

**Original**: "As an operator running the JoinHalal import pipeline from GitHub Actions or a terminal, I want the write-mode upsert path to honor the real provider schema in the target database, so that import runs succeed on production-shaped environments and genuine schema mismatches surface clearly before data writes begin."

**Implementation delivers**: ✅
- The RPC function no longer references `provider_description`, so it will succeed on environments where the column is absent.
- The preflight RPC existence check surfaces missing/incompatible function definitions before the first write batch.
- Schema contract metadata (TS field lists) matches the repaired SQL contract.
- 3 regression tests prevent this drift from re-entering the codebase.

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `SOURCE_CONTROLLED_FIELDS` (removal of `provider_description`) | `joinhalal-upsert-fields.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | AssertionError: `expected [...] to not include 'provider_description'` | ✅ Yes |
| `SOURCE_CONTROLLED_FIELDS` (allowlist match) | `joinhalal-upsert-fields.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | AssertionError: `expected [12 items] to deeply equal [11 items]` | ✅ Yes |
| RPC contract no-depend assertion | `joinhalal-upsert-fields.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | AssertionError: `expected true to be false` | ✅ Yes |
| `checkUpsertRpcExists()` | N/A (CLI script, not unit-testable without Supabase mock) | ⚠️ N/A (runtime function, tested via CLI integration) | N/A | N/A | N/A |

**Note on `checkUpsertRpcExists()`**: This function is defined in `scripts/import-joinhalal.ts` (a CLI script, not a library module). It follows the same pattern as the existing `checkProviderDescriptionExists()` which also lacks isolated unit tests. Both are validated through CLI integration testing. Adding Supabase client mocking infrastructure for CLI scripts is out of scope for this bugfix.

---

## Test Coverage

### Unit / Contract Tests (7 tests)

| Test | Status |
| --- | --- |
| source-controlled and admin-controlled field sets are disjoint | ✅ Pass |
| all import-relevant provider fields are classified | ✅ Pass |
| source-controlled fields match the RPC DO UPDATE SET allowlist | ✅ Pass |
| admin-controlled fields are never updated on conflict | ✅ Pass |
| **[Plan 055]** provider_description is NOT in source-controlled fields | ✅ Pass |
| **[Plan 055]** provider_description is NOT in admin-controlled fields | ✅ Pass |
| **[Plan 055]** RPC contract does not depend on provider_description column | ✅ Pass |

### Full Suite

- 416 tests passed, 18 skipped, 0 failed
- All existing tests continue to pass

## Test Execution Results

```
$ npx vitest run src/__tests__/lib/import/joinhalal-upsert-fields.test.ts
Test Files  1 passed (1)
     Tests  7 passed (7)

$ npx vitest run
Test Files  43 passed | 1 skipped (44)
     Tests  416 passed | 18 skipped (434)

$ npm run type-check
tsc --noEmit  (exit 0)
```

---

## Outstanding Items

| Item | Type | Owner | Notes |
| --- | --- | --- | --- |
| Pre-existing build failure on `/api/admin/badges/unverify` | Pre-existing bug | Planner | Not introduced by Plan 055; same error before and after changes |
| 053-OA-1: staging import validation | Open action | DevOps/Operator | Should be re-attempted after Plan 055 release |
| 054-OA-1: staging write validation | Open action | DevOps/Operator | Should be re-attempted after Plan 055 release |
| Live schema verification with `pg_get_functiondef` | Validation | DevOps | Recommended at deployment time if environment access is available |

---

## Next Steps

➡️ Code Review → QA → UAT → DevOps
