---
ID: 095
Origin: 095
UUID: a7c3e91f
Status: Committed
---

# Code Review 095 — Unified Catalog Architecture

**Plan Reference**: `agent-output/planning/095-unified-catalog-architecture.md`
**Implementation Reference**: `agent-output/implementation/095-unified-catalog-architecture-implementation.md`
**Date**: 2026-04-20
**Reviewer**: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-20 | Implementer → Code Reviewer | Review implementation of Plan 095 | Reviewed migration 069, TDD test, ADR-095. Verdict: APPROVED |

---

## Scope

Files reviewed per Implementation doc:

| File | Type | Reviewed |
|---|---|---|
| `supabase/migrations/069_community_projects_category_scoping.sql` | New | ✅ |
| `src/__tests__/migrations/069-community-projects-catalog-tdd.test.ts` | New | ✅ |
| `agent-output/architecture/095-unified-catalog-adr.md` | New | ✅ |
| `agent-output/planning/095-unified-catalog-architecture.md` | Modified (status/changelog) | ✅ |

Deployment-surface files (Dockerfile, workflows, deploy scripts, nginx): not modified — deployment path audit not triggered.

---

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Architect Findings**: `agent-output/architecture/095-unified-catalog-architecture-findings.md`
**Alignment Status**: ALIGNED

Migration 069 faithfully implements ADR-095 (Three-Section Org→Item Catalog Hierarchy), which was reviewed and approved by the Architect phase. All structural decisions are exercised correctly:

| ADR-095 Decision | Migration Implementation | Status |
|---|---|---|
| `community_projects` table with typed fields (no JSONB) | Section 2: CREATE TABLE with typed columns | ✅ |
| STORED tsvector + GIN index | Section 2: GENERATED ALWAYS AS STORED; Section 3: GIN index | ✅ |
| `is_active` lifecycle flag (D9 intentional divergence from `is_available`) | `is_active BOOLEAN NOT NULL DEFAULT true` | ✅ |
| 2-hop RLS ownership chain | Section 4: `community_service_id → community_services.provider_id → providers.provider_owner_id` | ✅ |
| `categories.applicable_section` with CHECK constraint | Section 1: ADD COLUMN + DO $$ guard + partial index | ✅ |
| `search_community_projects` SECURITY INVOKER | Section 5: `LANGUAGE sql SECURITY INVOKER` | ✅ |
| `provider_stats` Option A (extend existing MV) | Section 6: DROP + re-CREATE with `community_project_count` | ✅ |
| Pre-QA diagnostic block | Section 0: `DO $$ RAISE NOTICE $$ ` | ✅ |
| ADR-095 formal document | `agent-output/architecture/095-unified-catalog-adr.md` | ✅ |
| `system-architecture.md` updated | Confirmed (Architect phase, verified by grep) | ✅ |

---

## TDD Compliance Check

**TDD Table Present**: Yes — implementation doc includes milestone completion table
**Explicit Red-Phase Evidence**: Yes — documented as `existsSync(migrationPath)` failing before migration created
**Green Phase Evidence**: Yes — 1/1 test passes
**Regression Coverage**: Yes — 068+069 combined run (2/2)
**All Rows Complete**: Yes

---

## Idempotency Audit

Full idempotency sweep against the migration:

| Operation | Guard | Status |
|---|---|---|
| `DO $$ RAISE NOTICE` block (Section 0) | Re-runs on every migration (no DDL, no harm) | ✅ |
| `ALTER TABLE categories ADD COLUMN IF NOT EXISTS applicable_section` | `IF NOT EXISTS` | ✅ |
| `categories_applicable_section_check` CHECK constraint | `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint ...) $$` | ✅ |
| `CREATE INDEX IF NOT EXISTS idx_categories_applicable_section` | `IF NOT EXISTS` | ✅ |
| `CREATE TABLE IF NOT EXISTS community_projects` | `IF NOT EXISTS` (all inline constraints idempotent within) | ✅ |
| Indexes on `community_projects` (4 indexes) | `IF NOT EXISTS` on all | ✅ |
| `idx_community_services_provider_id` | `IF NOT EXISTS` | ✅ |
| `DROP TRIGGER IF EXISTS ... CREATE TRIGGER` | `DROP IF EXISTS` before CREATE | ✅ |
| `ALTER TABLE community_projects ENABLE ROW LEVEL SECURITY` | Postgres no-op if already enabled | ✅ |
| `DROP POLICY IF EXISTS` × 4 | `IF EXISTS` on all drops | ✅ |
| `CREATE OR REPLACE FUNCTION search_community_projects` | `CREATE OR REPLACE` | ✅ |
| `DROP MATERIALIZED VIEW IF EXISTS provider_stats` | `IF EXISTS` | ✅ |
| `CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_stats_singleton` | `IF NOT EXISTS` | ✅ |

Complete idempotency confirmed. No DDL statement will fail on a re-run.

---

## Security Review

| Check | Result | Notes |
|---|---|---|
| RLS enabled on `community_projects` | ✅ | `ENABLE ROW LEVEL SECURITY` present |
| Owner INSERT checks ownership | ✅ | `WITH CHECK (community_service_id IN (...))` — no `USING` on INSERT (correct) |
| Owner UPDATE checks both USING and WITH CHECK | ✅ | Same expression on both — prevents row hijack |
| Owner DELETE checks USING | ✅ | Correct for DELETE (no WITH CHECK needed) |
| Public SELECT unrestricted | ✅ | `USING (true)` — correct, all catalog items are publicly browsable |
| RPC uses SECURITY INVOKER | ✅ | Caller's RLS context applies, not function owner's |
| No hardcoded credentials | ✅ | None present |
| No SQL injection vectors | ✅ | Parameters passed directly to `plainto_tsquery` and equality filters in LANGUAGE sql function — no string concatenation |
| `auth.uid()` used for ownership check | ✅ | Standard Supabase pattern |

**Security: PASS**

---

## Constraint Coverage

| Constraint | Rule | Status |
|---|---|---|
| `community_projects_project_type_check` | `IN ('event', 'donation', 'class', 'volunteer')` | ✅ |
| `community_projects_ticket_price_non_negative` | `IS NULL OR ticket_price_cents >= 0` | ✅ |
| `community_projects_donation_goal_non_negative` | `IS NULL OR donation_goal_cents >= 0` | ✅ |
| `community_projects_raised_non_negative` | `raised_cents >= 0` (not nullable, NOT NULL DEFAULT 0) | ✅ |
| `community_projects_max_attendees_positive` | `IS NULL OR max_attendees > 0` (> 0 is correct: 0 attendees is meaningless) | ✅ |
| `community_projects_date_order_check` | `end_date IS NULL OR start_date IS NULL OR end_date >= start_date` | ✅ |
| `categories_applicable_section_check` | `IN ('food', 'business', 'ummah', 'all')` — NULL allowed (legacy) | ✅ |

All domain rules captured in database-enforced constraints. No application-only validation for invariants.

---

## `provider_stats` MV Extension Audit

Column preservation check (068 → 069):

| Column | In 068 | In 069 | Status |
|---|---|---|---|
| `total_providers` | ✅ | ✅ | Preserved |
| `approved_count` | ✅ | ✅ | Preserved |
| `pending_count` | ✅ | ✅ | Preserved |
| `needs_revision_count` | ✅ | ✅ | Preserved |
| `new_this_month` | ✅ | ✅ | Preserved |
| `avg_age_seconds` | ✅ | ✅ | Preserved |
| `menu_item_count` | ✅ | ✅ | Preserved |
| `service_offer_count` | ✅ | ✅ | Preserved |
| `community_project_count` | — | ✅ | **New (D8)** |

All 8 existing columns preserved exactly. Contract integrity maintained. ✅

---

## M1–M4 Acceptance Criteria

### M1: `community_projects` table

| Acceptance Criteria | Status |
|---|---|
| Table is idempotent (`CREATE TABLE IF NOT EXISTS`) | ✅ |
| RLS is enabled and all four policies exist | ✅ |
| Indexes match the pattern established in 068 | ✅ (FK B-tree, GIN, partial active, type B-tree) |
| `search_vector` is STORED (not computed at query time) | ✅ |
| FK cascade on delete matches 068 pattern | ✅ (`ON DELETE CASCADE`) |
| Migration-time diagnostic block present | ✅ (Section 0) |

### M2: `categories.applicable_section`

| Acceptance Criteria | Status |
|---|---|
| Column is nullable (no backfill required) | ✅ (no NOT NULL, no DEFAULT) |
| CHECK constraint prevents invalid values | ✅ |
| No existing data modified | ✅ (additive column only) |

### M3: `search_community_projects` RPC

| Acceptance Criteria | Status |
|---|---|
| Empty query returns all active projects by sort_order | ✅ (CASE WHEN '' THEN sort_order) |
| Text search uses GIN index on search_vector | ✅ (`search_vector @@ plainto_tsquery`) |
| `SECURITY INVOKER` | ✅ |
| Filters compose correctly | ✅ (type + service + text + active_only) |
| Return type includes `image_path` (L-5 fix) | ✅ |

### M4: Stats Extension

| Acceptance Criteria | Status |
|---|---|
| `community_project_count` column exists | ✅ |
| MV can be refreshed CONCURRENTLY (singleton index exists) | ✅ (`idx_provider_stats_singleton`) |
| All pre-existing columns preserved unchanged | ✅ (verified above) |

---

## Findings

### Critical
None.

### High
None.

### Medium
None.

### Low

**[LOW] Documentation**: Plan note incorrectly attributes `community_services.provider_id` index to migration 002
- **Location**: `agent-output/planning/095-unified-catalog-architecture.md` (line ~185)
- **Issue**: The plan states "An index on `community_services.provider_id` (already exists from migration 002) covers the intermediate join." However, migration 002 only creates indexes on `provider_community_services.provider_id` (a junction table), not on `community_services.provider_id`. No index on `community_services.provider_id` existed before migration 069.
- **Impact**: Zero — the migration correctly creates the index regardless (`CREATE INDEX IF NOT EXISTS idx_community_services_provider_id`). A misleading comment in the plan doc only.
- **Recommendation**: Note for future maintainers. No code change required; the migration is correct. Plan is now `In Progress` and will be closed by DevOps — no amendment needed.
- **Disposition**: Risk accepted. Implementation is correct; documentation artefact only.

### Info

**[INFO] Schema placeholder `raised_cents` has no database-level write guard**
- **Location**: `supabase/migrations/069_community_projects_category_scoping.sql` — `community_projects.raised_cents`
- **Issue**: Per D11, `raised_cents` is reserved for Epic 4.2 (ordering/payment). Authenticated owners can currently write any non-negative value to this field via INSERT/UPDATE. There is no trigger or check preventing this.
- **Why acceptable**: D11 explicitly documents this as intentional placeholder behaviour. Only authenticated owners can write (RLS-enforced). Zero real risk at current DAU. Epic 4.2 will own the write guard when implementing the payment flow.
- **Disposition**: Accepted per D11. FYI only.

**[INFO] TDD uses a single `it()` block with 11 assertions**
- **Location**: `src/__tests__/migrations/069-community-projects-catalog-tdd.test.ts`
- **Issue**: All assertions are in one `it('creates migration 069 and ADR-095 ...')` block. If assertion 3 fails, assertions 4-13 are not evaluated.
- **Why acceptable**: Consistent with migration 068 test pattern (`src/__tests__/migrations/068-provider-catalog-tdd.test.ts`). For contract tests asserting SQL file contents, a single block is acceptable — these are file-level existence/contents gates, not independent behaviour scenarios.
- **Disposition**: Accepted as consistent with established pattern.

---

## Positive Observations

1. **Exemplary idempotency discipline** — every DDL operation is guarded. The `DO $$` block for the CHECK constraint is the correct approach for Postgres constraint additions (no `ADD CONSTRAINT IF NOT EXISTS` for CHECK constraints in Postgres).

2. **RLS ownership chain is watertight** — UPDATE policy correctly applies both `USING` (which rows can be targeted) and `WITH CHECK` (what the new row state can be), preventing row-level ownership hijack. This matches the 068 pattern exactly and demonstrates deliberate security thinking.

3. **GREATEST() on limit/offset** — prevents negative values from being passed to LIMIT/OFFSET. Defensive SQL consistent with 068's `search_provider_items`. Good practice against unexpected caller behaviour.

4. **Pre-QA diagnostic block (Section 0)** — the RAISE NOTICE for unlinked `community_services` rows is well-scoped: it runs during migration, is non-blocking, and directly addresses the M-2 critique finding (RLS ownership gap). Excellent cross-phase thinking.

5. **Constraint coverage is comprehensive** — 6 table-level constraints on `community_projects` catch all domain invariants at the database layer, not just application layer.

6. **Migration section headers** — clear `-- N) SECTION NAME` headers make the migration readable and maintainable.

---

## Verdict

**Status**: APPROVED
**Rationale**: No critical, high, or medium findings. Implementation is a faithful, correct, and secure instantiation of ADR-095 and ADR-094/Pattern C. All M1–M4 acceptance criteria are satisfied. Idempotency is complete. Security patterns (RLS, SECURITY INVOKER, constraint enforcement) match the established 068 baseline. One LOW documentation note in the plan (not in the migration) with zero runtime impact. TDD red-green cycle executed correctly.

---

## Required Actions

None. No fixes required before QA.

---

## Plan Status Update

Updated plan status: `In Progress` → `Code Review Approved` (see below).

---

## Next Steps

Handing off to qa agent for test execution.

QA focus areas:
- RLS write-policy enforcement: authenticated owner can INSERT/UPDATE/DELETE their own projects; non-owner cannot
- `search_community_projects` RPC: empty query → all active by sort_order; text query → ranked results; type/service/active filters compose correctly
- CHECK constraint enforcement: invalid `project_type`, negative prices, end_date < start_date should all be rejected
- `provider_stats` MV refresh: CONCURRENTLY succeeds and `community_project_count` reflects current `is_active = true` rows
- `categories.applicable_section`: invalid values rejected; NULL accepted for legacy rows
- FK cascade: deleting a `community_service` deletes its `community_projects`
- Deferred: local DB runtime and EXPLAIN blocked by migration 061 drift (pre-existing, same deferral as Plan 094 QA)
