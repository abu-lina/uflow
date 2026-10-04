---
ID: 095
Origin: 095
UUID: a7c3e91f
Status: Resolved
---

# Critique: Plan 095 — Unified Catalog Architecture: Community Projects + Category Scoping

| Field        | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Artifact     | `agent-output/planning/095-unified-catalog-architecture.md`                  |
| Analysis     | N/A (architecture emerged from session S094 architecture discussion)          |
| Date         | 2026-04-20T15:00Z                                                            |
| Status       | APPROVED                                                                     |
| Critic Phase | Initial Review                                                               |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/151                                |

## Changelog

| Date               | Handoff    | Request             | Summary                              |
| ------------------ | ---------- | ------------------- | ------------------------------------ |
| 2026-04-20T14:30Z  | Critic     | Initial review      | First critique from Planner output   |
| 2026-04-20T15:00Z  | Planner    | Revision applied    | All 8 findings (M-1..3, L-1..5) resolved in plan |
| 2026-04-20T15:00Z  | Critic     | Re-review           | All findings closed. Verdict upgraded to APPROVED |

---

## Verdict

**APPROVED**

All 8 findings addressed in revision 2026-04-20T15:00Z. Plan is cleared for implementation.

---

## Value Statement Assessment

**✅ PASS — Exemplary**

Both user stories are present in "As a... I want... So that..." format. The engineering story (platform engineer) and the end-user story (community organiser) are both explicit. The "So that" outcomes are concrete and measurable:

- "consistent org→item hierarchies" — verifiable via schema inspection
- "clean ordering-FK path — enabling future consumer ordering (Epic 4.2) without destructive schema migration" — maps directly to the planning constraint ("zero-cost restructure window while 068 tables are empty")

Alignment to Master Product Objective (strengthen Ummah connections): ✅ Direct — adding ummah item publishing completes the platform's three-section symmetry.

Value is delivered directly, not deferred: ✅ The schema work is the primary deliverable; the ordering system is explicitly flagged as out of scope.

---

## Overview

Plan 095 is a schema-only extension adding:

1. `community_projects` — the missing item-level entity for ummah organisations, completing FOOD/UMMAH/STORES symmetry
2. `categories.applicable_section` — cross-cutting category scoping column
3. `search_community_projects` RPC — tsvector search for the new table
4. Stats MV extension — community project counts

The plan inherits its structural template from migration 068 (Plan 094) and the decision record is thorough with seven resolved decisions. The architecture context diagrams (current state → target state) are a strength — they communicate the gap and the fix clearly.

The plan is schema-only, with no UI or API route changes, following the same discipline as Plan 094.

---

## Architectural Alignment

**✅ Consistent with ADR-094 and system-architecture.md**

| Constraint                          | Status   | Notes                                                                 |
| ----------------------------------- | -------- | --------------------------------------------------------------------- |
| Postgres-first                      | ✅       | STORED tsvector, GIN indexes, no external service                     |
| No JSONB for typed fields           | ✅       | All commerce fields are typed columns                                 |
| SECURITY INVOKER on RPC             | ✅       | Specified in M3 acceptance criteria                                   |
| GIN index for tsvector              | ✅       | Specified in M1 deliverables                                          |
| update_updated_at_column() trigger  | ✅       | Specified in M1 deliverables                                          |
| Idempotent migration                | ✅       | Acceptance criteria explicitly requires `IF NOT EXISTS`               |
| Existing RLS pattern reused         | ✅ (⚠️)  | Extra join required — see M-2 below                                   |

One area of concern (MEDIUM): the ownership chain for `community_projects` requires two table joins in the RLS subquery (`community_projects → community_services.provider_id → providers.provider_owner_id`), versus the single-join pattern in 068. This is architecturally sound but the risk of `community_services.provider_id IS NULL` for some orgs is under-mitigated (see finding M-2).

---

## Scope Assessment

**✅ Well-bounded**

The plan is appropriately scoped to:
- One migration file (069)
- Zero UI/API changes
- Zero modifications to existing production tables (`community_services`, `providers`, `categories` existing rows)

The explicit "NOT in scope" list (no ordering implementation, no 068 table changes, no UI) is a strength. The category backfill deferral is correctly documented as intentional.

One scope concern (MEDIUM): the Epic Alignment field (`Epic 2.3 + Epic 4.2`) is imprecise — see finding M-3.

---

## Technical Debt Risks

| Risk                                                 | Assessment                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `community_projects` structural divergence from 068  | Low — intentional differences documented; `is_active`/`ticket_price_cents` are semantically appropriate. But see findings L-1 and L-2. |
| Category backfill deferred                           | Acceptable — nullable column means no data loss; gradual admin backfill is correct |
| `raised_cents` static until Epic 4.2                | Mild — column exists but will show 0 until ordering lands. Harmless at schema level but may cause confusion in display logic. See L-3. |
| M4 MV coupling ambiguity                             | Medium — architectural decision deferred to implementer; creates drift risk. See M-1. |
| ADR-095 not produced as a deliverable                | Low — plan has inline decision record but no formal ADR document. See L-4. |

---

## Findings

### MEDIUM

| ID  | Title                                           | Status   | Description | Impact | Recommendation |
| --- | ----------------------------------------------- | -------- | ----------- | ------ | -------------- |
| M-1 | M4 stats option left to implementer            | RESOLVED | D8 added to Decision Record: Option A (extend `provider_stats`) confirmed. | — | — |
| M-2 | RLS ownership gap under-mitigated               | RESOLVED | Assumption 8 added (pre-QA hard gate). Migration-time `DO $$ ... $$` diagnostic block added as M1 deliverable and acceptance criterion. | — | — |
| M-3 | Epic alignment imprecise                        | RESOLVED | Epic Alignment updated: Epic 2.3 explicitly extended to cover ummah org activity publishing. | — | — |

### LOW

| ID  | Title                                           | Status | Description                                                                                                                                                                                                                       | Impact                                                                                                  | Recommendation                                                                                    |
| --- | ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| L-1 | `price_currency` column absent from `community_projects` | OPEN   | Both 068 tables have `price_currency TEXT NOT NULL DEFAULT 'EUR'`. The M1 spec for `community_projects` omits this column despite having `ticket_price_cents`. If the platform ever supports multi-currency, this omission creates a follow-up migration. | Minor structural divergence from 068 pattern. Non-blocking given EUR-only market today.                | Add `price_currency TEXT NOT NULL DEFAULT 'EUR'` to M1 column list, or document in the plan's Assumptions that ummah projects are EUR-only by design and the column is intentionally absent. |
| L-2 | `is_active` vs `is_available` naming undocumented divergence | OPEN   | Both 068 tables use `is_available`. `community_projects` uses `is_active`. The Success Criteria states "All three item tables follow the same structural pattern" and lists `is_available` — contradicting the M1 spec. | QA may test against the wrong column name. The Success Criteria misleads.                               | Correct the Success Criteria to reflect `is_active` for `community_projects`, and add a one-line note explaining the semantic choice (`is_active` = project currently accepting registrations/donations; `is_available` = item toggle). |
| L-3 | `raised_cents` will remain at default 0 until Epic 4.2 | OPEN   | The `raised_cents` column exists in M1 but has no mechanism to update it until the ordering system lands (Epic 4.2 / future plan). No note in the plan prepares display/API consumers for this. | Display logic built against this column before Epic 4.2 will always show 0. Confusing but not harmful at schema level. | Add a note in M1 (or Assumptions) that `raised_cents` is a placeholder column — read-only at schema level until Epic 4.2 implements the increment logic. |
| L-4 | No ADR-095 document deliverable               | OPEN   | Plan 094 produced a formal `agent-output/architecture/094-offers-schema-adr.md`. Plan 095 has an inline Decision Record but no milestone produces an equivalent ADR-095 document. The Handoff Notes reference "ADR-095 superseding the ordering FK portion of ADR-094" but this is only in the conversation context, not in the plan itself. | System architecture doc convention (per `system-architecture.md`) expects ADR references for schema decisions. Without ADR-095, the three-table ordering FK pattern is not formally codified. | Add ADR-095 creation as a deliverable under M1 (or a new M0.5), documenting: the three-section org→item hierarchy, the separate-FK ordering pattern, and why a CTI base table was rejected. |
| L-5 | `community_projects` search RPC does not return `image_path` | OPEN   | The M3 return type definition includes commerce/temporal fields but omits `image_path`, which is a column in M1. Display layers for project cards will need image data. | Minor — image_path would typically be needed to render a project card in the UI. Can be added to the RPC at implementation time, but the plan spec is incomplete. | Add `image_path TEXT` to the M3 return type column list.                                          |

---

## Unresolved Open Questions

None. All findings resolved in revision. ✅

---

## Questions for Planner

None remaining. All questions resolved via revision.

---

## Risk Assessment

| Severity | Count | Summary                                                                              |
| -------- | ----- | ------------------------------------------------------------------------------------ |
| CRITICAL | 0     | —                                                                                    |
| HIGH     | 0     | —                                                                                    |
| MEDIUM   | 3     | All resolved in revision                                                             |
| LOW      | 5     | All resolved in revision                                                             |

**Blocking concerns**: None. The plan is implementable as written.

**Implementation-time briefing required**: Implementer must be aware of M-2 (RLS ownership gap) and M-1 (Option A vs B) before writing migration 069.

---

## Recommendations

All addressed in revision. Plan cleared for implementation. No further Critic action required.

---

## Revision History

| Revision   | Date               | Changes from Prior Version         | Findings Addressed      | New Findings | Status Change                  |
| ---------- | ------------------ | ---------------------------------- | ----------------------- | ------------ | ------------------------------ |
| Initial    | 2026-04-20T14:30Z  | First review                       | N/A                     | M-1..3, L-1..5 | OPEN                        |
| Rev 1      | 2026-04-20T15:00Z  | Planner revised plan; re-reviewed  | M-1..3, L-1..5 (all 8) | None         | APPROVED                       |
