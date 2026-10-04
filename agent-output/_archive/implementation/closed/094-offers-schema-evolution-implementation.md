---
ID: 094
Origin: 094
UUID: b3e7a912
Status: Committed
---

# Implementation 094 - Provider Catalog Schema Evolution

## Plan Reference

- Plan: `agent-output/planning/094-offers-schema-evolution-plan.md`
- Architecture: `agent-output/architecture/094-offers-schema-adr.md`
- Critique: `agent-output/critiques/094-offers-schema-evolution-plan-critique.md`

## Date

- 2026-04-19T20:58Z

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-19T20:58Z | Critic -> Implementer | Implement migration 068 | Added migration 068 tables, indexes, RLS, RPC, provider_stats extension; added TDD migration contract test |

## Implementation Summary

Implemented Milestone 1 and Milestone 2 scope in `supabase/migrations/068_provider_catalog_tables.sql`.

What was implemented:
- `provider_menu_items` table with typed fields (`price_cents`, `is_available`) and `search_vector` as a STORED generated column
- `provider_service_offers` table with typed fields (`price_cents`, `duration_minutes`, `is_available`) and `search_vector` as a STORED generated column
- Non-JSONB design for ordering-critical fields, matching ADR-094 D4
- Indexes for provider filtering, GIN full-text search, and available-item hot path filters
- RLS enabled and owner policies added for SELECT/INSERT/UPDATE/DELETE on both tables
- `search_provider_items(...)` RPC using UNION ALL with `item_type` discriminator and optional filters
- `provider_stats` materialized view extension to include item counts (`menu_item_count`, `service_offer_count`) in the existing singleton stats contract

## Baseline and Measurements

- Baseline query capture for `search_offers` and post-migration EXPLAIN for `search_provider_items` is blocked in this workspace because `supabase db reset --local` fails in pre-existing migration `061_fix_clothing_category_image_reference.sql` before reaching migration 068.
- Deferral owner: Implementer for this plan
- Follow-up: re-run once migration 061 drift is resolved in local DB bootstrap path

## Milestones Completed

- [x] M1: Migration 068 schema + indexes + RLS
- [x] M2: `search_provider_items` RPC
- [x] M3: `provider_stats` extension with item count columns
- [ ] M4: RLS EXPLAIN ANALYZE evidence (blocked by local DB reset failure at migration 061)
- [ ] M5: Version artifact update (not executed; request scope was migration 068 implementation)

## Files Modified

| Path | Changes | Lines |
|---|---|---|
| `agent-output/planning/094-offers-schema-evolution-plan.md` | Status `Active` -> `In Progress`; added implementer start changelog row | +2 |

## Files Created

| Path | Purpose |
|---|---|
| `supabase/migrations/068_provider_catalog_tables.sql` | Main migration implementing tables, indexes, RLS policies, RPC, provider_stats extension |
| `src/__tests__/migrations/068-provider-catalog-tdd.test.ts` | TDD gate test asserting migration presence and key SQL contract markers |
| `agent-output/implementation/094-offers-schema-evolution-implementation.md` | Implementation evidence and milestone tracking |

## Deployment Path Audit

- N/A for this change. No deployment surface files were changed (`Dockerfile`, deploy scripts, workflow files, nginx).

## Code Quality Validation

- [x] `npm run type-check` exits 0
- [x] `npm run lint` exits 0 (warnings only, pre-existing)
- [x] `npx vitest run src/__tests__/migrations/068-provider-catalog-tdd.test.ts` exits 0
- [ ] `npm run build` exits 0

Build status detail:
- `npm run build` fails due missing `NEXT_PUBLIC_SUPABASE_URL` in environment during page data collection for API routes.
- This is an environment configuration blocker, not caused by migration/test files.

## Value Statement Validation

Original value statement:
- As a food provider or business service provider, publish provider-specific catalog items/services with prices and availability so seekers can browse exact offerings.

Implementation delivery:
- Delivered schema and search backend foundation required to persist provider-specific catalog items and query them with full-text search.
- Preserved existing global `offers` vocabulary model and did not modify `search_offers` path, satisfying backward compatibility.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| Migration 068 SQL contract (`provider_menu_items`, `provider_service_offers`, `search_provider_items`) | `src/__tests__/migrations/068-provider-catalog-tdd.test.ts` | ✅ Yes | ✅ Yes | Assertion failure before implementation: `expected false to be true` for migration file existence | ✅ Yes |

TDD evidence:
- Red phase command: `npm test -- src/__tests__/migrations/068-provider-catalog-tdd.test.ts`
- Red phase output: failed with `expected false to be true` at `existsSync(migrationPath)`
- Green phase command: `npm test -- src/__tests__/migrations/068-provider-catalog-tdd.test.ts --run`
- Green phase output: 1 test passed

## Test Coverage

- Unit/regression contract coverage added for migration existence and essential SQL markers.
- DB execution-level coverage (actual migration apply + RPC query + RLS runtime policy evaluation) is pending due local reset blocker at migration 061.

## Test Execution Results

| Command | Result | Notes |
|---|---|---|
| `npm test -- src/__tests__/migrations/068-provider-catalog-tdd.test.ts` | FAIL (expected red phase) | Failure reason: migration file not found before implementation |
| `npm test -- src/__tests__/migrations/068-provider-catalog-tdd.test.ts --run` | PASS | Green phase after migration file creation |
| `npx vitest run src/__tests__/migrations/068-provider-catalog-tdd.test.ts` | PASS | Deterministic non-watch validation |
| `npm run type-check` | PASS | No TypeScript errors |
| `npm run lint` | PASS with warnings | 31 warnings, no errors (pre-existing warnings in test/app files) |
| `npm run build` | FAIL | Missing `NEXT_PUBLIC_SUPABASE_URL` env var |
| `supabase db reset --local` | FAIL | Blocked by pre-existing migration 061 column mismatch (`category_images` missing) |

## Outstanding Items

- M4 not complete: RLS `EXPLAIN (ANALYZE, BUFFERS)` evidence could not be produced due local migration chain failure before 068.
- M5 not complete: version bump and changelog update were not part of this request's execution scope.
- Local DB bootstrap blocker exists in pre-existing migration `061_fix_clothing_category_image_reference.sql` and must be resolved before full SQL integration verification.

## Search/Filter Client-Interaction Trace

- N/A. This change is SQL migration + test only; no client submit handlers, URL builders, or mixed-entity inline actions were modified.

## Interaction-Layer Audit Checklist

- N/A. No UI/CSS/pointer-event related changes.

## Local Verification Gate

- N/A. No user-visible UI changes were implemented.

## Next Steps

1. Resolve local migration chain blocker in migration 061 bootstrap path, then re-run `supabase db reset --local` and collect M4 EXPLAIN evidence.
2. Execute RLS runtime verification with owner/non-owner roles and attach EXPLAIN output.
3. Complete M5 version artifacts if release bundling for Plan 094 is requested.
