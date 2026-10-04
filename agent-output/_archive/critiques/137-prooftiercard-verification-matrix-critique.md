---
ID: 137
Origin: 137
UUID: e2a19f04
Status: OPEN
---

# Critique — Plan 137: ProofTierCard Verification Matrix Visual

| Field    | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Artifact | `agent-output/planning/137-prooftiercard-verification-matrix-plan.md` |
| Date     | 2026-06-01T18:27Z                                                     |
| Status   | Initial                                                               |
| Verdict  | **APPROVED**                                                          |

### Changelog

| Timestamp         | Handoff          | Request                                          | Summary                                   |
| ----------------- | ---------------- | ------------------------------------------------ | ----------------------------------------- |
| 2026-06-01T18:27Z | Planner → Critic | Plan review for clarity, completeness, alignment | Initial review. 4 LOW findings. APPROVED. |

---

## Value Statement Assessment

The value statement follows proper user story format ("As a... I want... so that...") and clearly articulates the gap: the arc gauge shows a combined 1–4 level but hides the two underlying dimensions. The narrative below the story connects the opaque score problem to the proposed transparency solution. **Clear and compelling.**

---

## Overview

Plan 137 proposes adding two dimension status rows (check method + certificate) between the existing semicircle gauge and the "What we verified" checklist in `ProofTierCard.tsx`. The scope is minimal: two rows of markup, six translation keys across six locales, and targeted unit tests. No schema, props, services, or dependency changes. The plan correctly identifies itself as additive on top of Plan 136's arc implementation.

---

## Architectural Alignment

- **Single component scope**: Changes confined to `ProofTierCard.tsx` + translation files. Consistent with the project's feature-module structure (`src/features/providers/components/`).
- **No new dependencies**: Correct — lucide-react is already in the bundle (partial caveat in F1 below).
- **No data flow changes**: Dimension rows derive from existing `certOnFile` and `onsiteVerified` variables. No new fetching, no RPC changes, no props changes.
- **Translation namespace**: Extending `providerDetail.proofTier` is the correct namespace — consistent with existing keys.
- **Postgres-first philosophy**: Not applicable (no data layer changes).

**Alignment verdict**: Strong. This is a well-contained visual enhancement.

---

## Scope Assessment

In-scope and out-of-scope are clearly defined. The out-of-scope list explicitly excludes `computeVerificationLevel()`, `VerificationArc`, props API, services, types, and database — appropriate for a visual-only addition. Milestone scope is proportional to deliverables.

---

## Technical Debt Risks

- **Low**: No new abstractions, no new patterns. Two rows of markup follow the existing checklist pattern.
- **D5 lifecycle note**: Marking Plan 136 as "Superseded" is debatable (see F3) but does not create technical debt.

---

## Findings

### F1 — `FileCheck` icon not in bundle (LOW)

| Field              | Detail                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**         | OPEN                                                                                                                                                                                                                                                      |
| **Severity**       | LOW                                                                                                                                                                                                                                                       |
| **Section**        | M2 Acceptance Criteria                                                                                                                                                                                                                                    |
| **Issue**          | The plan states "lucide icons `Globe` and `FileCheck` are already in the bundle." `Globe` is used in `UmmahFilterSection.tsx`, but `FileCheck` is not imported anywhere in the codebase.                                                                  |
| **Impact**         | Factual inaccuracy. The icon will work fine (lucide-react tree-shakes individual icons), but importing `FileCheck` does add a new icon to the client bundle. Not a blocker, but the statement should not mislead the implementer into thinking zero-cost. |
| **Recommendation** | Update the M2 acceptance criteria to note that `FileCheck` is a new import. Alternatively, consider `ShieldCheck` or `Award` which may already exist in the bundle.                                                                                       |

### F2 — Dimension rows partially overlap with checklist (LOW)

| Field              | Detail                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**         | OPEN                                                                                                                                                                                                                                                                                                                                                                |
| **Severity**       | LOW                                                                                                                                                                                                                                                                                                                                                                 |
| **Issue**          | The dimension rows ("Check method: Online/On-site", "Certificate: On file/Not provided") overlap with the "What we verified" checklist items ("Menu reviewed online", "Halal certificate on file", "On-site visit completed"). Both sections convey the same underlying data in different formats.                                                                  |
| **Impact**         | A future reviewer or user may perceive the card as repetitive. The plan does not acknowledge or justify the overlap.                                                                                                                                                                                                                                                |
| **Recommendation** | Add a brief rationale in the plan explaining why both sections provide value: the dimension rows serve as a _compact status summary_ (what dimensions were met), while the checklist provides _detailed evidence_ (what specific checks were performed). This prevents the implementer or a future plan from removing one section without understanding the intent. |

### F3 — Plan 136 lifecycle: "Superseded" vs "Completed" (LOW)

| Field              | Detail                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**         | OPEN                                                                                                                                                                                                                                                                                                                                               |
| **Severity**       | LOW                                                                                                                                                                                                                                                                                                                                                |
| **Section**        | D5, M4                                                                                                                                                                                                                                                                                                                                             |
| **Issue**          | The plan says "Plan 136 is superseded by this plan." However, Plan 136's objectives (replace shield-grid with arc visual) were fully achieved and its code remains. This plan _extends_ Plan 136, it does not _replace_ it. Marking 136 as "Superseded" implies its deliverables were rolled back or replaced, which could confuse future readers. |
| **Impact**         | Documentation accuracy. Someone reading Plan 136's status as "Superseded" may wrongly conclude the arc was removed.                                                                                                                                                                                                                                |
| **Recommendation** | Leave Plan 136 as "Completed" or "Implemented." Reference it in Plan 137 as a predecessor, not a superseded artifact. Adjust M4 task 3 accordingly.                                                                                                                                                                                                |

### F4 — Active/neutral chip mapping not explicit (LOW)

| Field              | Detail                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**         | OPEN                                                                                                                                                                                                                                                                                                                      |
| **Severity**       | LOW                                                                                                                                                                                                                                                                                                                       |
| **Section**        | M1, Status chip styling                                                                                                                                                                                                                                                                                                   |
| **Issue**          | The plan defines "Active state" (teal) and "Neutral state" (gray) for status chips but does not state which status values map to which. Is "Online" active or neutral? The intended mapping is likely: On-site = active, Online = neutral; On file = active, Not provided = neutral — but this is left to interpretation. |
| **Impact**         | Implementer must guess the mapping. A wrong guess (e.g., treating "Online" as active because _something was checked_) would produce an inconsistent visual.                                                                                                                                                               |
| **Recommendation** | Add an explicit mapping table in M1, e.g.: `statusOnsite → active, statusOnline → neutral, statusCertOnFile → active, statusCertNone → neutral`.                                                                                                                                                                          |

### F5 — Planner chatmode file missing (LOW, Process)

| Field              | Detail                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Status**         | OPEN                                                                                                                         |
| **Severity**       | LOW                                                                                                                          |
| **Issue**          | `.github/chatmodes/planner.chatmode.md` does not exist. Consistent with Plan 136 critique finding F4. Recurring process gap. |
| **Impact**         | Cannot verify planner-specific constraints.                                                                                  |
| **Recommendation** | Create the chatmode file or acknowledge its absence in the project docs.                                                     |

---

## Unresolved Open Questions

None. The plan contains no `OPEN QUESTION` items.

---

## Decision Record Check

All 5 decisions (D1–D5) are marked `[RESOLVED]` with rationale. No `[OPEN]` or `[DEFERRED]` decisions.

---

## Duration Estimates Check

Present with phase-level table. Estimates are reasonable for the scope (1–2 hours total). Uncertainty drivers documented.

---

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

Risk is very low. The change is purely additive markup + translation keys. Possible hotfix scenarios:

1. **Missing translation key** in one locale causes `t()` to return the raw key string. Mitigation: M3 testing should cover all 6 locales, though the plan's test strategy only covers the 4 level combinations (not locale-specific rendering). This is acceptable given the translation values are short single words.
2. **Layout overflow** on narrow viewports. Mitigation: Plan explicitly calls for 350px viewport testing in M2 acceptance criteria.
3. **Icon import failure**: If `FileCheck` (or chosen alternative) has a naming mismatch with the lucide-react version. Very unlikely.

None of these warrant plan revision. They are implementation-phase verification items.

---

## Risk Assessment

| Risk Area     | Rating | Notes                                                                       |
| ------------- | ------ | --------------------------------------------------------------------------- |
| Architectural | None   | Single-component, additive change                                           |
| Integration   | None   | No cross-component or data changes                                          |
| UX            | Low    | Potential perception of redundancy (F2); easily resolved with layout review |
| Deployment    | None   | Ships with existing branch bundle                                           |
| Rollback      | None   | Removing two DOM rows + translation keys is trivial                         |

---

## Recommendations

1. **Address F4** (chip mapping) before implementation starts — add the explicit mapping table to M1. This is the most actionable finding.
2. **Address F2** (redundancy justification) in the plan narrative — one sentence in the Value Statement or Assumptions section suffices.
3. **Address F3** (Plan 136 lifecycle) — change "Superseded" to "Completed" or "Predecessor."
4. **F1** and **F5** are informational; no plan revision required.

---

## Verdict

**APPROVED**

All findings are LOW severity. None block implementation. F4 (chip mapping) is recommended to be clarified before the implementer starts, but can also be resolved during implementation without a plan revision cycle.

---

## Revision History

| Revision | Date              | Findings Addressed | New Findings | Status Changes |
| -------- | ----------------- | ------------------ | ------------ | -------------- |
| Initial  | 2026-06-01T18:27Z | N/A                | F1–F5        | Initial review |
