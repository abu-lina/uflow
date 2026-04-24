---
ID: 102
Origin: 102
UUID: 9a4b1e6f
Status: Resolved
---

# Critique: Plan 102 — Wo City Results Redesign: Was-parity UI + Popular Cities

**Artifact**: `agent-output/planning/102-wo-city-results-redesign.md`
**Date**: 2026-04-24T19:50Z
**Critic**: Critic Agent (Initial Review)

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-24T19:50Z | Planner → Critic | Review Plan 102 | Initial critique — APPROVED, 0 critical/high, 1 medium, 2 low |
| 2026-04-24T19:52Z | Critic | Self-resolved | All 3 findings addressed in plan; critique closed RESOLVED |

---

## Value Statement Assessment

**Rating**: ✅ CLEAR AND DIRECT

> "As a user searching for food services on `/search`, I want the 'Where' (Wo) accordion to look and behave like the redesigned 'What' (Was) section — showing the most popular cities by provider count when idle, displaying city results in rich card rows with a location icon and provider count, supporting controlled open/close behavior, closing after I tap a city, and showing my selection in the collapsed header — so that the search experience feels cohesive and the Wo section is as discoverable and frictionless as Was."

- **User story format**: ✅ As / Want / So that present
- **"So that" outcome**: ✅ Measurable — "Wo selection rate ↑" / "searches submitted with location filter ↑"; quantifiable via analytics
- **Alignment to Master Product Objective**: ✅ Directly supports trust-first discovery and city-based community building (core architectural purpose)
- **Direct value delivery**: ✅ No deferral; all milestones deliver within this plan

---

## Overview

Plan 102 is a well-scoped, pattern-following UI improvement plan. It takes an established design system (WasCategoryResults, controlled accordion, recent searches) and systematically applies it to the Wo accordion. The plan correctly identifies all six dimensions of the gap (idle content, result row design, recent searches, selection row, controlled mode, dedicated component) and traces each to a resolved decision.

The author demonstrates strong architectural awareness: Postgres-first principle acknowledged, client-side GROUP BY justified with scale threshold, no premature RPC added, existing component and token patterns reused.

---

## Architectural Alignment

**Alignment Status**: ✅ ALIGNED

- No schema changes, no new API routes, no RPC — correctly deferred per Postgres-first principle with explicit scale threshold (DAU > 5,000)
- `WoCityResults.tsx` placed in `src/features/search/components/` — matches project folder placement rubric for feature-domain UI
- `fetchPopularCities` in `src/services/providers.ts` — correct service layer placement, consistent with `fetchProviderCities` co-location
- All design system tokens reused (`bg-background-selection`, `rounded-xl`, shadow, icon patterns)
- Server/client boundary: all changes client-side, consistent with existing search page pattern
- No `SearchProvider` changes — correctly out of scope

---

## Scope Assessment

**Scope**: ✅ WELL-BOUNDED

- 6 milestones with clear sequencing; Mermaid dependency graph provided
- Out of scope explicitly documented (Wer/Filter, SearchBar.tsx F-LOW-3, geolocation, RPC at scale, Was changes)
- Plan 101 state model preserved and extended without renaming — minimises regression surface
- M6 (version + CHANGELOG) correctly included as final gate

---

## Technical Debt Risks

| Risk | Assessment |
|---|---|
| `fetchPopularCities` client-side merge may duplicate the city-count logic already implicit in `fetchProviderCities` | LOW — manageable; both functions serve distinct purposes (names-only vs count-ranked). Not DRY violation at this scale. |
| `page.tsx` state count continues to grow (now 15+ state variables) | LOW for this plan — the component split (WoCityResults) partially mitigates; full decomposition of SearchPageContent is a separate refactor concern |
| 9 i18n keys × 6 locales = 54 additions; risk of drift if locales diverge later | LOW — mitigated by type-check gate catching missing keys |

---

## Findings

### Critical
None.

### High
None.

### Medium

**[MEDIUM — F-MED-1] `fetchPopularCities` GROUP BY implementation path is ambiguous**

| Field | Detail |
|---|---|
| Status | RESOLVED |
| Issue | D1 states "using GROUP BY `address_city` ORDER BY count DESC" but Supabase JS client does not expose a direct GROUP BY API. The implementer must aggregate in JS (fetch all rows, then count by city), or use a raw `rpc()` call, or use Postgres's `.select('address_city')` with post-processing. The ACs do not clarify which approach is expected. This matters because: (a) fetching all `address_city` rows from `providers` for a GROUP BY in JS may be wasteful; (b) a raw `rpc()` helper already used elsewhere in `providers.ts` could be appropriate; (c) the implementer may choose inconsistent approaches without guidance. |
| Impact | Implementer uncertainty; potential performance issue if full table scan is done client-side |
| Recommendation | Add a clarifying note to M1: "Aggregate city counts client-side after fetching `address_city` from both tables, matching the dual-source fetch pattern in `fetchProviderCities`. If a Postgres aggregate function is preferred for scale, document the tradeoff in the implementation doc." This closes the ambiguity without prescribing code. |

---

### Low

**[LOW — F-LOW-1] Semver target is vague**

| Field | Detail |
|---|---|
| Status | RESOLVED |
| Section | Plan header — Target Release |
| Issue | "next available patch after v0.10.25; confirm at DevOps Stage 1" is consistent with project convention for abbreviated pipelines, but given the bundling recommendation (release with Plan 101), v0.10.26 is the logical next patch. Stating "v0.10.26 (patch, preliminary)" in the header would match the precision of prior plans and reduce DevOps ambiguity. |
| Impact | Minimal — DevOps always confirms at Stage 1; purely documentation clarity |
| Recommendation | Update header to "v0.10.26 (patch, preliminary); confirm at DevOps Stage 1" |

**[LOW — F-LOW-2] `recentWoSearches` type shape differs from `recentSearches` (Was)**

| Field | Detail |
|---|---|
| Status | RESOLVED |
| Section | M3 Acceptance Criteria — "recentWoSearches: Array<{ city: string }>" |
| Issue | The Was recent searches are typed as `WasSelection[]` (a richer type with label/type/categoryId/etc.). The Wo recent searches are typed as `Array<{ city: string }>`. This is intentionally simpler (city names only), but the plan should acknowledge this explicitly — the Implementer may try to reuse `WasSelection` for uniformity, which would be wrong. An inline note that Wo recent searches are intentionally a simpler type prevents over-engineering. |
| Impact | Low — risk of implementer over-engineering or under-specifying; no functional impact |
| Recommendation | Add a sentence to M3: "Recent Wo search entries are intentionally simpler than WasSelection — a city name string is sufficient; no need to reuse WasSelection type." |

---

## Open Questions Check

✅ No `OPEN QUESTION` items found in the plan — all questions are resolved via the Decision Record (D1–D6).

---

## Decision Record Check

✅ All 6 decisions (D1–D6) are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` decisions.

---

## Duration Estimates Check

✅ Duration estimates present with uncertainty drivers. Estimates are reasonable for the scope (2–4h implementation, 1–2h QA, 30min UAT/DevOps).

---

## Risk Assessment

**Overall Risk**: LOW

- No migrations, no API changes, no schema changes — minimal blast radius
- Pattern is established (Was section); implementer has a working reference model in the same codebase
- i18n breadth (6 locales) is the highest-effort milestone but is mechanical, not architectural
- Plan 101's state model is preserved, reducing regression surface

**Positive Observations**:
- Gap comparison table (Was vs Wo current vs target) is excellent — no ambiguity about what's changing
- Milestone dependency graph is well-structured and accurate
- All 6 ACs per milestone are testable
- Testing strategy distinguishes unit/regression/manual — proportionate for the scope
- Out of scope section explicitly captures F-LOW-3 (SearchBar.tsx cross-surface) — no scope creep

---

## Recommendations

**For Planner** (before implementation handoff):
1. Address F-MED-1: Add aggregation guidance to M1 (ambiguity in GROUP BY approach)
2. Address F-LOW-1: Specify v0.10.26 (patch, preliminary) in the header
3. Address F-LOW-2: Add note to M3 clarifying intentional type simplicity for recent Wo searches

None of these are blockers for implementation — all are documentation clarity improvements.

---

## Verdict

**Status**: ✅ **APPROVED**

All decisions are resolved. No critical or high findings. The plan is well-structured, architecturally aligned, correctly scoped, and delivers direct user value. The three findings are LOW/MEDIUM documentation gaps that can be addressed by the Planner alongside implementation or as minor pre-implementation updates.

**Gate**: Implementation may proceed after Planner addresses F-MED-1. F-LOW-1 and F-LOW-2 may be addressed before or during implementation.
