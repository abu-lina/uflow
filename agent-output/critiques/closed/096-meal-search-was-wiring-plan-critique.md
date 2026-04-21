---
ID: 096
Origin: 096
UUID: a3f82c1d
Status: RESOLVED
---

# Critique — Plan 096: Wire Up Meal Search in "Was?" Accordion

| Field | Value |
|-------|-------|
| Artifact | `agent-output/planning/096-meal-search-was-wiring-plan.md` |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/153 |
| Date | 2026-04-21T09:20Z |
| Status | **RESOLVED** |
| Verdict | ✅ APPROVED — all MEDIUM findings incorporated into plan revision 2026-04-21T09:25Z |

---

## Changelog

| Date | Author | Request | Summary |
|------|--------|---------|---------|
| 2026-04-21T09:20Z | Critic | Initial review | Plan approved; 2 medium findings documented for implementer |

---

## Memory Mode

**NO-MEMORY MODE** — Flowbaby retrieval returned 0 results. Proceeding artifact-first.

---

## Value Statement Assessment

> *As a **user browsing /search?section=food**, I want to **type a meal name and see live results from providers' menus**, so that **I can discover which local restaurants or food providers offer a specific dish**.*

| Check | Result |
|-------|--------|
| Presence | ✅ Clear user-story format |
| "So that" measurable | ✅ Discovery of dish sources is concrete and verifiable |
| Master Product Objective alignment | ✅ Directly serves food-section discovery; no product drift |
| Direct value delivery | ✅ Value is delivered by this plan, not deferred |

**Assessment: STRONG.** The value statement is unambiguous and outcome-testable.

---

## Overview

Plan 096 is a well-scoped, narrow frontend wiring task. The architecture, dependency graph, milestone sequencing, and acceptance criteria are all present. All Decision Record items are marked `[RESOLVED]`. No `OPEN QUESTION` items remain. Duration estimates are present. The plan correctly identifies and respects existing infrastructure (RPC, state, debounce pattern).

The plan was reviewed against the actual `search_provider_items` RPC definition in `supabase/migrations/068_provider_catalog_tables.sql` (lines 244–355). Two discrepancies were found that require implementer attention.

---

## Architectural Alignment

| Check | Result |
|-------|--------|
| RPC/tsvector search — no ILIKE | ✅ M1 explicitly prohibits ILIKE |
| Service layer in `src/services/` | ✅ `provider-catalog.ts` correctly placed |
| Domain UI in `src/features/search/components/` | ✅ `WasMealResults.tsx` correctly placed |
| `'use client'` client component | ✅ Page is already client-side; component inherits correctly |
| Debounce via setTimeout/clearTimeout | ✅ Matches established `woQuery` pattern — YAGNI compliant |
| i18n via `useLanguage` | ✅ All 6 locale files targeted |
| No premature external services | ✅ Postgres-first; no Redis, no external search |

---

## Scope Assessment

Scope is correctly bounded. "Already Done" section cleanly delineates what not to re-implement. Milestone dependency graph is accurate. M1+M2 parallel → M3 → M4 → M5 is a logical, safe sequence.

**Frontend-only claim**: The session brief specifies "frontend only." The plan mostly honours this, but D4 introduces an ambiguity (see F1 below).

---

## Technical Debt Risks

| Risk | Assessment |
|------|------------|
| Provider name retrieval (D4) | If implementer chooses the RPC-extension path, it introduces a DB change outside the session scope. This is the highest-risk implementation decision. |
| `listing_type_filter = null` on Ummah section | The RPC returns results from both `provider_menu_items` and `provider_service_offers` (UNION ALL). On Ummah section, null filter returns food and business items — not Ummah community services (which are not in the RPC's scope). Low risk for v0.10.23 but may resurface for Ummah section search. |
| Single-char query performance | `plainto_tsquery('german', 'a')` is valid but noisy. GIN index makes it fast, so this is UX debt not perf debt. |

---

## Findings

### MEDIUM Findings

| # | Title | Status | Description | Impact | Recommendation |
|---|-------|--------|-------------|--------|----------------|
| F1 | `provider_name` absent from RPC; D4 scope conflict | **RESOLVED** | Verified against migration 068. D4 revised in plan: RPC extension prohibited under frontend-only scope. Client-side `provider_id → name` map mandated. `ProviderMenuItemRaw` / `ProviderMenuItem` types split in M1. | — | Incorporated into plan revision. |
| F2 | `WasMealResults` component spec omits error state | **RESOLVED** | 5th `isError` state added to M3 props and states table. `suchen.was.searchError` key added to M2 spec (all 6 locales). `isErrorWas` state added to M4 wiring. | — | Incorporated into plan revision. |

### LOW Findings

| # | Title | Status | Description | Impact | Recommendation |
|---|-------|--------|-------------|--------|----------------|
| F3 | `is_available` field in interface may mislead | **OPEN** | The plan's `ProviderMenuItem` interface includes `is_available: boolean` as a field. **The RPC already enforces `m.is_available = true` in its WHERE clause** — so the field will always be `true` in results. Including it in the interface is type-correct (the RPC does return it) but the plan should not imply the component needs to filter on it. | Implementer may add redundant client-side filtering. Low risk. | Include in interface for type fidelity, but add a comment noting the RPC pre-filters this. No component-level filter needed. |
| F4 | `listing_type_filter = null` on Ummah section returns mixed provider items | **OPEN** | When `selectedSection === 'ummah'`, the plan results in `listing_type_filter = null`. The RPC returns items from both food and business providers (not Ummah community services, which aren't in the RPC's scope). Users on the Ummah tab would see food and business menu items, not Ummah-specific content. | Low v0.10.23 impact (Was? search is primarily relevant to Food section). Could confuse Ummah tab users in future. | Acknowledged as out-of-scope for this plan. Implementer should add a note in the component or page that Was? search is only fully meaningful on the food section. Consider adding to the 096 open-actions for a follow-up. |
| F5 | Minimum query length not specified | **OPEN** | The plan triggers the RPC for any `wasQuery.trim().length > 0`. A single character triggers `plainto_tsquery('german', 'D')`. GIN indexes handle this efficiently, but UX is noisy. | Low — GIN is fast. Mainly UX quality. | Implementer decision: recommend ≥ 2 characters as a guard before dispatching, aligning with typical search UX conventions. |
| F6 | Illustrative code block in M4 | **OPEN** | M4 contains a code-comment block labelled "ILLUSTRATIVE ONLY." Per the Planner constraint, plans should not contain prescriptive code. The label mitigates this, but it technically violates the convention. | None to implementation — it adds clarity. | Process note only. No action required for implementation. |

---

## Hotfix Analysis

*"How will this plan result in a hotfix after deployment?"*

The most likely post-deploy hotfix vectors:

1. **Silent RPC error** (F2) — If `searchProviderItems` throws (network issue, RPC permissions gap, Supabase cold start), the component will display nothing with no user feedback. User files a "search is broken" report → hotfix to add error state.
2. **Provider name missing from results** (F1) — If implementer chooses the RPC extension path without a coordinated DB migration, the `provider_name` column won't exist in production until the migration runs. Component shows undefined/blank for provider name. → hotfix or coordinated deploy.
3. **`listing_type_filter` mismatch on Ummah section** (F4) — Low probability for v0.10.23 since users primarily interact with food section, but if Ummah section users report "wrong results in Was?", it becomes a label/copy fix.

---

## Questions

1. **F1 scope resolution** — Is the implementer permitted to extend the `search_provider_items` RPC to add `provider_name`, or must they stay strictly frontend-only? If the former, a migration note should be added to the plan. If the latter, D4 should be amended to mandate the client-side map. **User decision requested.**

   *(Critic's recommendation: stay frontend-only, use client-side map. Extending the RPC is a separate DB concern that deserves its own migration and review.)*

---

## Risk Assessment

| Category | Level | Reason |
|----------|-------|--------|
| Scope | LOW | Narrow and well-bounded; all pre-work confirmed in place |
| Architecture | LOW | Follows all established codebase patterns |
| DB | MEDIUM | D4 ambiguity could trigger out-of-scope migration |
| UX | MEDIUM | Missing error state creates silent-failure risk (F2) |
| i18n | LOW | 6 locales, 4 keys each — straightforward |
| Testing | LOW | Clear test strategy documented |

---

## Recommendations

1. **Implementer: resolve F1 before writing a single line of M1** — Verify whether the `search_provider_items` RPC on the UAT DB currently returns `provider_name`. It does NOT per migration 068. Decide whether to (a) stay frontend-only with client-side provider name lookup, or (b) escalate to user to authorize a scope expansion for RPC extension. Do not silently extend the RPC.

2. **Implementer: add error state to M3** — Add `isError: boolean` to `WasMealResults` props. Add `suchen.was.searchError` i18n key (e.g., DE: `"Suche nicht verfügbar. Bitte versuche es erneut."`). Render a short inline error message in the 5th state. This is consistent with the existing `EmptyCityCard.tsx` error pattern.

3. **Implementer: add `/* RPC pre-filters is_available=true */` comment** on `is_available` in the `ProviderMenuItem` interface to prevent redundant component-level filtering.

4. **Implementer: use ≥ 2 character guard** before dispatching the debounced search effect (F5).

---

## Approved With Conditions

This plan is **APPROVED** for implementation. The two MEDIUM findings (F1, F2) are addressable at implementation time and do not require a plan revision. The implementer must:

- **F1**: Resolve D4 by using client-side provider name lookup (or escalate to user for scope expansion)
- **F2**: Add 5th error state to `WasMealResults` component spec and corresponding i18n key

All other findings are LOW and addressed in the Recommendations section above.

---

## Revision History

| Revision | Date | Changes | Findings Addressed | New Findings | Status Change |
|----------|------|---------|-------------------|--------------|---------------|
| Initial | 2026-04-21T09:20Z | First review of Plan 096 | — | F1–F6 identified | OPEN → APPROVED |
| Revision 1 | 2026-04-21T09:25Z | Plan revised per Critic findings | F1, F2 incorporated into plan | — | APPROVED → RESOLVED |

---

*Session: S96-meal-search-was | Root: /Users/NARAFIQ/Projects/uflow-wt/S96-meal-search-was | Branch: session/96-meal-search-was*
