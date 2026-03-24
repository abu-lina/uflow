---
ID: 055
Origin: 055
UUID: 7d2f4a9c
Status: Planned
---

# Analysis 055 — JoinHalal RPC `provider_description` Schema Drift

## Changelog

| Date (UTC) | Handoff | Summary |
| --- | --- | --- |
| 2026-03-23 | User → Analyst | Investigated GitHub Actions write-path failure: `column "provider_description" of relation "providers" does not exist` |
| 2026-03-23T07:22Z | Analyst → Planner | Analysis consumed for Plan 055; status moved to Planned |

## Value Statement and Business Objective

As an operator running the JoinHalal importer in GitHub Actions,
I need write-mode failures to identify the actual broken contract,
so release follow-up can target the real database/code drift instead of treating the run as a generic RPC outage.

## Objective

Determine whether the reported batch upsert failure is caused by:

1. a malformed importer payload,
2. a missing or outdated RPC definition, or
3. target-database schema drift between the importer assumptions and the live `providers` table.

## Context

- User-reported runtime error from GitHub Actions:
  - `❌ Batch upsert failed (offset 0): column "provider_description" of relation "providers" does not exist`
- Current JoinHalal write path sends records with `import_source_id` through PostgreSQL RPC `upsert_joinhalal_providers`.
- The importer already contains runtime logic to detect whether `providers.provider_description` exists before mapping that field.

## Methodology

- Upstream trace from failing CLI write path into the RPC boundary.
- Direct source inspection of the importer runtime schema check.
- Direct source inspection of migration 063 RPC definition.
- Historical schema drift comparison using migration 056 and earlier critique/implementation artifacts.

## Findings

### 1. Verified: the importer explicitly knows `provider_description` may be absent in the target database

Evidence:

- `scripts/import-joinhalal.ts` performs a schema probe via `checkProviderDescriptionExists()` by querying `providers.provider_description` and returning `false` if the column error mentions `provider_description`.
- In write mode, the script logs either `Column available` or `Column absent — description mapping skipped` before page processing begins.
- The shared app-side importer logic in `src/lib/import/joinhalal.ts` contains the same conditional schema check.

Implication:

- The application layer already treats `provider_description` as optional because production drift was known before this failure.

### 2. Verified: the failing batch path does not write directly to `providers`; it calls RPC `upsert_joinhalal_providers`

Evidence:

- In `scripts/import-joinhalal.ts`, every record with `import_source_id` is routed into `toUpsert`.
- The write loop calls `supabase.rpc('upsert_joinhalal_providers', { p_providers: cleanBatch })` for those records.
- The reported error string appears exactly in that RPC error handler: `Batch upsert failed (offset ${offset}): ${error.message}`.

Implication:

- The GitHub Actions failure is not coming from the insert-only fallback path. It is coming from the SQL function executed by the database.

### 3. Verified: migration 063 hardcodes `provider_description` in the RPC SQL regardless of the importer's runtime schema check

Evidence:

- `supabase/migrations/063_upsert_joinhalal_provider_rpc.sql` defines `INSERT INTO public.providers (...)` with `provider_description` in the target column list.
- The same function also sets `provider_description = EXCLUDED.provider_description` in the `DO UPDATE SET` allowlist.
- This SQL executes even when the JSON payload omits the key, because the failure is caused by the target table column reference itself, not by missing JSON content.

Implication:

- If the target database lacks `providers.provider_description`, the RPC will fail before payload-level optionality matters.

### 4. Verified: the repository already documents that `provider_description` does not exist in production

Evidence:

- `supabase/migrations/056_add_provider_community_service_search_indexes.sql` contains the comment: `provider_description column does not exist in production`.
- The closed Plan 047 critique explicitly flagged this ambiguity and required runtime verification rather than assuming the column exists.
- Plan 047 implementation notes say description mapping is skipped when the column is absent.

Implication:

- The failure is not a new mystery. It is a previously known production drift that was handled in the importer layer but not handled in the RPC layer introduced later in migration 063.

## Root Cause

### Verified Root Cause

The JoinHalal write pipeline has a schema-contract mismatch between the importer and the database RPC:

- The importer treats `provider_description` as optional and can skip populating it when the target schema lacks the column.
- The RPC `upsert_joinhalal_providers` still assumes `public.providers.provider_description` exists and references it unconditionally in SQL.

Because GitHub Actions executed the write path against a database where `providers.provider_description` does not exist, the first upsert batch failed at the SQL layer with the exact reported error.

## System Weaknesses

1. Schema optionality was implemented only in the application layer, not in the database boundary.
   - Risk mechanism: importer preflight can say “description mapping skipped”, while the downstream RPC still requires the missing column.

2. TypeScript/SQL contract drift is not validated in CI.
   - Risk mechanism: `src/lib/import/joinhalal-fields.ts` and its test assert that `provider_description` belongs in the source-controlled allowlist, but they do not validate that the live database schema supports that field.

3. Migration comments and runtime probes are not treated as release blockers for later DB changes.
   - Risk mechanism: migration 056 already recorded the production drift, yet migration 063 reintroduced an unconditional dependency on the same column.

## Instrumentation Gaps

### Normal telemetry needed

1. Import preflight summary should emit a structured line stating:
   - target environment
   - `provider_description_column_exists`
   - `rpc_upsert_function_exists`
   - importer version

2. Batch failure logs should classify SQL failures by schema object.
   - Example fields: `error_relation`, `error_column`, `write_mode`, `offset`, `batch_size`

### Debug telemetry needed

1. Optional debug dump of the exact schema capability checks run before write mode.
2. Optional debug SQL function fingerprint/version logging for `upsert_joinhalal_providers` so drift between repo and target DB is obvious.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
| --- | --- | --- | --- | --- |
| 1 | Whether the GitHub Actions target DB is production, staging, or another Supabase project with the same drift | No | Confirm which Supabase project the workflow points to | DevOps |
| 2 | Whether other RPC-touched columns also drift from the live `providers` schema | No | Compare live `providers` columns against the full migration 063 field list | DevOps / Analyst |
| 3 | Whether the live database function body matches repository migration 063 exactly | No | Inspect `pg_get_functiondef('public.upsert_joinhalal_providers'::regproc)` in the target DB | DevOps / Analyst |

## Analysis Recommendations

1. Confirm the live database schema capabilities before the next write run:
   - `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'providers' order by ordinal_position;`

2. Confirm the deployed RPC definition in the same environment:
   - `select pg_get_functiondef('public.upsert_joinhalal_providers'::regproc);`

3. Compare the live function body against repository migration 063 to see whether the drift is only `provider_description` or broader.

## Open Questions

1. Is GitHub Actions pointed at the same production database documented by migration 056, or at a separate environment with equivalent drift?
2. Was migration 063 applied directly to the target DB, or was the function created/edited manually outside migration history?
3. Do any current operators rely on `provider_description` being preserved during upsert, or is it already treated as non-authoritative everywhere?
