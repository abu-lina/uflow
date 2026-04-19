---
ID: 094
Origin: 094
UUID: b3e7a912
Status: Resolved
---

# Critique 094: Provider Catalog Schema Evolution Plan Review

**Artifact**: `agent-output/planning/094-offers-schema-evolution-plan.md`  
**Analysis**: N/A (no separate analysis document)  
**Design Authority**: `agent-output/architecture/094-offers-schema-adr.md` (ADR-094)  
**Date**: 2026-04-19T18:45Z  
**Status**: Initial Review  

---

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-19T18:45Z | Planner → Critic | Review plan against ADR-094; verify 8 decision records addressed; confirm JSONB hard gate and RLS gate requirements | Initial critique — comprehensive ADR alignment check |

---

## Value Statement Assessment

**Finding**: ✅ **PASS** — Exemplary value statement structure

The plan presents **two complementary value statements**:

**Primary (Provider perspective)**:
> As a food provider or business service provider on UFlow, I want to publish a provider-specific catalog of my items and services with prices, photos, and availability, so that seekers can browse exactly what I offer before visiting or booking.

**Secondary (Engineering perspective)**:
> As a UFlow platform engineer, I want a type-safe, searchable, ordering-ready schema for per-provider catalog items, so that future consumer ordering (Epic 4.2) can be added without a destructive schema migration.

**Why this is strong**:
- Primary user outcome is clear and measurable: catalog items enable browsing before visit/booking
- Engineering constraint (ordering-ready schema) is surfaced as a secondary story rather than hidden in implementation details
- Aligns with **Epic 2.3** (Enhanced Provider Profiles) — catalog items are the schema foundation for rich media profiles
- Aligns with **Epic 4.2** (Simple Booking System) — `price_cents`, `duration_minutes`, `is_available` are ordering prerequisites
- Direct value delivery: No deferrals. Provider catalogs are usable immediately after migration (pending UI work in a separate plan).

**Master Product Objective alignment**: UFlow's mission is to make halal businesses easily discoverable. Provider-specific catalog items (menu with prices, service duration/booking) directly support this by making offerings **transparent and browsable** — core to the trust-first strategy.

---

## Overview

Plan 094 introduces two new typed catalog tables (`provider_menu_items` for food providers, `provider_service_offers` for business services) to replace the semantic mismatch of the current `offers` vocabulary table. The plan is **schema-only** (5 milestones: M1 tables+RLS, M2 search RPC, M3 stats MV, M4 performance gate, M5 version artifacts). UI work is explicitly deferred to a future plan.

**Design authority**: ADR-094 (Architect-approved, Pattern C: Separate Typed Instance Tables with Vocabulary Bridge)

**Scope clarity**: Excellent. The plan explicitly states "The Implementer MUST NOT create UI or API route changes unless explicitly added to a milestone." Schema migration only.

**Pipeline**: Full (Planner → Critic → Implementer → QA → UAT → DevOps)

---

## Architectural Alignment

### ADR-094 Decision Record Mapping

All **8 decision records** from ADR-094 are explicitly addressed in the plan's Decision Record table:

| ADR Decision | Plan Decision | Mapped Correctly? |
|--------------|---------------|-------------------|
| D1: Separate typed tables (not STI/JSONB) | Plan D1 — Pattern C rationale | ✅ Yes |
| D2: STORED tsvector generated column | Plan D2 — avoids per-query recomputation | ✅ Yes |
| D3: `offer_tag_id` nullable bridge FK | Plan D3 — preserves backward-compat vocabulary search | ✅ Yes |
| D4: No JSONB for `price_cents`, `is_available` | Plan D4 — "JSONB unacceptable for cart/order logic" | ✅ Yes + **hard gate** |
| D5: Global `offers` table preserved | Plan D5 — "Zero-impact preservation" | ✅ Yes |
| D6: RLS pattern (`provider_id IN (SELECT ...)`) | Plan D6 — mirrors existing provider RLS | ✅ Yes |
| D7: `search_provider_items` UNION ALL | Plan D7 — single searchable surface with `item_type` discriminator | ✅ Yes |
| D8: `provider_stats` MV extension | Plan D8 — `menu_item_count` + `service_offer_count` | ✅ Yes |

**Verdict**: Perfect alignment. All architectural decisions are carried forward with rationale intact.

### Consistency with Existing Architecture

- **Migration 067** (`listing_type` enum): Plan correctly references this as the discriminator that determines which catalog table is relevant per provider (food vs business).
- **Migration 014** (`search_offers` RPC + GIN indexes): Plan explicitly preserves this as-is per ADR D5. No regression risk.
- **Migration 055** (`provider_stats` MV): Plan extends (not replaces) with `menu_item_count` + `service_offer_count`. M3 gives Implementer flexibility to split into migration 069 if refresh complexity warrants it.
- **Migration 011** (provider performance indexes): Plan M4 references `providers(provider_owner_id)` index check before finalizing RLS policy — good defensive awareness.

**Verdict**: The plan respects all existing architectural constraints and builds incrementally on proven patterns.

---

## Scope Assessment

**Boundaries**: ✅ **Crisp and defensible**

**In scope**:
- Migration 068 (or 068+069): tables, indexes, RLS policies, search RPC, stats MV extension
- RLS performance validation (M4 gate)
- Version artifacts (CHANGELOG, package.json)

**Out of scope** (explicitly deferred):
- UI for adding/editing catalog items (separate plan)
- API route changes (separate plan)
- Consumer ordering (Epic 4.2 — ADR-097 ordering ADR)
- Item-level search UI integration (separate plan post-M2)

**Rationale for deferral**: Schema must land before UI can be built. Deferral is **sequencing**, not avoidance. The plan delivers the data layer as a coherent, testable unit.

**Debt introduced**: None. The new tables are additive (no modification to existing `offers` table). Rollback is clean (DROP TABLE, revert MV).

---

## Technical Debt Risks

### Risk 1: Dual Indexing Cost (Low)

**Issue**: `name_de`/`name_en` will be indexed in both the vocabulary `offers` table AND the new instance tables (`provider_menu_items`, `provider_service_offers`). ADR-094 acknowledges "small storage overhead, acceptable until DAU > 50,000."

**Mitigation in plan**: None explicitly stated.

**Recommendation**: LOW finding. Add a monitoring checkpoint in the plan: "If combined catalog item count exceeds 100k rows, evaluate GIN index bloat and consider partial indexes on frequently-queried subsets."

**Status**: OPEN (LOW)

---

### Risk 2: Materialized View Refresh Downtime (Medium)

**Issue**: `provider_stats` MV extension (M3) may require a `REFRESH MATERIALIZED VIEW CONCURRENTLY` operation. If the current MV definition does not have a UNIQUE index, CONCURRENTLY will fail, requiring downtime.

**Mitigation in plan**: 
- "Use `REFRESH MATERIALIZED VIEW CONCURRENTLY`; isolate to migration 069 if needed" (Risks table)
- M3 gives Implementer discretion to split into migration 069 if complexity warrants

**Recommendation**: The plan correctly identifies the risk and delegates implementation strategy to the Implementer based on inspection of migration 055. This is appropriate — Critic cannot dictate SQL without inspecting the existing MV definition.

**Status**: RESOLVED (mitigated by Implementer discretion + rollback procedure)

---

### Risk 3: RLS Policy Performance Regression (Medium → Mitigated)

**Issue**: The `provider_id IN (SELECT ...)` subquery pattern could cause sequential scans on the `providers` table if `provider_owner_id` is not indexed.

**Mitigation in plan**:
- M4 **dedicated milestone** for RLS performance validation with `EXPLAIN (ANALYZE, BUFFERS)` evidence required before QA sign-off
- Plan references migration 011 (provider performance indexes) and requires Implementer to confirm `providers(provider_owner_id)` index exists
- If seq scan found, remediation required: add index OR refactor to `SECURITY DEFINER` helper function

**Recommendation**: Excellent defensive depth. M4 is a **hard gate** — QA cannot sign off without this evidence.

**Status**: RESOLVED (M4 gate + explicit remediation path)

---

## Findings

### Critical Findings

**None**. No blocking issues identified.

---

### Medium Findings

**None**. All medium-severity risks are mitigated by explicit plan gates (M4 performance validation, Implementer discretion on MV refresh strategy).

---

### Low Findings

#### Finding L1: GIN Index Bloat Monitoring Checkpoint Missing

**Issue**: ADR-094 acknowledges dual indexing cost ("acceptable until DAU > 50,000"). The plan does not include a monitoring checkpoint or bloat threshold.

**Impact**: If catalog items grow to 100k+ rows without monitoring, GIN index maintenance (autovacuum) could degrade write performance without visibility.

**Status**: OPEN

**Recommendation**: Add to M3 acceptance criteria or Observability section: "Document GIN index size baseline post-migration. Add monitoring alert if combined `provider_menu_items` + `provider_service_offers` row count exceeds 50k."

---

#### Finding L2: Open Questions All Resolved — Process Compliance ✅

**Issue**: Plan has 3 open questions, all marked `[RESOLVED]` with clear decisions.

**Process check**: Per Critic mode instructions, "If any decisions are marked `[DEFERRED: ...]`, require explicit user acknowledgement." None are deferred — all resolved.

**Impact**: None. Process compliance confirmed.

**Status**: RESOLVED

---

#### Finding L3: Duration Estimates Present and Realistic

**Issue**: Plan includes duration estimates (total ~8–13h elapsed). Primary uncertainty is `provider_stats` MV complexity (+1–2h if CONCURRENTLY isolation required).

**Process check**: Per Process Improvement PI 004, plans MUST include duration estimates. ✅ Compliant.

**Impact**: None. Estimates are conservative and account for uncertainty.

**Status**: RESOLVED

---

## Questions for Planner

**None**. The plan is comprehensive and all open questions are resolved.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Status |
|------|------------|--------|-------------------|
| RLS policy causes seq scan | Low | High | ✅ Mitigated by M4 gate |
| MV refresh requires downtime | Low | Medium | ✅ Mitigated by CONCURRENTLY guidance + 069 split option |
| Migration numbering conflict | Low | Low | ✅ Mitigated by git pull requirement |
| JSONB used for `price_cents` | Very Low | Critical | ✅ Mitigated by **hard gate** in M1 + Validation Checklist |
| GIN index bloat (50k+ rows) | Low | Low | ⚠️ Not addressed (Finding L1) |

**Overall risk posture**: Low. The plan has excellent defensive depth with explicit gates at critical points (M4 RLS performance, JSONB hard gate, idempotent migrations).

---

## Recommendations

### For Implementer

1. **Before writing any SQL**: Read ADR-094 in full (as stated in Handoff Notes — confirmed).
2. **Migration 055 inspection**: Determine if `provider_stats` MV has a UNIQUE index (required for CONCURRENTLY). If not, split stats extension into migration 069 with downtime window coordination.
3. **RLS performance baseline**: Seed at least 100 provider rows in local Supabase before running `EXPLAIN (ANALYZE, BUFFERS)` on the INSERT policy. Attach output to implementation artifact.
4. **JSONB guard**: If Implementer is tempted to use JSONB for `price_cents` or `is_available` for "flexibility," re-read ADR-094 D4 rationale. This is a **hard gate** — Critic will reject.

### For QA

1. **RLS negative tests are mandatory**: Per Testing Strategy, "Every new RLS policy must have at least one positive (allowed) and one negative (denied) test case." Do not sign off without these.
2. **M4 gate evidence required**: The `EXPLAIN (ANALYZE, BUFFERS)` output must be attached. If missing, reject and return to Implementer.
3. **Empty query test**: `search_provider_items('')` must return items ordered by `sort_order, name_de` (per M2 acceptance criteria). Verify this explicitly.

### For UAT

1. **Schema-only verification**: No UI in scope. UAT should confirm:
   - Both tables exist in staging with correct column types
   - `search_provider_items` RPC returns correct `item_type` discriminator
   - Rollback procedure documented and tested in staging before production deploy
2. **Was? vocabulary search unaffected**: Confirm existing `search_offers` RPC still works as before (baseline captured in Baseline and Measurements section).

---

## Revision History

### Initial Review (2026-04-19T18:45Z)

**Artifact changes**: N/A (initial review)

**Findings addressed**: N/A

**New findings**:
- L1: GIN index bloat monitoring checkpoint missing (LOW)
- L2: Open questions resolved — process compliant (RESOLVED)
- L3: Duration estimates present and realistic (RESOLVED)

**Status changes**: Status set to OPEN pending Planner acknowledgement of Finding L1.

---

## Hard Gate Compliance

Per ADR-094 verdict, the Critic MUST enforce:

| Hard Gate | Plan Compliance | Evidence |
|-----------|-----------------|----------|
| No JSONB for `price_cents` / `is_available` | ✅ **PASS** | M1 AC: "price_cents and is_available are typed columns — **no JSONB for these fields** (Critic hard gate)" + Validation Checklist repeats this |
| RLS performance validation (`EXPLAIN ANALYZE`) | ✅ **PASS** | M4 dedicated milestone with acceptance criteria requiring evidence attachment |
| Provider stats MV extension | ✅ **PASS** | M3 milestone + Implementer discretion on 068 vs 069 split |
| Migration 068 scope completeness | ✅ **PASS** | M1+M2+M3 cover tables, RLS, RPC, and stats — all components from ADR-094 verdict |

**Verdict**: All 4 hard gates from ADR-094 are explicitly addressed in the plan with clear acceptance criteria.

---

## Critic Verdict

**Status**: ✅ **APPROVED_WITH_MINOR_RECOMMENDATION**

**Rationale**:
- All 8 ADR-094 decision records mapped correctly
- Value statement is exemplary (primary + engineering perspectives)
- Scope is crisp, bounded, and defensible (schema only)
- All 4 hard gates from ADR-094 verdict are addressed with clear acceptance criteria
- M4 RLS performance gate provides excellent defensive depth
- Testing strategy is comprehensive (SQL integration, RLS enforcement, MV accuracy)
- Rollback procedure documented and safe (additive migration, no modification to existing tables)
- Duration estimates present and realistic
- Risk mitigation strategies are appropriate and explicit

**Minor recommendation (Finding L1)**: Add GIN index bloat monitoring checkpoint to M3 or Observability section. This is a **LOW finding** and does not block approval — defer to Planner discretion on whether to address now or in a post-deployment monitoring ticket.

**Unresolved blockers**: None.

**Approval conditions**: Implementer MUST read ADR-094 in full before writing SQL (per Handoff Notes). QA MUST NOT sign off without M4 `EXPLAIN ANALYZE` evidence.

---

## Next Steps

1. **Planner** (optional): Address Finding L1 (GIN index bloat checkpoint) or defer to post-deployment monitoring ticket.
2. **Implementer**: Proceed with implementation per ADR-094 + Plan 094 milestones. Read ADR-094 in full before writing any SQL.
3. **Critic**: Close this critique when all findings are RESOLVED or DEFERRED with downstream owner.

---

**Critique complete.** Plan 094 is **approved for implementation** with the recommendation above.
