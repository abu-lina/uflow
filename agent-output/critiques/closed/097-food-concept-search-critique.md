---
ID: 097
Origin: 097
UUID: b9e14a3c
Status: Resolved
---

# Critique — Plan 097: Food Concept Search (Vocabulary-Backed Was? Search)

| Field | Value |
|-------|-------|
| Artifact | `agent-output/planning/097-food-concept-search-plan.md` |
| Analysis | N/A — diagnosis embedded in plan (post-096-UAT finding) |
| Architecture Review | `agent-output/architecture/097-food-concept-search-arch-review.md` |
| Date | 2026-04-21T13:40Z |
| Status | **OPEN** |
| Verdict | **APPROVED** — 1 MEDIUM finding (non-blocking; fix before implementation), 2 LOW |

---

## Changelog

| Date | Author | Request | Summary |
|------|--------|---------|---------|
| 2026-04-21T13:40Z | Critic | Initial review | Plan approved; 1 MEDIUM (mermaid graph contradicts sequencing text), 2 LOW findings |

---

## Memory Mode

**NO-MEMORY MODE** — Flowbaby retrieval unavailable. Proceeding artifact-first.

---

## Process Note (LOW)

`planner.chatmode.md` is absent from `.github/chatmodes/`. No impact on this review; noting for process completeness.

---

## Value Statement Assessment

> "As a **user browsing /search?section=food**, I want to **type a meal name and see a deduplicated list of food concepts** (e.g. "Döner" once, regardless of how many restaurants offer it or how they name their variant), **so that I can discover which dish types are available locally and tap to explore providers**."

| Check | Result |
|-------|--------|
| Present in user story format | ✅ |
| "So that" outcome measurable/verifiable | ✅ — "results appear instead of 0" is immediately testable |
| Aligns with Master Product Objective | ✅ — directly serves Food Discovery (Plans 089–096 arc) |
| Value delivered directly, not deferred | ✅ — fixes live 0-results defect; no phasing behind a flag |

The value statement is clear, grounded, and closes a regression introduced by Plan 096 UAT. This is the correct framing: it is both a bugfix (0-results fixed) and a feature improvement (deduplication). Classifying it as "Bugfix + Feature" is accurate.

---

## Overview

Plan 097 is a well-scoped plan that makes a single architectural correction: wiring the Was? search to the populated `offers` vocabulary layer instead of the empty `provider_menu_items` table. Six milestones are defined (migration → service → component → page → i18n → version). All 12 decisions are RESOLVED. Architecture review (APPROVED_WITH_CHANGES) has been incorporated — F1 (dual-language tsvector), F2 (D12 onSelect decision), and F3 (React key) are all visible in the plan.

The plan correctly preserves Plan 096's infrastructure (`search_provider_items`, `provider-catalog.ts`) for future per-provider use while replacing the Was? search path with the vocabulary-backed approach.

---

## Architectural Alignment

Plan 097 aligns with the system architecture:

- **Postgres-first** ✅ — new RPC, existing GIN indexes, no external services added
- **Additive migration** ✅ — `CREATE OR REPLACE FUNCTION`; no table alterations
- **Migration slot** ✅ — `070` confirmed free (069 = community projects scoping)
- **Service layer conventions** ✅ — extends `src/services/offers.ts`, consistent with folder structure guidance
- **Feature component placement** ✅ — `WasMealResults` stays in `src/features/search/components/`
- **Architecture review incorporated** ✅ — all three F1/F2/F3 findings applied by Planner

No new architectural patterns introduced. No external dependencies added.

---

## Scope Assessment

| Dimension | Assessment |
|-----------|------------|
| Breadth | Narrow and appropriate — 6 files touched (migration, service, component, page, 6×i18n, version artifacts) |
| Depth | Correct — deep enough to fix root cause, shallow enough to avoid scope creep |
| Preserves Plan 096 assets | ✅ — `provider-catalog.ts` and `search_provider_items` explicitly retained (D9) |
| YAGNI compliance | ✅ — no concept detail page, no materialized view, no plural i18n system pre-build |
| Code in plan | ✅ — RPC signature is marked "ILLUSTRATIVE ONLY"; logic requirements are WHAT/WHY, not HOW |

The `limit_count = 10` default (down from 20 in Plan 096) is a reasonable UX choice for concept-level results. No concern.

---

## Technical Debt Risks

| Risk | Assessment |
|------|------------|
| English tsvector sequential scan | Accepted — pre-existing gap from migration 014; documented in architecture review |
| `suchen.was.providerCount` "1 Restaurants" plural | Accepted for v1 — documented in Known Risks |
| `offers` vocabulary has no food-category filter | Low risk — `listing_type = 'food'` on the provider side is sufficient; JoinHalal imports are inherently food-scoped |
| `provider_menu_items` still empty post-release | Not a risk for this plan — Plan 097 explicitly pivots away from this table |

No new debt is introduced. One pre-existing debt item (English tsvector index gap) is acknowledged but not introduced by this plan.

---

## Findings

### MEDIUM

| | |
|--|--|
| **ID** | M-1 |
| **Title** | Mermaid milestone graph contradicts sequencing rule text |
| **Status** | RESOLVED — graph fixed in plan at 2026-04-21T13:45Z |
| **Section** | "Milestone Dependencies" |
| **Description** | The mermaid graph shows `M4 → M5` (implying M5 depends on M4, i.e., M5 comes *after* M4). But the sequencing rule text immediately below states: **"M5 is a prerequisite for M4 (translation key used in component)"**. These are directly contradictory. M5 (i18n key `suchen.was.providerCount`) is used by `WasMealResults` (M3), so it must be available before M3 and M4, not after. |
| **Impact** | An implementer reading only the graph would implement M4 before M5, causing a missing translation key during development (TypeScript will likely error or produce an undefined string). The sequencing text is authoritative but the visual contradiction creates friction. |
| **Recommendation** | Fix the mermaid graph: add edge `M5 → M3` and remove `M4 → M5`. Correct dependency order: `M1 → M2 → M5 → M3 → M4 → M6`. The sequencing rule text is already correct — the graph needs to match it. |

---

### LOW

| | |
|--|--|
| **ID** | L-1 |
| **Title** | GitHub Issue not yet created |
| **Status** | RESOLVED — GitHub Issue #154 created before implementation; plan header updated with URL |
| **Section** | Plan header — "GitHub Issue: (to be created)" |
| **Description** | Per the established workflow (Plan 084), the GitHub Issue should be created before implementation begins. Currently listed as "(to be created)". |
| **Impact** | Minor — no issue number means no traceability link on the commit and no close-on-merge hook. Implementer will need to create and reference it manually. |
| **Recommendation** | Create the GitHub issue before handing off to the Implementer; update the plan header with the issue URL. |

---

| | |
|--|--|
| **ID** | L-2 |
| **Title** | No explicit rollback/hotfix path documented |
| **Status** | RESOLVED — Migration deployed to production as idempotent `CREATE OR REPLACE FUNCTION`; rollback is schema-only (re-migration). Moot post-deployment. |
| **Description** | The plan does not describe what happens if the RPC is deployed and produces incorrect results (e.g., returns wrong provider counts, or causes performance degradation on the UAT DB). |
| **Impact** | Very low — the migration is additive and idempotent (`CREATE OR REPLACE FUNCTION`); a corrective re-migration is trivial and the existing `search_offers` RPC is unaffected. This is a process gap, not a safety gap. |
| **Recommendation** | Planner may add a one-line note in Handoff Notes: "Rollback: issue a follow-up migration with a corrected `CREATE OR REPLACE FUNCTION` body. No data changes are made by M1, so rollback is schema-only." |

---

## Unresolved Open Questions

None. All decisions are `[RESOLVED]`. No `OPEN QUESTION` markers found in the plan.

---

## Decision Record Check

All 12 decisions (D1–D12) are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` decisions requiring acknowledgement.

---

## Duration Estimates Check

✅ Present. Table covers all phases with estimates and uncertainty ratings.

---

## Risk Assessment

**Overall risk: LOW**

The plan makes one targeted change to a non-production code path (Was? search currently returns 0 results, so there is no working behavior to regress). The underlying data (`offers` vocabulary + `providers.offers_ids`) is confirmed populated. The migration is additive only. The component and page changes are within the session S96 worktree with full test visibility.

The one structural issue (M-1) is a documentation clarity problem, not a correctness problem. The sequencing rule text is unambiguous.

---

## Recommendations

1. **Fix mermaid graph (M-1)** before implementation handoff. Low-effort change; high clarity gain for implementer.
2. **Create GitHub Issue (L-1)** before implementation begins.
3. L-2 is optional; Planner may add the rollback note at their discretion.

The plan is otherwise ready to proceed to implementation.

---

## Revision History

| Version | Date | Changes | Status Changes |
|---------|------|---------|----------------|
| Initial | 2026-04-21T13:40Z | First review | OPEN; 1 MEDIUM, 2 LOW identified |
| Revision 1 | 2026-04-21T13:45Z | M-1 mermaid graph fixed in plan | M-1 → RESOLVED |
| Revision 2 | 2026-04-21T19:30Z | DevOps Stage 1 closure | L-1 RESOLVED (issue #154), L-2 RESOLVED (migration deployed); Status → Resolved |

---

*Session: S96-meal-search-was | Root: /Users/NARAFIQ/Projects/uflow-wt/S96-meal-search-was*
