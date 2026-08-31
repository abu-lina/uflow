# ADR-095: Three-Section Org-to-Item Catalog Hierarchy

## Status
Accepted

## Changelog

| Date | Change | Context |
|------|--------|---------|
| 2026-04-20 | Initial draft | Session S094 - Plan 095 architectural authority |

## Origin
Plan #095 - Session S094-offers-schema

---

## Context

Plan 094 (ADR-094) introduced typed provider item tables:
- `provider_menu_items` (food)
- `provider_service_offers` (business)

This solved typed pricing/availability and item-level search for FOOD and STORES, but UMMAH remained asymmetric:
- UMMAH had org-level `community_services`
- No item-level table existed for events, donation campaigns, classes, or volunteer opportunities

A second gap existed in category assignment:
- `categories` had no section scoping
- FOOD/BUSINESS/UMMAH category dropdowns could leak cross-section values

At this point, Plan 068 tables are still effectively empty, which creates a low-cost window for additive schema alignment before ordering features (Epic 4.2) are implemented.

---

## Decision

Adopt a full three-section org-to-item hierarchy with explicit section-scoped categories.

### 1) Add `community_projects` under `community_services`

Create `public.community_projects` as UMMAH item-level entity with typed fields:
- `project_type` (`event`, `donation`, `class`, `volunteer`)
- `ticket_price_cents`, `donation_goal_cents`, `raised_cents`, `price_currency`
- `start_date`, `end_date`, `max_attendees`
- `is_active` lifecycle flag
- STORED tsvector `search_vector` with GIN index
- RLS owner-write/public-read policies via ownership chain:
  `community_projects.community_service_id -> community_services.provider_id -> providers.provider_owner_id`

### 2) Add `categories.applicable_section`

Add `applicable_section` with CHECK constraint:
- `food`, `business`, `ummah`, `all`
- nullable for legacy records

### 3) Keep separate item tables (no CTI base table)

Maintain three distinct item tables:
- `provider_menu_items`
- `provider_service_offers`
- `community_projects`

Do not introduce a polymorphic `catalog_items` base table.

### 4) Set ordering FK pattern authority

Future ordering (Epic 4.2) should reference concrete item tables directly with separate nullable FKs in line items, rather than a polymorphic base row.

### 5) Extend `provider_stats` (Option A)

Extend existing `provider_stats` MV with `community_project_count` to preserve the established singleton aggregation contract from ADR-094.

---

## Consequences

### Positive

- Completes FOOD/UMMAH/STORES symmetry: each section has org and item layers
- Preserves Postgres-first approach (typed columns, STORED tsvector, GIN, RLS)
- Keeps ordering-critical fields out of JSONB
- Enables future ordering integration without destructive migration
- Keeps migration additive and backward compatible

### Negative

- `provider_stats` naming drift increases (now includes non-provider entity counts)
- UMMAH write RLS uses a 2-hop ownership join (more complex than provider item policies)
- Requires operator follow-up for `community_services` rows with null `provider_id`

### Neutral

- `raised_cents` remains placeholder until ordering/payment workflow writes to it
- `is_active` naming differs from `is_available` but reflects project lifecycle semantics

---

## Alternatives Considered

1. Add item columns directly to `community_services`:
- Rejected: mixes org and item responsibilities, weakens model clarity

2. Create single polymorphic `catalog_items` table:
- Rejected: poor type-fit across food/service/project fields, higher null density, weaker constraints

3. Defer UMMAH item model until ordering implementation:
- Rejected: loses low-risk alignment window and increases later migration complexity

4. Create separate `community_stats` MV instead of extending `provider_stats`:
- Rejected: extra read surface and dashboard split; Option A is consistent with Plan 094 contract

---

## Related

- ADR-094: `agent-output/architecture/094-offers-schema-adr.md`
- Plan 095: `agent-output/planning/095-unified-catalog-architecture.md`
- Findings 095: `agent-output/architecture/095-unified-catalog-architecture-findings.md`
- Migration 069: `supabase/migrations/069_community_projects_category_scoping.sql`
