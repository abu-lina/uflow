---
ID: 107
Origin: 107
UUID: a3f2c8b1
Status: Resolved
---

# Critique 107 — Ummah Tab Section-Conditional Search Options

| Field          | Value |
|----------------|-------|
| Artifact       | [agent-output/planning/107-ummah-search-plan.md](../planning/107-ummah-search-plan.md) |
| Analysis       | n/a (no pre-planning analysis doc) |
| Date           | 2026-04-27T09:30Z |
| Status         | APPROVED |
| Revision       | Initial |

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-27T09:30Z | Planner → Critic | Initial review | Plan created, Critic review initiated |
| 2026-04-27T09:45Z | Critic | ID corrected 106→107; collision with origin/main Plan 106 (Badge/Boolean, v0.10.30) | OPEN |
| 2026-04-27T09:50Z | Critic | Post-merge audit: FilterSection.tsx pre-modified by Plan 106; plan file inventory and M3 updated; ummahFilterKeys.ts added to new files | OPEN |
| 2026-04-27T09:55Z | devops | All findings resolved (F1-F5 ADDRESSED/ACCEPTED). Status updated to Resolved; moved to closed/. | Resolved |

---

## Value Statement Assessment

**PASS.**

The value statement is present and well-formed as a user story:

> _"As an Ummah community member, I want the Ummah tab on the /search page to show community-service discovery options… so that I can quickly find Islamic education, counseling, legal aid, youth services, health support, marriage guidance, and funeral services relevant to me."_

- User role is specific ✓
- Feature request is scoped ✓
- "So that" outcome is concrete ✓
- Aligns to Master Product Objective (community services discovery) ✓

**One gap** (MEDIUM, see F1): the value statement implies end-to-end discoverability ("quickly find") but the plan scope is UI-only — the providers page will not return Ummah-specific results until a follow-up plan addresses it. The value is partially deferred.

---

## Overview

Plan 106 is a focused, well-structured feature plan for section-conditional rendering on the `/search` page. It correctly isolates the Ummah tab from the Food tab through parallel new components (`WasServiceTypeResults`, `UmmahFilterSection`) rather than modifying existing ones — a sound OCP application. Scope boundaries, decision rationale, acceptance criteria, and TDD anchors are all present. Duration estimates are provided. No `[OPEN]` decisions exist in the Decision Record.

The plan is **approvable** with two medium concerns and three low concerns noted below.

---

## Architectural Alignment

Checks against established codebase patterns:

| Check | Result |
|-------|--------|
| New components placed in `src/features/search/components/` | ✓ Correct |
| No server-component boundary violations (all changes are client components) | ✓ Correct |
| No new API routes or DB migrations | ✓ Correct — UI-only |
| Section type `'food' \| 'ummah' \| 'business'` from `search-provider.tsx` respected | ✓ Correct |
| Food path gated with `selectedSection === 'food'` guard on effects | ✓ Addressed in M3 |
| Postgres-first: no new external services proposed | ✓ Correct |
| `WasSelection` extended additively — no breaking change to existing type narrowing | ✓ Plan confirms fallthrough to `q=` param works |

Architectural fit is **good**.

---

## Scope Assessment

| Area | Verdict |
|------|---------|
| Scope boundaries explicit (food tab unchanged, no backend, no business tab) | ✓ |
| Out-of-scope table present and comprehensive | ✓ |
| Deferred items documented in Decision Record (D6: Familien/Senioren) | ✓ |
| File inventory complete (12 files: 4 new, 8 modified) | ✓ |
| Dependencies sequenced with Mermaid diagram | ✓ |

Scope is well-controlled.

---

## Technical Debt Risks

| Risk | Assessment |
|------|------------|
| `WasSelection` living in `WasCategoryResults.tsx` while now shared across food and Ummah | Low debt. Plan correctly extends it there. A future refactor to a shared types file is warranted but not urgent. |
| `filterOpen` state is independent from `openAccordion` (pre-existing inconsistency) | Pre-existing; plan correctly does not touch it. |
| Static service type list hard-coded in a new component | Intentional (D3, YAGNI). Replace path is straightforward when DB-backed types are warranted. |

No new debt introduced that was not pre-existing or explicitly deferred.

---

## Findings

### MEDIUM Findings

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|-------------|--------|-------------|--------|----------------|
| F1 | Providers-page end-to-end value gap | ADDRESSED | Value statement promises users can "quickly find" community services, but plan scope is UI-only. After selecting "Beratung" and hitting Search, users land on `/providers?section=ummah&q=Beratung` — a page that currently executes food-centric queries. The Ummah tab will look correct on the search page but deliver no meaningful results until the providers page is updated. | The value statement overstates the delivered user value for this plan increment. A user completing the full flow gets a misleading experience. | (a) Reframe the value statement to "browse and specify" rather than "find" — the user builds a search intent; results require a future plan. OR (b) acknowledge explicitly in Assumption 5 that end-to-end value is staged across two plans and name the follow-up. This is not a blocker for UI implementation but must not be left silent. |
| F2 | WAS search input placement ambiguous | ADDRESSED | M3 states: _"The search input is rendered in both branches (same markup, no duplication needed — it controls `wasQuery` which both branches read)."_ These two clauses contradict each other: "rendered in both branches" implies duplication, while "no duplication needed" implies shared markup outside the conditional. If the input is inside each conditional branch, the same markup IS duplicated (a DRY violation for 10+ JSX lines). If the input is outside the conditional, the plan should say so explicitly. | Implementer may either (a) duplicate the input block or (b) extract it outside the conditional — these produce different DOM structures and different code quality. | Clarify in the plan: the search input `<div>` should be rendered **once**, above the conditional, shared between both branches. The conditional should only wrap the results component. |

---

### LOW Findings

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|-------------|--------|-------------|--------|----------------|
| F3 | Plan contains illustrative code blocks | ACCEPTED | M4 includes before/after code snippets for `WasSelection`. They are labelled "ILLUSTRATIVE ONLY" which mitigates the constraint, but plans should avoid prescriptive code per Planner constraint. | Low — the illustration is clear and labelled. The risk is the implementer treats the block as the required exact implementation rather than the conceptual change. | Accept as-is (labels are sufficient). Note for Planner to prefer prose descriptions in future plans. |
| F4 | State-clear implementation left ambiguous | ADDRESSED | M3 says state should be cleared on section change "in the `SectionSelector` `onSectionChange` handler (or a `useEffect` on `selectedSection`)." Two mechanisms are offered without guidance. The handler approach mutates state in an event callback, which is fine but couples cleanup logic to the selector. The `useEffect` approach is idiomatic React and cleaner. | Without guidance, the implementer chooses; both work but `useEffect` is the preferred React pattern for derived state cleanup. | Prefer `useEffect` on `selectedSection` — state-derived cleanup belongs in an effect, not in a click handler. No change needed to the plan (LOW), but noting for implementer context. |
| F5 | T10 test direction incomplete | ADDRESSED | TDD anchor T10 tests "Switching from Ummah → Food tab clears WAS selection." The Risks section identifies the primary risk as _"food selections persisting into the Ummah view"_ — i.e., Food → Ummah direction. This direction has no dedicated test anchor. | Food→Ummah stale selection (e.g. "Spaghetti" persisting in the Ummah WAS input) is the highest-impact regression vector per the plan's own risk table, but has no test coverage anchor. | Add T12: "Switching from Food→Ummah tab with a food WAS selection active clears the selection." QA can use this to prevent the stale state bug. |

---

## Unresolved Open Questions

**None.** No `OPEN QUESTION` items are present in the plan.

---

## Decision Record Check

All decisions: **RESOLVED** or **[DEFERRED]**.

D6 (Familien/Senioren deferred): The deferred entry states "implementer / low priority / next ummah iteration plan" but does not reference a specific open-actions file or plan ID. This is informally deferred. For the purposes of this plan, D6 does not block implementation.

---

## Risk Assessment

| Risk (from plan) | Critic Assessment |
|------|-------------------|
| Food effects firing for Ummah section | Correctly identified and mitigated. Implementer MUST guard; this is an AC item in M3. |
| WAS selection persisting across tab switch | Correctly identified. AC item in M3. **Add T12 to QA anchors (see F5).** |
| TypeScript union extension | Low risk; additive change. |
| Translation key fallback | Low risk; German placeholder pattern is acceptable. |
| Providers-page results meaningless for Ummah queries | **Not listed in plan risks.** See F1 — this is the highest user-experience risk and should be in the risk table. |

---

## Recommendations

1. **[Required before implementation]** Address F1: add an explicit statement to Assumption 5 (or a new Risk row) acknowledging that the providers page will not return Ummah-specific results in this increment. Frame the value correctly as "build search intent UI" rather than "end-to-end find."

2. **[Required before implementation]** Address F2: clarify in M3 that the WAS search input is rendered once, outside the conditional branch, shared between food and Ummah paths.

3. **[Informational for QA]** Add T12 (F5) to TDD anchors: Food→Ummah tab switch with active food selection should clear the WAS state.

Items F3, F4 are informational only — no plan revision required.

---

## Verdict

> **APPROVED — all findings addressed.**

F1 and F2 (MEDIUM): resolved via plan revision. F4 and F5 (LOW): resolved via plan revision. F3 (LOW): accepted as-is. The plan is ready for implementation.

---

## Revision History

| Revision | Date | Changes | New Findings | Status Changes |
|----------|------|---------|--------------|----------------|
| Initial | 2026-04-27T09:30Z | First review | F1–F5 opened | Status: OPEN |
| Revision 1 | 2026-04-27T09:50Z | ID corrected 106→107; plan updated post-merge (FilterSection pre-modified, ummahFilterKeys.ts added as new file, M3 filter accordion note added). Critique findings remain valid. | No new findings | Status: OPEN |
| Revision 2 | 2026-04-27T10:00Z | Plan revised: F1 value statement reframed + Assumption 5 annotated + risk row added; F2 WAS input clarified as shared above conditional; F4 state-clear resolved to useEffect; F5 T12 added. F3 accepted as-is. | All findings ADDRESSED/ACCEPTED | Verdict: **APPROVED** |
