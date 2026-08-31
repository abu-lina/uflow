---
ID: 095
Origin: 095
UUID: a7c3e91f
Status: Active
---

# 095 — Unified Catalog Architecture: Architecture Findings

## Changelog

| Date              | Handoff   | Request                          | Summary                                                  |
| ----------------- | --------- | -------------------------------- | -------------------------------------------------------- |
| 2026-04-20T15:30Z | Architect | Pre-implementation review        | Plan 095 reviewed against ADR-094 and system-architecture |

---

## Verdict: APPROVED

Plan 095 is architecturally sound. It completes the three-section org→item hierarchy established by ADR-094 (Plan 094) and does so with disciplined pattern reuse. No architectural objections. Recommendations below are improvements, not blockers.

---

## Critical Review

### 1. Pattern Consistency with ADR-094

Plan 095's `community_projects` table follows the established ADR-094 pattern precisely:

| Structural Element         | 068 (`provider_menu_items`) | 069 (`community_projects`)      | Assessment |
| -------------------------- | --------------------------- | ------------------------------- | ---------- |
| PK                         | UUID `gen_random_uuid()`    | UUID `gen_random_uuid()`        | ✅ Match   |
| Parent FK                  | `providers(provider_id)`    | `community_services(community_service_id)` | ✅ Parallel |
| ON DELETE                  | CASCADE                     | CASCADE                         | ✅ Match   |
| `name_de` / `name_en`     | TEXT NOT NULL / TEXT         | TEXT NOT NULL / TEXT             | ✅ Match   |
| `description_de`           | TEXT                        | TEXT                            | ✅ Match   |
| `price_currency`           | TEXT NOT NULL DEFAULT 'EUR' | TEXT NOT NULL DEFAULT 'EUR'     | ✅ Match (D10) |
| `search_vector`            | STORED tsvector (german)    | STORED tsvector (german)        | ✅ Match   |
| `sort_order`               | INTEGER NOT NULL DEFAULT 0  | INTEGER NOT NULL DEFAULT 0      | ✅ Match   |
| `created_at` / `updated_at`| TIMESTAMPTZ NOT NULL DEFAULT now() | TIMESTAMPTZ NOT NULL DEFAULT now() | ✅ Match |
| `image_path`               | TEXT nullable               | TEXT nullable                   | ✅ Match   |
| Availability flag          | `is_available` BOOLEAN      | `is_active` BOOLEAN             | ⚠️ Intentional divergence (D9) — acceptable |
| GIN index on `search_vector`| Yes                        | Yes                             | ✅ Match   |
| Partial index (active/avail)| `WHERE is_available = true` | `WHERE is_active = true`       | ✅ Match   |
| RLS: public SELECT         | `USING (true)`              | `USING (true)`                  | ✅ Match   |
| RLS: owner writes          | 1-join to `providers`       | 2-join through `community_services` | ⚠️ Extra join — architecturally acceptable; index exists |
| `updated_at` trigger       | `update_updated_at_column()`| `update_updated_at_column()`    | ✅ Match   |

**Assessment**: The pattern is faithfully replicated with only two intentional, documented divergences. Both are well-justified in the Decision Record (D9 semantic naming, D7 ownership chain).

### 2. RLS Ownership Chain Depth

The 2-join RLS subquery path (`community_projects.community_service_id → community_services.provider_id → providers.provider_owner_id`) is one hop deeper than the 068 pattern. This is the primary architectural concern.

**Mitigations already in place**:
- `community_services.provider_id` has an index (migration 002: `idx_provider_community_services_community_service_id`)
- `providers.provider_owner_id` has an index (migration 068: `idx_providers_owner_lookup`)
- Migration-time diagnostic block (Assumption 8 / M-2 mitigation) catches NULL `provider_id` orgs

**Architect assessment**: Acceptable. The two-hop join is bounded by two indexed FK lookups. At current scale (< 5,000 DAU), this will be sub-millisecond. If performance degrades at scale, the established pattern would be to add a denormalized `owner_id` column to `community_projects` (materialized from the join) — but this is premature now.

### 3. Category Scoping (`applicable_section`)

Adding `applicable_section TEXT CHECK (...)` to `categories` is a clean, non-breaking extension. NULL semantics (legacy unscoped) are appropriate given the gradual backfill intent.

**One consideration**: The CHECK constraint uses a plain TEXT field with explicit value list (`'food', 'business', 'ummah', 'all'`). This is pragmatic (no new enum type to manage), but if the section list grows, the constraint must be ALTERed. Given the three-section model is a fundamental architectural boundary (not a frequently changing dimension), this is acceptable.

### 4. `provider_stats` MV Scope Creep (D8)

The plan correctly resolves D8 as Option A (extend `provider_stats`). This MV was originally provider-scoped but Plan 094 already added cross-table sub-selects for `menu_item_count` and `service_offer_count`. Adding `community_project_count` is consistent with established precedent.

**Tech debt flagged**: The name `provider_stats` no longer accurately describes its contents (it now includes community project counts). Rename to `platform_stats` is LOW priority but should be tracked. Added to Problem Areas below.

### 5. Three-Table Ordering FK Pattern (D4, D6)

The decision to use three separate item tables (no CTI base table, no polymorphic `catalog_items`) is the correct call for this codebase:

- **Three semantically distinct commerce verbs**: food cart, service booking, event ticket/donation
- **Different nullable column sets**: `allergens`/`is_halal` (food), `duration_minutes`/`booking_url` (services), `start_date`/`end_date`/`donation_goal_cents` (projects)
- **Independent evolution**: each table can add columns without affecting the others
- **Clean FK path for ordering**: `order_line_items.menu_item_id`, `.service_offer_id`, `.project_id` — each a separate nullable FK

This supersedes ADR-094/D7's open question about the polymorphic FK approach. The three-table pattern is now the settled architecture.

---

## Integration Requirements

1. **Migration 069 must DROP + re-CREATE `provider_stats` MV** — preserving all existing columns and adding `community_project_count`. The singleton unique index must be re-created for CONCURRENTLY refresh.
2. **`search_community_projects` RPC** must use SECURITY INVOKER (not DEFINER) — consistent with `search_provider_items` and all existing RPCs.
3. **The diagnostic `DO $$ ... $$` block** should execute BEFORE the table creation, not after — so that migration output surfaces unlinked orgs before any `community_projects` rows could theoretically be inserted.

---

## Alternatives Considered (for the record)

| Alternative                        | Why Rejected                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Add item columns directly to `community_services` | `community_services` is an org-level entity with production data; mixing org and item concerns violates SRP |
| Single `catalog_items` base table (CTI) | Three item types have < 50% column overlap in type-specific fields; CTI adds a base table join for every query with no benefit |
| JSONB item metadata on `community_services` | Ordering-critical fields (price, dates, availability) must be typed columns per ADR-094/D4; JSONB was already rejected for 068 |
| Defer until ordering system is built | Zero-cost window (068 tables are empty, production data is minimal) closes as data accumulates; schema is cheapest to extend now |

---

## ADR Updates for system-architecture.md

### New ADR to add:

**ADR-095: Three-Section Org→Item Catalog Hierarchy**

- **Status**: Accepted
- **Context**: Plan 094 established food (`provider_menu_items`) and business (`provider_service_offers`) item tables under `providers`. The ummah section (`community_services`) had no equivalent item table, creating an asymmetry in the three-section model (FOOD / UMMAH / STORES). Category scoping across sections was also missing.
- **Choice**: Add `community_projects` table under `community_services` (parallel to how 068 tables sit under `providers`). Add `categories.applicable_section` for cross-cutting section scoping. Maintain three separate item tables (no CTI base table) with the three-table ordering FK pattern for future Epic 4.2.
- **Alternatives**:
  - CTI base table `catalog_items` with type discriminator (rejected: < 50% type-specific column overlap, adds unnecessary base join)
  - Add item columns to `community_services` directly (rejected: mixes org and item concerns)
  - Defer until ordering system (rejected: zero-cost schema window closes as data accumulates)
- **Consequences**:
  - Completes three-section symmetry: every section has org→item hierarchy
  - Future ordering system has clean FK targets across all three sections
  - `provider_stats` MV becomes a platform-wide aggregation point (naming debt: should be `platform_stats`)
  - RLS write policies for ummah items require a 2-hop join (community_services→providers) — acceptable at current scale
- **Related**: ADR-094, Plan 095, Plan 094

### Problem Area to add:

**10. `provider_stats` naming drift**: MV name implies provider-only scope but now contains cross-entity counts (`menu_item_count`, `service_offer_count`, `community_project_count`). Rename to `platform_stats` in a future migration (breaking change for any dashboard queries referencing the MV name).

---

## Diagram Update

The system-architecture diagram should be updated to reflect the three-section catalog hierarchy after Plan 095 is implemented. No diagram update is needed at pre-implementation stage — update at DevOps Stage 2 (reconciliation).

---

## Verdict Summary

| Dimension              | Assessment                                                                    |
| ---------------------- | ----------------------------------------------------------------------------- |
| Pattern consistency    | ✅ Faithful replication of ADR-094 pattern with documented divergences         |
| Architectural fit      | ✅ Completes three-section symmetry — natural extension of existing design     |
| Security (RLS)         | ✅ Public read + owner write; 2-hop join is indexed and acceptable at scale   |
| Performance            | ✅ STORED tsvector, GIN + B-tree indexes, MV with CONCURRENTLY refresh        |
| Scalability            | ✅ No premature optimization; Postgres-first principle upheld                 |
| Backward compatibility | ✅ Zero modification to existing tables/RPCs; additive-only migration         |
| Technical debt         | ⚠️ LOW: `provider_stats` naming drift (tracked in Problem Areas)             |
| Ordering readiness     | ✅ Three-table FK pattern settles ADR-094/D7's open question                 |

**APPROVED** — no blocking concerns. Implementer may proceed.
