---
ID: 204
Origin: 204
UUID: f3a8c1e2
Status: Resolved
---

# Critique 204 — Fix Category Badge "Unnamed" on Near-Me Provider Cards

| Field          | Value                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Artifact       | [agent-output/planning/204-category-unnamed-near-filter.md](../planning/204-category-unnamed-near-filter.md) |
| Analysis       | [agent-output/analysis/204-category-unnamed-near-filter.md](../analysis/204-category-unnamed-near-filter.md) |
| Classification | Bugfix                                                                                             |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/302                                                      |
| Review Date    | 2026-08-09T19:17Z                                                                                  |
| Verdict        | **APPROVED**                                                                                       |

## Changelog

| Date (UTC)       | Handoff From | Request         | Summary                                                     |
| ---------------- | ------------ | --------------- | ----------------------------------------------------------- |
| 2026-08-09T19:17Z | Planner      | Initial critique | All findings LOW; plan APPROVED for implementation          |

---

## Value Statement Assessment

The plan opens with a clear, well-formed user story:

> "As a user browsing food providers near my location, I want to see each restaurant's actual cuisine/category name on its card, so that I can quickly distinguish the type of food on offer and make an informed choice — rather than seeing 'unnamed' on every result."

- **Presence**: ✅ User story format present
- **Clarity**: ✅ "So that" outcome is directly verifiable — visual inspection of category badge text on near-me result cards
- **Alignment**: ✅ Serves the Near-Me Food Search epic and the wider user trust objective
- **Directness**: ✅ Delivered in this plan; no proxy or deferral

---

## Overview

Plan 204 is a compact, well-scoped bugfix plan. The root cause is L1 Proven across three code layers (SQL → type → component) per Analysis 204. The plan's repair strategy is correct: fix the data gap at the SQL RPC layer and propagate it up through type and component, rather than a client-side workaround. All six Decision Record entries are `[RESOLVED]`. No `OPEN QUESTION` markers. Duration estimates are present and proportionate (2–4h total).

---

## Architectural Alignment

| Check | Result | Note |
| ----- | ------ | ---- |
| Migration immutability | ✅ | D3 correctly creates migration 122 as additive; migration 120 untouched |
| LEFT JOIN vs INNER JOIN | ✅ | Correct choice; INNER JOIN would silently drop providers with null `category_id` |
| SECURITY INVOKER + GRANT pattern | ✅ | Plan explicitly retains all existing grants and revokes |
| Service-layer type fix (not hook) | ✅ | D6 correctly places the type change in `NearMeFoodResult` at the service layer |
| YAGNI — no shared base type | ✅ | D4 defers architectural refactor appropriately |
| Rollback viability | ✅ | `CREATE OR REPLACE FUNCTION` restores original signature; no data migration required |

The Mermaid dependency graph (`M1 → M2 → M3 → M4`) is accurate and matches the natural build dependency order.

---

## Scope Assessment

The scope exclusions are correctly bounded: the shared base type refactor, category filtering in near-me mode, and `find_nearby_food_providers` are all correctly excluded with rationale. The plan is surgical.

---

## Technical Debt Risks

- **D4 deferral** is the only carried technical debt: `NearMeFoodResult` remains a disjoint type from `SearchResult`/`Provider`. This means future additions to `ProviderCard` rendering will continue to require manual audits of `NearMeResultsGrid`. This risk is documented and the deferral is justified by YAGNI; no action required in this plan.

---

## Hotfix Path Assessment

Deployment sequence is safe in both orders:
- **New RPC + old code**: Old TypeScript ignores extra columns — near-me still shows "unnamed" (pre-fix behavior, no crash, no regression).
- **Old RPC + new code**: New TypeScript reads missing fields as `undefined` — `getCategoryName()` falls back to section label or "unnamed" (pre-fix behavior, no crash).

No deploy-window regression risk identified. Rollback plan covers both code and DB revert.

---

## Findings

### F1 — LOW | Illustrative code snippets in M2

| Field | Detail |
| ----- | ------ |
| Status | RESOLVED |
| Location | Plan § M2 — `NearMeFoodResult` / `NearMeResultsGrid` |
| Issue | The M2 section includes JSX prop examples and a TypeScript shape comment. These are "HOW" details, which nominally violate the Planner WHAT/WHY constraint. |
| Assessment | Acceptable. The snippets are explicitly labelled "ILLUSTRATIVE ONLY" and reference the existing canonical type rather than prescribing a new one. They aid Implementer alignment without mandating exact syntax. |
| Recommendation | No action required. If re-revised, the shape comment could be moved to Handoff Notes to better signal intent. |

---

### F2 — LOW | `selectedCategoryLabel` gap in mobile header persists after fix

| Field | Detail |
| ----- | ------ |
| Status | RESOLVED |
| Location | `ProvidersContent.tsx` → `selectedCategoryLabel` → `ProvidersPageHeader` |
| Issue | When near-me mode is active with a `?category=` URL param, `searchResults` stays empty (standard query is disabled via `enabled: !nearMeSearch.isNearMeMode`). The `selectedCategoryLabel` computed from `searchResults` therefore stays `null` even after this fix, so the mobile fixed header will show the section label rather than the selected category name in that scenario. |
| Assessment | **Out of scope for this plan.** Analysis 204 correctly established that the header does not show "unnamed" — it shows the section label when `categoryLabel` is null. The stated bug is the per-card badge, which this plan fixes. The header label scenario is a pre-existing limitation of a different feature path (category filter + near-me combined). |
| Recommendation | Record as a known limitation in Handoff Notes so QA does not flag it as a regression. No code change required in this plan. |

---

### F3 — LOW | M3 test strategy note for null-null category case may be misleading

| Field | Detail |
| ----- | ------ |
| Status | RESOLVED |
| Location | Plan § M3 — testing strategy notes |
| Issue | The note states: "One test with `category_name_de = null` / `category_name_en = null` → assert fallback behaviour (no crash, no 'unnamed' in rendered output if the mock exposes the prop)." If both name fields are null/undefined, `ProviderCard.getCategoryName()` passes the truthy-but-nameless `category` object check and still falls through to `t('search.unnamed')`. The claim "no 'unnamed' in rendered output" is therefore incorrect for this specific case. |
| Assessment | The plan correctly delegates exact test case design to QA ("QA defines specific test cases in `agent-output/qa/`"). The note is informal guidance, not a hard acceptance criterion. QA should be aware that all-null names will still produce "unnamed" (which is the correct fallback for a provider with no category name configured). |
| Recommendation | QA should assert the correct behavior: all-null case → "unnamed" is acceptable output; the regression test should instead assert that a provider WITH valid category data shows the correct name. No plan revision required. |

---

## Open Questions

None. No unresolved `OPEN QUESTION` markers found in the plan.

## Decision Record Check

All 6 decisions are `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` entries requiring acknowledgement.

## Duration Estimates Check

Present and proportionate: Implementation 1–2h, QA 0.5–1h, DevOps 0.5h, total 2–4h. ✅

---

## Risk Assessment

Overall risk: **LOW**. Three findings, all LOW severity, none blocking. The fix is additive at every layer (SQL, type, component, test) with no destructive changes to existing data or behavior.

---

## Recommendations

1. Add to **Handoff Notes**: "The `selectedCategoryLabel` in `ProvidersContent.tsx` (mobile header) will still not resolve a category name when near-me mode is active, even after this fix. This is pre-existing behavior — the header correctly shows the section label. QA should not flag this as a regression."
2. Brief QA on F3: the all-null category case will legitimately produce "unnamed" — the regression test should focus on providers that have valid category names.

Neither recommendation requires a plan revision before implementation.

---

## Revision History

| Version | Date             | Findings Addressed | New Findings | Status Changes    |
| ------- | ---------------- | ------------------ | ------------ | ----------------- |
| Initial | 2026-08-09T19:17Z | — | F1, F2, F3 (all LOW) | OPEN → RESOLVED (all findings) |
