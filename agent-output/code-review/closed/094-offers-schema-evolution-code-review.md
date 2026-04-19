---
ID: 094
Origin: 094
UUID: b3e7a912
Status: Committed
---

# Code Review: Provider Catalog Schema Evolution (Migration 068)

**Plan Reference**: `agent-output/planning/094-offers-schema-evolution-plan.md`
**Implementation Reference**: `agent-output/implementation/094-offers-schema-evolution-implementation.md`
**ADR Reference**: `agent-output/architecture/094-offers-schema-adr.md`
**Date**: 2026-04-19
**Reviewer**: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-04-19 | Implementer → Code Reviewer | Review migration 068 implementation | Reviewed SQL migration, TDD test, and implementation artifact. Applied two fix-in-review corrections. Verdict: APPROVED. |

---

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Alignment Status**: ALIGNED

All 8 ADR-094 decision records are correctly implemented:

| Decision | ADR Requirement | Implementation | Status |
|----------|----------------|----------------|--------|
| D1 | Separate typed tables (`provider_menu_items` + `provider_service_offers`) | Two distinct `CREATE TABLE IF NOT EXISTS` statements with table-specific columns | ✅ ALIGNED |
| D2 | `GENERATED ALWAYS AS ... STORED` tsvector columns | Both tables use `search_vector TSVECTOR GENERATED ALWAYS AS (...) STORED` with `german` config | ✅ ALIGNED |
| D3 | `offer_tag_id` nullable bridge FK | `offer_tag_id UUID REFERENCES public.offers(offer_id) ON DELETE SET NULL` on both tables | ✅ ALIGNED |
| D4 | No JSONB for ordering-critical fields | `price_cents INTEGER`, `is_available BOOLEAN`, `duration_minutes INTEGER` are typed columns | ✅ ALIGNED |
| D5 | Global `offers` vocabulary NOT modified | Migration does not touch `offers` table or `providers.offers_ids[]` | ✅ ALIGNED |
| D6 | RLS pattern: owner subquery | 8 policies across both tables using `provider_id IN (SELECT ... WHERE provider_owner_id = auth.uid())` | ✅ ALIGNED |
| D7 | UNION ALL RPC with `item_type` discriminator | `search_provider_items` returns `'menu_item'` and `'service_offer'` via UNION ALL with CTE structure | ✅ ALIGNED |
| D8 | `provider_stats` MV extended with item counts | `menu_item_count` and `service_offer_count` BIGINT columns added; singleton UNIQUE index preserved | ✅ ALIGNED |

Notable additional quality decisions:

- `SECURITY INVOKER` on the RPC (not `SECURITY DEFINER`) — prevents privilege escalation; RLS is correctly enforced for callers
- `GREATEST(limit_count, 0)` and `GREATEST(offset_count, 0)` — defensive bounds against negative LIMIT/OFFSET injection
- Non-negative CHECK constraints on `price_cents` and `duration_minutes`
- `CASCADE` FK from `providers` — correct for tenant-scoped item ownership
- Partial index `WHERE is_available = true` on both tables — hot-path query optimization
- Explicit `idx_providers_owner_lookup` index on `providers(provider_owner_id)` — RLS subquery acceleration

---

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Red Phase Evidence**: `expected false to be true` at `existsSync(migrationPath)` — confirmed failing before implementation
**Green Phase Evidence**: 1 test passed after implementation

| Function/Class | Test File | Written First? | Failure Verified? | Pass After Impl? |
|---|---|---|---|---|
| Migration 068 SQL contract | `src/__tests__/migrations/068-provider-catalog-tdd.test.ts` | ✅ Yes | ✅ Yes | ✅ Yes |

**Concern**: Original test coverage was structurally valid but had insufficient ADR compliance assertions — see Finding M1 below (resolved via fix-in-review).

---

## Findings

### Critical
None.

### High
None.

### Medium

**[MEDIUM — FIX APPLIED] Testing: TDD contract test lacked ADR hard-gate assertions**

- **Location**: `src/__tests__/migrations/068-provider-catalog-tdd.test.ts`
- **Issue**: The original test verified structural existence (file present, table names, tsvector, function name, UNION ALL) but had no regression guards for the plan's hard gates:
  - D4: `price_cents INTEGER` and `is_available BOOLEAN` typed columns (no JSONB)
  - D6: `SECURITY INVOKER` on the RPC (no privilege escalation path)
  - RLS activation on new tables
  - D8: `provider_stats` stats extension presence
  If a future implementer changed `SECURITY INVOKER` to `SECURITY DEFINER`, or introduced JSONB for `price_cents`, the test would not catch the regression.
- **Fix applied**: Added 5 assertions to the existing test:
  ```typescript
  expect(sql).toMatch(/price_cents\s+INTEGER/);       // D4 typed column guard
  expect(sql).toMatch(/is_available\s+BOOLEAN/);      // D4 typed column guard
  expect(sql).toContain('SECURITY INVOKER');          // D6 no privilege escalation
  expect(sql).toContain('ENABLE ROW LEVEL SECURITY'); // RLS activation guard
  expect(sql).toContain('menu_item_count');            // D8 stats extension guard
  ```
- **Verification**: All 5 assertions confirmed present in migration file before adding.

**[MEDIUM — FIX APPLIED] Schema: `updated_at` auto-update trigger missing**

- **Location**: `supabase/migrations/068_provider_catalog_tables.sql`
- **Issue**: Both new tables declare `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` but had no `BEFORE UPDATE` trigger. This means `updated_at` would permanently reflect the INSERT timestamp after row creation — data drift on first UPDATE. The codebase has an established `update_updated_at_column()` helper (defined in migration 016, applied to `providers` in migration 062) that all mutable tables should use consistently. Skipping it here creates a silent inconsistency detectable only at runtime.
- **Fix applied**: Added section `2b) AUTO-UPDATE TRIGGERS` to migration 068 between the indexes and RLS sections:
  ```sql
  DROP TRIGGER IF EXISTS trigger_provider_menu_items_updated_at ON public.provider_menu_items;
  CREATE TRIGGER trigger_provider_menu_items_updated_at
    BEFORE UPDATE ON public.provider_menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS trigger_provider_service_offers_updated_at ON public.provider_service_offers;
  CREATE TRIGGER trigger_provider_service_offers_updated_at
    BEFORE UPDATE ON public.provider_service_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  ```
  Uses `DROP TRIGGER IF EXISTS` prefix to preserve idempotency claim.
- **Dependency**: `update_updated_at_column()` is defined as `CREATE OR REPLACE` in migration 016 (before 068 in the chain) — no new function needed.

### Low / Info

**[LOW] Schema: `booking_url TEXT` has no URL format validation**
- **Location**: `supabase/migrations/068_provider_catalog_tables.sql` — `provider_service_offers.booking_url`
- **Issue**: Accepts any text value. A CHECK constraint (e.g., `CHECK (booking_url IS NULL OR booking_url ~* '^https?://')`) would prevent obviously malformed entries.
- **Recommendation**: Track for UI-layer validation in the service offer creation form (out of scope for this migration). No action required before QA.

**[LOW] Schema: `price_currency TEXT` has no ISO 4217 CHECK constraint**
- **Location**: Both tables, `price_currency TEXT NOT NULL DEFAULT 'EUR'`
- **Issue**: Accepts any string. Application is EUR-primary so runtime risk is minimal.
- **Recommendation**: Consider `CHECK (price_currency IN ('EUR', 'USD', 'GBP', 'CHF'))` in a future patch if multi-currency support is added. No action required before QA.

**[INFO — POSITIVE] MV DROP + RECREATE approach is the correct PostgreSQL pattern**
- **Location**: `supabase/migrations/068_provider_catalog_tables.sql` — Section 5
- PostgreSQL does not support `ALTER MATERIALIZED VIEW ... ADD COLUMN`. The DROP + recreate approach with `IF NOT EXISTS` for the UNIQUE index is the canonical safe method for adding columns to an MV in a migration. The singleton UNIQUE index (`(true)`) is correctly preserved, keeping `REFRESH MATERIALIZED VIEW CONCURRENTLY` support intact.

**[INFO — POSITIVE] SECURITY INVOKER is the correct choice for this RPC**
- **Location**: `supabase/migrations/068_provider_catalog_tables.sql:L262`
- The function runs as the caller's role, ensuring RLS policies are evaluated for each caller. The public SELECT policy (`USING (true)`) means anonymous and authenticated users can call the RPC and see available items — consistent with how `search_offers` works. No privilege escalation risk.

---

## Positive Observations

1. **Idempotency discipline**: `IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DROP POLICY IF EXISTS` throughout — the migration can safely be re-run without side effects.
2. **Comment quality**: Section headers, table comments (`COMMENT ON TABLE`), and column comments (`COMMENT ON COLUMN`) are exemplary. The ADR cross-reference in the file header ties the SQL to its design authority.
3. **Search quality**: `btrim(COALESCE(search_query, ''))` protects against whitespace-only queries and NULLs; fallback ordering by `sort_order, name_de` for empty queries gives deterministic UX without requiring application-layer branching.
4. **Constraint coverage**: `CHECK (price_cents IS NULL OR price_cents >= 0)` and `CHECK (duration_minutes IS NULL OR duration_minutes >= 0)` prevent silent bad data at the DB layer.
5. **TDD red phase**: The implementer correctly opened the red gate on file existence (not an empty test), then progressively filled in the migration — proper TDD discipline.
6. **Backward compatibility preserved**: No modification to `offers`, `providers`, or any existing RPC. The migration is purely additive.

---

## Deployment Path Audit

- **No deployment surface changes**: `Dockerfile`, deploy scripts, `.github/workflows/`, nginx config, env vars — none modified.
- N/A per implementation doc (confirmed accurate).

---

## Verdict

**Status**: APPROVED
**Rationale**: All 8 ADR-094 design decisions are correctly implemented. No CRITICAL or HIGH findings. Two MEDIUM findings were both eligible for and resolved via fix-in-review:
1. TDD contract test strengthened with 5 ADR compliance assertions
2. `updated_at` auto-update triggers added to both tables (matching codebase pattern)

The remaining LOW findings are application-layer concerns that do not block QA. The SQL quality is high: correct idempotency, proper GIN indexes, SECURITY INVOKER, defensive bounds, and full RLS coverage.

## Files Modified by Fix-in-Review

| File | Change | Lines Added |
|------|--------|-------------|
| `supabase/migrations/068_provider_catalog_tables.sql` | Added section `2b) AUTO-UPDATE TRIGGERS` with 2 `DROP TRIGGER IF EXISTS` + 2 `CREATE TRIGGER` statements | +12 |
| `src/__tests__/migrations/068-provider-catalog-tdd.test.ts` | Added 5 ADR compliance assertions (D4 typed columns, D6 SECURITY INVOKER, RLS enablement, D8 stats extension) | +10 |

QA should re-run `npx vitest run src/__tests__/migrations/068-provider-catalog-tdd.test.ts` to confirm all new assertions pass (expected: 1 test, all assertions green).

## Required Actions Before QA

None blocking. QA may proceed immediately.

## Recommended QA Focus Areas

Per plan M4 (currently deferred due to migration 061 local DB issue):
1. Verify `search_provider_items` respects `is_available = true` filter
2. Verify RLS INSERT policy: authenticated owner can insert, non-owner cannot
3. Verify RLS DELETE policy: non-owner cannot delete another provider's items
4. Verify `provider_stats` `menu_item_count` / `service_offer_count` reflect correct row counts after MV refresh

## Next Steps

Handing off to qa agent for test execution.
