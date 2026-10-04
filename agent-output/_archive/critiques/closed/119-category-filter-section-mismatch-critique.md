---
ID: 119
Origin: 119
UUID: b7c3e2f1
Status: Resolved
---

# Critique 119 — Category Filter Shows Wrong Section Categories

| Field    | Value                                                                         |
| -------- | ----------------------------------------------------------------------------- |
| Artifact | `agent-output/planning/119-category-filter-section-mismatch-plan.md`          |
| Analysis | `agent-output/analysis/closed/119-category-filter-section-mismatch.md`        |
| Date     | 2026-05-02T00:32Z                                                             |
| Status   | Initial — APPROVED                                                            |

## Changelog

| Date               | Handoff     | Request                          | Summary                                    |
| ------------------ | ----------- | -------------------------------- | ------------------------------------------ |
| 2026-05-02T00:32Z  | User→Critic | Review plan for clarity/completeness | Initial review. Verdict: APPROVED with LOW advisory notes. |

## Value Statement Assessment

**PASS.** The value statement follows the correct user-story format ("As a … I want to … so that …") and directly addresses the reported symptom. The business impact is clearly stated: trust degradation and confusing UX from a wrong-section category appearing under Food. This is a genuine user-visible bug, not speculative improvement.

## Overview

Plan 119 is a well-structured bugfix plan with clear root-cause tracing from analysis doc 119. It correctly identifies three co-required fixes (data integrity, code guardrail, legacy data scoping) and sequences milestones with explicit dependencies. The plan stays within WHAT/WHY boundaries — no implementation code is prescribed beyond the analysis-originated fix direction.

## Architectural Alignment

**PASS.** The plan aligns with established patterns:

- **Postgres-first**: Uses `applicable_section` column filtering at the query level rather than client-side filtering. Correct approach.
- **Migration discipline**: Data corrections via `supabase/migrations/` — aligns with project convention.
- **Service layer pattern**: Fix targets `fetchCategoriesBySection()` in `src/services/categories.ts`, which is the correct service-layer location. The plan correctly notes that `getCategoriesForSection()` already has the right filter pattern.
- **Section type mapping**: The `store` → `business` DB mapping is documented. The plan correctly identifies this as a required mapping but does not prescribe HOW to implement it — leaving that to the Implementer.

## Scope Assessment

**PASS.** Scope is appropriate for a bugfix:

- M1 (data audit) — necessary to quantify the problem before fixing
- M2 (category scoping migration) — addresses the root cause at the data layer
- M3 (code guardrail) — defense-in-depth against future data inconsistencies
- M4 (dead code removal) — low-risk cleanup, correctly scoped as independent
- M5 (version/release) — standard procedure

The milestone dependency graph is correct: M1+M2 before M3, all before M5.

## Technical Debt Risks

**LOW.** The plan reduces debt (removes dead code, fixes data integrity, adds a missing guardrail). No new debt is introduced. One advisory note below regarding the scattered `store`→`business` mapping pattern.

## Findings

### F-1 — Timestamp Inconsistency (LOW)

| Field         | Value |
| ------------- | ----- |
| Status        | RESOLVED |
| Description   | Plan header shows `Created: 2025-07-15T10:00Z` but today is 2026-05-02. The changelog also uses `2025-07-15T10:00Z`. |
| Impact        | Misleading date trail for future audits. |
| Recommendation | Implementer or Planner should correct the timestamp to `2026-05-02`. This does not block implementation. |

### F-2 — `store`→`business` Mapping Lacks Centralized Utility (LOW, Advisory)

| Field         | Value |
| ------------- | ----- |
| Status        | RESOLVED |
| Description   | The codebase already has 5+ ad-hoc `'business' ? 'store'` ternaries scattered across route handlers, search pages, and config. The plan's M3 will add another inline mapping. No centralized `mapSectionToDbValue()` utility exists. |
| Impact        | Incremental scatter of the same mapping logic. Low risk for this plan, but pattern debt accumulates. |
| Recommendation | Advisory only — Implementer MAY extract a shared helper in `sectionFilters.ts` if it simplifies the change, but this is not a blocker and should not expand scope. Future plan can address consolidation. |

### F-3 — Missing `.github/chatmodes/planner.chatmode.md` (LOW, Process)

| Field         | Value |
| ------------- | ----- |
| Status        | RESOLVED |
| Description   | Critic instructions require reading planner chatmode file at review start. File does not exist. |
| Impact        | None for this review — proceeded without it. |
| Recommendation | Process note only. No action required for Plan 119. |

## Unresolved Open Questions

None. The plan contains no `OPEN QUESTION` items.

## Decision Record Check

All 6 decisions (D1–D6) are marked `[RESOLVED]` with clear rationale. No `[OPEN]` or `[DEFERRED]` decisions.

## Duration Estimates Check

**PASS.** Duration estimates section is present with per-phase estimates and uncertainty drivers.

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

Low hotfix risk:
- **M3 guardrail could hide valid categories**: Mitigated by including `'all'` in the filter and per-section testing (documented in acceptance criteria). The risk is real but well-covered.
- **M2 migration could mis-scope a category**: Mitigated by the conservative audit approach and M3's `'all'` inclusion. Worst case: a category that should appear in a section doesn't — fixable by updating `applicable_section` without code changes.
- **M1 data fix could break a provider's category assignment**: Low risk — the fix corrects an existing inconsistency, doesn't introduce new logic.

No high-confidence hotfix scenario identified.

## Risk Assessment

The three risks documented in the plan are reasonable and have appropriate mitigations. No additional risks identified beyond the advisory notes above.

## Recommendations

1. **Correct timestamps** in plan header and changelog to `2026-05-02` (F-1).
2. Proceed to implementation. The plan is clear, complete, and well-scoped.

## Revision History

| Date              | Event                                              | Findings Changed |
| ----------------- | -------------------------------------------------- | ---------------- |
| 2026-05-02T00:32Z | Initial review — APPROVED. 3 LOW findings, all resolved. | F-1, F-2, F-3 created |
