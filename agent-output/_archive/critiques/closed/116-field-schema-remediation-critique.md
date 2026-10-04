---
ID: 116
Origin: 118
UUID: e7a3f1c9
Status: Resolved
---

# Critique — Plan 116: Field-Level Schema Remediation

**Artifact**: `agent-output/planning/116-field-schema-remediation-plan.md`
**Analysis**: `agent-output/architecture/118-field-level-schema-review.md`
**Date**: 2026-05-01T21:00Z
**Status**: R2 Review

## Changelog

| Date              | Handoff        | Request                | Summary                                           |
| ----------------- | -------------- | ---------------------- | ------------------------------------------------- |
| 2026-05-01T21:00Z | Planner→Critic | Review plan 116        | Initial critique. 7 milestones covering all 28 FL-findings. 1 HIGH, 3 MEDIUM, 2 LOW findings identified. No blockers. |
| 2026-05-01T21:30Z | Critic→Planner | Revision requested     | 6 findings (F-1 through F-6). Verdict: APPROVED pending revisions. |
| 2026-05-01T22:00Z | Planner        | Revision applied       | All actionable findings addressed (F-1/2/3/4/6). F-5 acknowledged as process note. Plan updated. |
| 2026-05-01T23:30Z | Planner        | R2 revision applied    | AF-1 through AF-7 architecture findings addressed. FL-1/FL-2 removed; FL-3 added to M-1; M-3 DROP-only; M-5 Task 1 explicit ordering; AF-7 rename inventory; 3 new decisions D-9/D-10/D-11. |
| 2026-05-02T00:00Z | Critic         | R2 re-review           | 3 new findings (G-1 MEDIUM, G-2 LOW, G-3 LOW). All AF-1–AF-7 resolutions verified. Verdict: **APPROVED**. |

---

## Value Statement Assessment

**Present**: ✅ Clear user story format with "As a / I want to / So that" structure.  
**Clarity**: ✅ "So that" outcome is verifiable — structurally sound schema, self-documenting, ready to scale.  
**Alignment**: ✅ Supports Master Product Objective — pre-consumer structural integrity is directly enabling for the growth phase.  
**Directness**: ✅ Value delivered directly in this plan — no deferrals to future plans (advisory items are documented in M-7, not deferred out of scope).

---

## Overview

Plan 116 R2 addresses all 7 architecture findings (AF-1 through AF-7) identified during the pre-implementation audit. The revision quality is high — the CRITICAL enum rename ordering (AF-1) is now explicit and correct, the M-3/M-5 cross-milestone conflict (AF-3) is cleanly resolved by dropping all section CHECKs without recreation, and the `'business'` → `'store'` rename inventory (AF-7) is now quantified and actionable.

The plan has matured through two revision cycles (Critique F-1–F-6, then Architecture AF-1–AF-7) and is now significantly more robust than the initial version. Decision Record has grown from 8 to 11 entries, all RESOLVED with rationale. Duration estimates are realistic at 14–22 days.

---

## AF-1 through AF-7 Resolution Assessment

| Finding | Severity | Resolution Quality | Notes |
|---------|----------|-------------------|-------|
| AF-1 (enum RENAME breaks CHECKs) | CRITICAL | ✅ **Excellent** | M-5 Task 1 now has explicit 7-step DROP ordering within a single transaction. Ordering is correct: DROP index → verify CHECKs → DROP categories CHECK → RENAME VALUE → UPDATE data → recreate CHECK → recreate index. Decision D-10 documents the rationale. |
| AF-2 (FL-1/FL-2 already exist) | HIGH | ✅ **Clean** | Removed from M-1 entirely. Assumption 5 added. Acceptance criteria updated to note exclusion. No residual references. |
| AF-3 (M-3/M-5 CHECK conflict) | HIGH | ✅ **Sound design** | M-3 drops all 3 CHECKs, no recreation. Decision D-9 rationalizes: extension tables provide structural enforcement. The M-3→M-5 sequencing note updated. |
| AF-4 (FL-3 missing) | MEDIUM | ✅ **Well-placed** | Added as M-1 Task 5. Clean DDL. Assumption 4 corrected. |
| AF-5 (trust_level range) | MEDIUM | ✅ **Appropriately cautious** | M-1 Task 3 now mandates live data audit before CHECK. Clear implementer instructions. |
| AF-6 (doc 118 changelog) | LOW | ✅ **Fixed** | Architecture 118 changelog corrected. |
| AF-7 (rename inventory) | HIGH | ✅ **Thorough** | 33 files + 5 schema objects + 6 translation files + URL backward-compat + NOT-in-scope exclusion list. The URL fallback mapping in `resolveSectionFromSearchParams()` is a good proactive addition. |

---

## Architectural Alignment

**Consistent with Architecture 118**: ✅ All 28 findings accounted for. FL-1/FL-2 correctly excluded as already implemented.

**Extension table pattern**: ✅ Decision D-9 establishes that section-scoped constraints move from supertype to extension tables — this is the correct architectural direction for a table-per-type inheritance model.

**Enum rename safety**: ✅ Decision D-10 codifies PostgreSQL's expression-text-reparsing behavior. This is institutional knowledge that protects future migrations.

---

## Scope Assessment

R2 scope is well-contained. The revision only adds/modifies content — no new milestones, no new findings in scope. The net effect is fewer M-1 tasks (FL-1/FL-2 removed), simpler M-3 (DROP-only), and more explicit M-5 (ordered steps). Duration widened from 12–18 to 14–22 days, which is realistic given the AF-1 complexity.

---

## Technical Debt Risks

No new debt introduced by R2. The DROP-only M-3 strategy actually reduces interim debt (no temporary CHECK that would need modification in M-5).

---

## Hotfix Scenario Analysis

*"How will this plan result in a hotfix after deployment?"*

1. **M-4 badge trigger vs M-5 column drops** — See G-1 below. The data-driven trigger rewritten in M-4 targets `providers` columns. M-5 moves those columns to extension tables. Post-M-5, badge sync will fail unless the trigger is updated.

2. **Bookmark ID mapping during M-5** — Task 8 says "merge `bookmarks.community_service_id` into `provider_id`". This works cleanly only if M-5 Task 3 preserves original `community_service_id` values as `provider_id` during the insert. If new UUIDs are generated instead, bookmark references become orphaned. The implementer will naturally handle this, but the plan could be more explicit.

3. **Window between M-3 and M-5 deployment** — After M-3 drops all section CHECKs and before M-5 creates extension tables, there is no constraint preventing a food provider from having `no_gambling = TRUE`. Acceptable in the pre-consumer window (Assumption 1), but would be a data quality issue if the milestones are deployed separately with a gap.

---

## Findings

### Prior Findings (R1 — all RESOLVED)

| Finding | Status | Resolution |
|---------|--------|------------|
| F-1 · HIGH — M-5 scope underestimate | RESOLVED | File counts updated; 5–8 day estimate; sub-milestones added |
| F-2 · MEDIUM — CS UNIQUE key FK safety | RESOLVED | Removed from M-1 FL-15 |
| F-3 · MEDIUM — Enum rename risk inaccurate | RESOLVED | Risk item corrected for PG15+ |
| F-4 · MEDIUM — CS backfills redundant | RESOLVED | Marked conditional in M-2 |
| F-5 · LOW — Planner chatmode missing | ACKNOWLEDGED | Process note |
| F-6 · LOW — Semver not specified | RESOLVED | v0.12.0 (MINOR) |

### New Findings (R2)

### G-1 · MEDIUM — M-4 Badge Sync Trigger References Columns Dropped in M-5

| Field | Value |
|---|---|
| Issue | M-4 Task 4 (FL-23) rewrites `sync_provider_badge_to_boolean()` to be data-driven, looking up `badge_types.provider_column_name` and using `EXECUTE format('%I', v_col_name)` to update `providers`. After M-5 Task 9 drops `halal_level`, `no_alcohol`, `no_pork`, `no_gambling` from `providers` (moved to extension tables), the trigger will attempt to SET a column that no longer exists on `providers`. Badge sync will fail at runtime. |
| Status | OPEN |
| Impact | Badge sync breaks post-M-5. Any badge INSERT/UPDATE on food or store providers triggers an error. Not a data loss scenario, but a functional regression. |
| Recommendation | Add a note to M-5 Tasks 4/9 or acceptance criteria: "After dropping type-exclusive columns from `providers`, update `badge_types.provider_column_name` references and `sync_provider_badge_to_boolean()` trigger to target extension tables (`food_providers`, `store_providers`) instead of `providers`." Alternatively, the implementer may redesign the trigger entirely in M-5 — but the plan should flag the dependency. |

### G-2 · LOW — M-1 "Additive Only" Description Inaccurate

| Field | Value |
|---|---|
| Issue | M-1 objective says "zero-downtime, additive only" but Task 5 (FL-3) is `DROP COLUMN applicable_to` — a destructive schema operation. Still zero-downtime (Postgres instant metadata change), but not "additive only." |
| Status | OPEN |
| Impact | Misleading label only. No functional risk. |
| Recommendation | Change M-1 subtitle to "Quick Wins (zero-downtime)" or "Quick Wins (zero-downtime, minimal schema changes)". |

### G-3 · LOW — RLS Policies on New Extension Tables Not Addressed

| Field | Value |
|---|---|
| Issue | M-5 creates `food_providers`, `store_providers`, `ummah_providers` but does not mention whether RLS policies are needed on these tables. If they contain access-controlled data (type-specific provider attributes), they need RLS to match the existing `providers` table RLS posture. This was noted informally in the R1 risk assessment but never tracked as a formal finding. |
| Status | OPEN |
| Impact | Potential security gap if extension tables lack RLS. Low probability in pre-consumer window but should be addressed for production readiness. |
| Recommendation | Add to M-5 acceptance criteria: "All extension tables have RLS enabled matching the `providers` table policy pattern." Or add a note: "Implementer to audit existing `providers` RLS policies and replicate to extension tables." |

---

## Unresolved Open Questions

The plan states "All resolved — no open questions remain at handoff." ✅ Confirmed — no `OPEN QUESTION` items found.

---

## Decision Record Check

All 11 decisions (D-1 through D-11) are marked `[RESOLVED]` with rationale. ✅ No `[OPEN]` or `[DEFERRED]` decisions.

D-9 (AF-3), D-10 (AF-1), and D-11 (AF-7) are well-written additions that codify architectural knowledge from the pre-implementation audit.

---

## Duration Estimates Check

Present ✅ — Updated to 14–22 days with widened Implementation band (10–15 days). Uncertainty drivers are accurate and reference AF-1.

---

## Risk Assessment

Risk table updated with 2 new entries (enum RENAME schema dependencies, trust_level range mismatch). Both are marked with appropriate mitigations.

**Note**: The R1 RLS audit gap was not added to the Risks table. G-3 above addresses this.

---

## Recommendations

1. **Address G-1**: Add a cross-reference note in M-5 about the badge trigger column dependency. This is the only finding with functional impact.
2. **Address G-2**: Cosmetic fix to M-1 subtitle. Non-blocking.
3. **Address G-3**: Add RLS acceptance criterion to M-5. Non-blocking but important for production readiness.

---

## Verdict

**APPROVED** — Plan 116 R2 is comprehensive, well-sequenced, and architecturally sound. The AF-1 CRITICAL finding is addressed with a correct and explicit migration ordering. All 7 architecture findings are resolved satisfactorily.

The 3 new findings (1 MEDIUM, 2 LOW) are non-blocking:
- G-1 (badge trigger) is naturally discoverable by the implementer when implementing M-5, but the plan should flag it.
- G-2 and G-3 are documentation/process items.

The plan is ready for implementation. Findings G-1 through G-3 can be addressed inline by the implementer without requiring another planning revision cycle.

---

## Revision History

| Revision | Date              | Findings Addressed | New Findings | Status Changes |
|----------|-------------------|--------------------|--------------|----------------|
| R2       | 2026-05-02T00:00Z | AF-1–AF-7 verified resolved in plan | G-1, G-2, G-3 | Critique re-opened for R2 review |
| R1       | 2026-05-01T22:00Z | F-1, F-2, F-3, F-4, F-5, F-6 | None | F-1/2/3/4/6 → RESOLVED; F-5 → ACKNOWLEDGED |
| Initial  | 2026-05-01T21:00Z | —                  | F-1 through F-6 | —           |
