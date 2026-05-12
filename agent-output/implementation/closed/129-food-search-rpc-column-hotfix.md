---
ID: 129
Origin: 129
UUID: c7e3a91f
Status: Committed
---

# 129 - search_food_concepts RPC column hotfix implementation

## Plan Reference

- Primary artifact used: [agent-output/analysis/129-food-search-rpc-column-rca.md](agent-output/analysis/129-food-search-rpc-column-rca.md)
- Planning artifact in this worktree: not found for ID 129 (hotfix was routed Analyst -> Implementer directly)

## Date

- 2026-05-12

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-05-12 | Analyst -> Implementer | Hotfix #129 | Replaced broken `p.offers_ids` join in `search_food_concepts` with `provider_offers` junction-table join via migration 089, with TDD evidence. |

## Implementation Summary

Implemented a surgical DB hotfix as a new migration that recreates `public.search_food_concepts(TEXT, INTEGER)` with the same signature and ranking behavior, but updates the provider linkage to use `public.provider_offers` instead of the dropped `public.providers.offers_ids` column.

This restores `/search?section=food` RPC execution immediately while preserving client contract and permissions.

## Baseline & Measurements

- N/A for this hotfix. No performance target was specified in the handoff.
- Functional baseline from RCA: production RPC returning `42703 column p.offers_ids does not exist`.

## Milestones Completed

- [x] Load authoritative RCA and memory context for ID 129
- [x] TDD red gate: add failing migration contract test before SQL implementation
- [x] Implement migration 089 to recreate `search_food_concepts` with junction join
- [x] TDD green gate: new test passes
- [x] Run repository verification gates (`vitest`, `lint`, `type-check`, `build`)
- [x] Record schema verification evidence for referenced tables

## Files Modified

| Path | Changes | Approx. Lines |
| --- | --- | --- |
| [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts) | Added TDD regression contract for migration 089 (requires junction join and forbids `p.offers_ids`) | +38 |
| [supabase/migrations/089_fix_search_food_concepts_junction.sql](supabase/migrations/089_fix_search_food_concepts_junction.sql) | Added hotfix migration recreating function with `provider_offers` join and preserved grants | +116 |

## Files Created

| Path | Purpose |
| --- | --- |
| [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts) | TDD red/green proof for migration contract |
| [supabase/migrations/089_fix_search_food_concepts_junction.sql](supabase/migrations/089_fix_search_food_concepts_junction.sql) | Runtime outage hotfix for `search_food_concepts` |

## Deployment Path Audit

- N/A - no deployment scripts, workflow files, Docker, or runtime infra surface changed.

## Schema Verification Gate Evidence (DB migration)

Migration 089 references existing objects: `public.providers`, `public.provider_offers`, and `public.offers`.

Evidence captured:
- Source migration proof in [supabase/migrations/006_phase3_referential_integrity.sql](supabase/migrations/006_phase3_referential_integrity.sql) shows:
  - `provider_offers` creation (line 12)
  - `providers.offers_ids` drop (line 323)
- Live-project table inventory via MCP (`mcp_supabase-dev_list_tables`) confirms `public.providers` and `public.provider_offers` exist.

## Code Quality Validation

- [x] Tests: full suite passed (`npx vitest run`), exit code 0
- [x] Lint: `npm run lint` exit code 0 (warnings only; no errors)
- [x] Type-check: `npm run type-check` exit code 0
- [x] Build: `npm run build` exit code 0 with valid-format env vars
- [x] Backward compatibility: RPC signature unchanged (`TEXT, INTEGER -> TABLE(...)`)

## Value Statement Validation

Original value objective: restore food search RPC availability and remove `42703` outage.

Implementation delivers by replacing the invalid dropped-column join with the normalized junction-table join, allowing `search_food_concepts` to execute again without changing client call paths.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `public.search_food_concepts` (SQL function replacement via migration 089) | [src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts](src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts) | ✅ Yes | ✅ Yes | Assertion failure: migration file missing (`existsSync(...) expected true`) | ✅ Yes |

## Test Coverage

- Unit/contract coverage added for migration content:
  - Asserts function drop/recreate
  - Asserts junction join through `provider_offers`
  - Asserts absence of legacy `p.offers_ids`
  - Asserts grant parity after recreation

## Test Execution Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx vitest run src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts` (red) | Failed (expected) | `existsSync(migrationPath)` false before implementing migration |
| `npx vitest run src/__tests__/migrations/089-food-concepts-rpc-junction-fix-tdd.test.ts` (green) | Passed | New migration present and contract checks pass |
| `npx vitest run` | Passed | `158 passed`, `2 skipped`, exit 0 |
| `npm run lint` | Passed with warnings | Exit 0; existing repo warnings unchanged |
| `npm run type-check` | Passed | Exit 0 |
| `npm run build` | Passed | Exit 0 when run with valid-format `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

## Cross-Layer Integration Self-Check

- Trigger not applicable: no new API route, no new client-emitted query params, no new route contract.

## Search/Filter Client-Interaction Trace

- N/A - no client submit handler or URL-param builder changed.

## Multi-Plan State Audit

- N/A - no React state/effect/hydration logic changed.

## Local Verification Gate

- N/A - this hotfix is SQL migration + migration test only; no UI or interaction layer changed.

## Interaction-Layer Audit Checklist

- N/A - no pointer/hit-testing/layout changes.

## Outstanding Items

- Apply migration 089 to target Supabase environments (UAT/prod) via normal deployment pipeline.
- Optionally add a runtime SQL smoke check in release validation: call `search_food_concepts('', 10)` after migration apply.

## Next Steps

1. Code Review
2. QA validation (migration apply + RPC smoke check)
3. UAT confirmation on `/search?section=food`
