---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Active
---

# Plan 114 Phase 3 Implementation - Referential Integrity (F-2 + F-4)

## Plan Reference
- Plan: `Phase 3 — Referential Integrity (F-2 + F-4)`
- Value Statement: Replace array-based and polymorphic relationships with explicit referential integrity (junction tables + typed foreign keys), then update service-layer behavior and remove legacy schema paths safely.

## Date
- 2026-04-29

## Changelog

| Date (UTC) | Handoff/Request | Summary |
| --- | --- | --- |
| 2026-04-29 | Implement Plan 114 Phase 3 | Implemented migration and service-layer refactor for explicit FKs/junctions, added regression/TDD tests, and completed verification gates. |

## Implementation Summary
Implemented Phase 3 referential integrity end-to-end across schema, services, hooks, and tests.

- Added canonical junction tables: `provider_offers`, `provider_needs`, `community_service_offers`, `community_service_needs`.
- Added typed bookmark/badge foreign keys (`provider_id`, `community_service_id`) with mutual exclusion checks and FK constraints.
- Backfilled all new structures from legacy array/polymorphic columns.
- Refactored read/write service paths to use typed/junction relations.
- Updated policy/trigger usage to typed keys and removed legacy columns/indexes/type.

This delivers the plan value by making relationship integrity enforceable at the DB layer while preserving service compatibility during transition.

## Baseline & Measurements
- N/A - plan scope is schema integrity and service correctness, not benchmark/perf target delivery.

## Milestones Completed
- [x] Junction tables created and backfilled.
- [x] Typed FK columns added on bookmarks/provider_badges with mutual exclusion checks.
- [x] Service-layer query/write paths migrated to typed/junction relations.
- [x] Legacy array/polymorphic columns and related indexes/type dropped.
- [x] Regression tests added and passing.

## Files Modified

| Path | Changes | Approx. Lines |
| --- | --- | --- |
| `src/services/bookmarks.ts` | Typed FK bookmark query/insert/toggle paths; legacy compatibility fields derived | ~60 |
| `src/hooks/useOptimisticBookmark.ts` | Optimistic bookmark match/insert switched to typed FKs | ~20 |
| `src/services/badges.ts` | Typed FK badge queries/inserts; legacy response mapping compatibility | ~80 |
| `src/services/badges.server.ts` | Typed FK server query paths and response compatibility mapping | ~40 |
| `src/types/badges.ts` | Added typed FK fields while preserving legacy entity fields | ~10 |
| `src/services/matching.ts` | Matching logic rewritten to use provider junction tables | ~120 |
| `src/services/providers.ts` | Provider relation hydration/search/bookmark aggregation moved to junction/typed paths | ~170 |
| `src/services/providers.server.ts` | Server provider relation loading switched to junction paths | ~50 |
| `src/services/communityServices.ts` | Community service relation loading switched to junction paths | ~35 |
| `src/services/communityServices.server.ts` | Server community-service relation loading switched to junction paths | ~30 |
| `src/services/providerService.ts` | Create flow writes junction rows and typed badge refs | ~100 |
| `src/services/admin/providerEdit.ts` | Admin update flow syncs `provider_offers`/`provider_needs` junction rows | ~55 |
| `src/services/admin/communityServiceEdit.ts` | Admin update flow syncs community-service junction rows | ~55 |
| `src/__tests__/services/providers.server.test.ts` | Updated mocks for junction-table relation reads | ~20 |
| `src/__tests__/services/providerService.badges.test.ts` | Updated write-path expectations for typed/junction refs | ~30 |
| `src/__tests__/services/admin-provider-edit.test.ts` | Updated admin edit expectations for junction sync | ~25 |
| `src/__tests__/services/badges.server.test.ts` | Updated fixture for typed FK response mapping | ~15 |

## Files Created

| Path | Purpose |
| --- | --- |
| `supabase/migrations/006_phase3_referential_integrity.sql` | Phase 3 DDL: junction tables, typed FKs, backfill, constraints, policy/trigger updates, legacy drops |
| `src/__tests__/migrations/006-phase3-referential-integrity-tdd.test.ts` | Migration TDD/regression assertions for required Phase 3 SQL operations |
| `src/__tests__/services/bookmarks.phase3.test.ts` | Regression tests for typed bookmark query/insert/toggle behavior |
| `src/__tests__/services/badges.phase3.test.ts` | Regression tests for typed badge query/insert behavior |
| `src/__tests__/services/matching.phase3.test.ts` | Regression test for junction-based matching behavior |

## Deployment Path Audit
- N/A - no deployment scripts, workflows, Docker, or runtime deployment surfaces were modified.

## Code Quality Validation

- [x] `npm test -- --run` -> pass (`147` passed files, `1` skipped; `1183` passed tests, `18` skipped)
- [x] `npm run type-check` -> pass
- [x] `npm run lint` -> pass with warnings only (`0` errors, pre-existing warnings)
- [x] `npm run build` -> pass with CI-style placeholder Supabase env values
- [x] Compatibility maintained for legacy badge/bookmark response consumers via mapped fields

Build note:
- Initial local build failed due missing local Supabase env vars.
- Successful verification run used validated placeholder values consistent with CI build verification behavior.

## Value Statement Validation
- Original value statement: enforce referential integrity by replacing array/polymorphic relationships with explicit relational schema and typed FKs.
- Implementation delivers by:
  - Enforcing DB-level integrity through PK/FK/check constraints.
  - Migrating reads/writes to those constraints in service layer.
  - Removing legacy schema paths that bypass integrity checks.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `006_phase3_referential_integrity.sql` migration contract | `src/__tests__/migrations/006-phase3-referential-integrity-tdd.test.ts` | ✅ Yes | ✅ Yes | Assertion failure against missing SQL clauses pre-implementation | ✅ Yes |
| Typed bookmark FK path (`getBookmarkForProvider` / create/toggle payload behavior) | `src/__tests__/services/bookmarks.phase3.test.ts` | ✅ Yes | ✅ Yes | Assertion failure on old polymorphic columns / missing typed payload | ✅ Yes |
| Typed badge FK path (`getBadgesForEntity`, `createProviderBadge`) | `src/__tests__/services/badges.phase3.test.ts` | ✅ Yes | ✅ Yes | Query shape mismatch and old payload expectations | ✅ Yes |
| Junction-based matching path | `src/__tests__/services/matching.phase3.test.ts` | ✅ Yes | ✅ Yes | Expected junction-table query behavior absent pre-implementation | ✅ Yes |
| `mapBadgeRowWithLegacyFields` compatibility mapping | `src/__tests__/services/badges.server.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Legacy fixture lacked typed FK fields; pre-fix expectation no longer valid | ✅ Yes |

## Test Coverage
- Unit/service coverage expanded for:
  - typed bookmark behavior
  - typed badge behavior
  - junction-based provider matching
- Migration-level SQL contract checks added for key DDL/backfill/drop operations.
- Existing impacted service tests updated to assert new typed/junction pathways.

## Test Execution Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx vitest run src/__tests__/services/badges.phase3.test.ts src/__tests__/services/badges.server.test.ts` | ✅ Pass | Targeted verification for previously failing Phase 3 regressions |
| `npm test -- --run` | ✅ Pass | Full suite green after badge regression fixes |
| `npm run type-check` | ✅ Pass | No TypeScript errors |
| `npm run lint` | ✅ Pass (warnings only) | 0 errors; warnings pre-existing |
| `npm run build` | ✅ Pass | Required valid Supabase env placeholders in local shell |

## Cross-Layer Integration Self-Check
- N/A - no new API routes and no new query-param redirects introduced in this phase.

## Search/Filter Client-Interaction Trace
- N/A - no search form submit URL lifecycle changes or mixed-entity inline action changes were introduced.

## Multi-Plan State Audit
- N/A - no prior-plan client state hydration/mutation logic was modified in this phase.

## API Route Coverage Gate
- N/A - no route handlers under `src/app/api/**/route.ts` were added/modified.

## Local Verification Gate
- N/A - changes are data/service/migration focused and validated via automated tests/build gates.

## Interaction-Layer Audit Checklist
- N/A - no pointer/overlay/hit-testing related UI changes.

## Schema Verification Gate (DB Migrations)
- ⚠️ Deferred for environment access:
  - Migration references existing tables/columns/functions as expected by app schema.
  - Local verification used migration contract tests and application test suite.
  - Required target-project `information_schema` / `pg_proc` verification must be executed in deployment database by QA/DevOps before release promotion.

## DB Plan Evidence Gate (Search)
- N/A - this phase did not introduce new search indexes/RPC performance changes requiring EXPLAIN evidence.

## Outstanding Items
- Deployment-environment schema verification queries (production/UAT Supabase) pending QA/DevOps execution.
- Lint warnings remain in unrelated existing files (no blocking errors introduced by this implementation).

## Next Steps
1. Code Review gate.
2. QA gate (including deployment DB schema verification evidence).
3. UAT after QA pass.
