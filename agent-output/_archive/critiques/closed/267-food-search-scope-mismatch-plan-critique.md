---
ID: 267
Origin: 267
UUID: ed174b2e
Status: Resolved
---

# Critique — Plan 267: Admin "All" Status Scope on Food Search

| Field    | Value                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Artifact | [agent-output/planning/267-food-search-scope-mismatch-plan.md](../planning/267-food-search-scope-mismatch-plan.md)                       |
| Analysis | [agent-output/analysis/closed/267-food-search-scope-mismatch-analysis.md](../analysis/closed/267-food-search-scope-mismatch-analysis.md) |
| Date     | 2026-09-28T11:41Z                                                                                                                        |
| Status   | Revision 1                                                                                                                               |
| Verdict  | **APPROVED**                                                                                                                             |
| Session  | S267-food-search-scope-mismatch (worker session)                                                                                         |
| Memory   | NO-MEMORY MODE (retrieval failed: "No workspace folder open")                                                                            |

## Changelog

| Timestamp         | Handoff          | Request                                                              | Summary                                                                                                                                                                                                                                                                                         |
| ----------------- | ---------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28T11:41Z | Planner → Critic | Review Plan 267 (migration + admin-scope security surface)           | Initial critique. 1 Critical, 3 Medium and 4 Low findings. Verdict: REVISION REQUESTED.                                                                                                                                                                                                         |
| 2026-09-28T11:59Z | Planner → Critic | Re-review Revision 1 (plan changelog 11:47Z + user decisions 11:58Z) | C1, M1–M3, L1–L4 RESOLVED. New Low findings: N1 DEFERRED (owner Planner → FU-1, trigger: control window allocates FU-1 ID), N2 RESOLVED (accepted per user Q2), N3 DEFERRED (owner DevOps → PLAN-267 M5, trigger: DevOps Stage 1). Verdict: APPROVED. Critique Resolved and moved to `closed/`. |

## Value Statement Assessment

**Pass.** The plan has a clear user story: admin/moderator, "All" shows every status with labels and no moderation actions, so no listing is wrongly concluded to be missing. It also preserves the public approved-only guarantee (AC7.2 / #415). The success criteria are observable and map 1:1 to the UAT report. The plan delivers value directly; the only deferral is D8, which is explicitly scoped.

## Overview

The plan correctly identifies the full chain: DB matcher → API → service → client → cards → suggestions. The security posture is strong:

- D4: the "all" scope is explicit, never cookie-inferred.
- D5: NULL means approved, so it fails closed.
- Explicit-status requests are `no-store` and admin-gated.
- Old/new app and DB are compatible in both directions.

I checked these against the code:

- `review_status::text = coalesce(...)` means an unknown sentinel on an old DB matches nothing and does not error.
- RLS policy 130 matches Assumption 2.
- `useProviderReview` invalidates the `['providers']` prefix, so labels do not go stale after moderation.

The gaps are in **how "all" is defined** and **where the new value is allowed to flow**. Those are the likely sources of a post-deploy hotfix.

## Architectural Alignment

- Postgres-first: reuses the tsvector matcher without adding new predicates around the indexed expressions.
- `SECURITY INVOKER` is kept; RLS stays the boundary for browser-side calls, and the service-role client is used only behind the admin gate. This fits the Plan 058 and Plan 266 architecture.
- Dropping and recreating the `search_scoped_suggestions` overload with re-grants is correct and avoids PostgREST overload ambiguity.

## Scope Assessment

The scope is appropriate for a bugfix. About 9 source files plus tests, CHANGELOG and version.

The D8 deferral (map pins, near-me, home page) is reasonable. It is marked `[DEFERRED]` and needs explicit user acknowledgement (see Questions). See M3 for a scope premise that does not hold on desktop.

## Technical Debt Risks

- There are two duplicate `ReviewStatusFilter` definitions (`src/services/providers/types.ts` L202 and `src/features/admin/components/AdminStatusFilter.tsx` L8). One type is used both for URL tab state and for row-level card labels. Widening it (M2 step 3) spreads the new request-only value into unrelated consumers (see M2).
- FU-1 will leave the "All" meaning different across list, map, near-me and home until it lands.

## Findings

### Critical

#### C1 — "All statuses" as defined would include `removed_by_owner` rows

- **Status**: RESOLVED (Revision 1: D1 explicit four-status set; M1 step 2, M2 step 2, success criterion 7, state-table row, tests; user confirmed Q3)
- **Description**:
  - D1 defines "All" as four statuses: approved, pending, rejected, needs_revision.
  - M1 step 2 implements it as "no review-status predicate", and M2 step 2 as "skip the outer `.eq('review_status', …)`".
  - The `review_status` enum has a **fifth** value, `removed_by_owner` (`supabase/migrations/001_baseline.sql` L81–93). It is live: `src/app/api/outreach/action/route.ts` L69–73 sets it when an owner asks for the listing to be removed.
  - The admin path uses the service-role client, which bypasses RLS, so nothing else filters these rows out.
  - The card label would also fall through to the pending (yellow) style and render "removed by_owner" (`ProviderCard.tsx` L386–396 replaces only the first `_`).
- **Impact**:
  - Listings whose owners asked to be removed reappear in admin discovery, looking like pending listings.
  - This contradicts the resolved decision D1.
  - Likely post-deploy hotfix and a trust/privacy concern.
- **Recommendation**:
  - Define "all" as the explicit set of the four moderation statuses, in both the DB matcher and the outer query, not as "no predicate".
  - Add an acceptance criterion and a state-table row: `removed_by_owner` rows never appear in "All".
  - QA should cover this in both the RPC and the outer query.

### Medium

#### M1 — `?status=all` in the page URL re-enables Approve/Reject on the mixed-status list

- **Status**: RESOLVED (Revision 1: D7 URL normalization in `ProvidersContent` and `Header`; success criterion 8; state-table row)
- **Description**:
  - `ProvidersContent.tsx` L178–179 casts the URL `status` param without validating it, and L575 enables moderation on `!!status`.
  - Today `?status=all` makes the API return 400. After M2 it becomes valid, so an admin landing on `/food?status=all` would get the mixed list **with** Approve/Reject. That violates D3.
  - `AdminStatusFilter` (mobile and the desktop `Header.tsx` L68) would show no tab selected.
  - D7 keeps "all" out of the URL by convention only; nothing enforces it.
- **Impact**: D3 can be bypassed by a hand-edited or shared URL. The UI state becomes inconsistent. This is admin-only, so it is not a security leak, but it breaks the explicit user requirement.
- **Recommendation**:
  - Require the page to accept only the four tab values from the URL `status`. Treat any other value, including `all`, as the "All" tab.
  - Add rows to the State/Branch table for `?status=all` and for an unknown value.

#### M2 — Type-widening strategy lets the request-only "all" value reach surfaces that will error

- **Status**: RESOLVED (Revision 1: D9 request-only contract; `ReviewStatusFilter` unchanged; map/near-me receive the selected tab; M3 acceptance requires `tsc` without widening)
- **Description**:
  - M2 step 3 widens the shared `ReviewStatusFilter` / `AdminSearchOptions`. `ReviewStatusFilter` is dual-use:
    - URL/tab state: `ProvidersContent`, `Header`, `RootPageContent`, `useAdminSearch`.
    - Row-level label prop: `ProviderCard` L39, `DiscoveryResultsGrid` L50.
  - `ProvidersContent` passes `status` to `useMapDiscovery` (L217–220), which reaches `getMapLocations`. That runs `.eq('providers.review_status', reviewStatus ?? 'approved')` against an **enum** column. PostgREST rejects `'all'` there with an invalid-enum error, which breaks map pins for admins.
  - The near-me RPC takes `p_review_status` the same way.
  - The plan does not say which value (selected tab or effective scope) these deferred surfaces receive.
- **Impact**: If the implementation reuses one variable for the effective scope, the admin map or near-me breaks on "All". The compiler will not catch it once the shared type includes "all". This is a likely hotfix.
- **Recommendation**:
  - Limit "all" to the request-level contract only: the API `status` param and `AdminSearchOptions.status` / the suggestion scope. Keep `ReviewStatusFilter` unchanged.
  - State explicitly that map pins and near-me keep receiving the **selected tab** (null for All), never the effective scope, until FU-1.
  - Add this to the State/Branch table (map-open and near-me rows for an admin on "All").

#### M3 — D6 premise is inaccurate on desktop: store "All" keeps the bug

- **Status**: RESOLVED (Revision 1: D6 now `section !== 'ummah'`, i.e. food and store; success criterion 10; user confirmed Q2)
- **Description**:
  - D6 says `AdminStatusFilter` is rendered only when `section === 'food'`. That holds for the in-page (mobile) filter (`ProvidersContent.tsx` L721).
  - The desktop `Header.tsx` (L314–323) renders `AdminStatusFilter` for **any** admin, regardless of section.
  - On desktop `/store`, the specific tabs work (the API passes `adminOptions` for `store`), but "All" would stay approved-only after this fix. That is the reported defect, just in another section.
  - The `ummah` section drops `adminOptions` entirely (`search.ts` `searchCommunityServicesOnly`), so it is unaffected either way.
- **Impact**:
  - "All" behaves differently between `/food` and `/store` on desktop.
  - Another bug report is likely.
  - D6's rationale ("widening scope without a visible control would be confusing") does not apply to store on desktop.
- **Recommendation** (Planner/user decision):
  - **Either** apply the effective "all" scope wherever moderation is already allowed (`section !== 'ummah'`, matching the existing `enableModeration` condition),
  - **or** keep food-only and add store to D8/FU-1 with owner, target artifact and trigger. Also correct D6's rationale.

### Low

#### L1 — Admin suggestions ignore the selected tab

- **Status**: RESOLVED (Revision 1: D2 and M4 step 2 follow the effective scope)
- **Description**:
  - M4 passes "all" whenever the user is an admin and the section is food, regardless of the selected tab.
  - With "Approved" selected, a suggestion for a pending listing leads to 0 results. That breaks the Plan 266 invariant "a suggestion can never be shown without results" (134 SQL comment; `suggestions.ts` L22).
- **Recommendation**: Pass the same effective scope as the list: "all" for the All tab, otherwise the selected status. Or explicitly accept the deviation in the Decision Record.

#### L2 — Caller inventory is incomplete

- **Status**: RESOLVED (Revision 1: `providers.test.ts` added to the inventory)
- **Description**: `src/__tests__/services/providers.test.ts` (L159) asserts `search_providers_for_query` RPC args and is not listed in the Schema/Function Change Inventory.
- **Recommendation**: Add it to the inventory so QA can check it.

#### L3 — Status label opt-in must be explicit, not presence-based

- **Status**: RESOLVED (Revision 1: M3 step 2 explicit opt-in; M3 acceptance "non-admin cards never render a status label")
- **Description**:
  - M3 step 2 lets the label render outside moderation mode. Public rows also carry `review_status` (the select includes `*`).
  - `SearchResultsList.tsx` L164 passes `reviewStatus` unconditionally. It currently has no consumers, but it is exported.
  - A "render if `reviewStatus` is present" gate could show labels to non-admins.
- **Recommendation**:
  - Require an explicit opt-in (e.g. "show status label") driven only by the admin "All" / status views.
  - Add an acceptance criterion: non-admin cards never render a status label.

#### L4 — Process: Planner chatmode file missing

- **Status**: RESOLVED (informational; no plan change required)
- **Description**: `.github/chatmodes/planner.chatmode.md` does not exist, so the review proceeded without it.
- **Recommendation**: None for this plan.

### New Findings (Revision 1)

#### N1 — Success criterion 11 wording vs near-me list

- **Status**: DEFERRED
  - **Downstream owner**: Planner
  - **Target artifact**: FU-1 in `agent-output/planning/267-food-search-scope-mismatch-plan.md` §Follow-ups (new plan ID from the control window)
  - **Trigger**: the control window allocates the FU-1 plan ID
- **Description**: Criterion 11 says "every card in the admin list view" shows its status. The near-me list is also a list, but D8 defers it, so near-me cards stay approved-only with no labels. Read together with D8 and the state table, the intent is clear, so this does not block implementation.
- **Recommendation**: Implementer and QA should read criterion 11 as excluding near-me mode (D8). FU-1 owns near-me labels and scope.

#### N2 — Mobile `/store` has no in-page status tabs

- **Status**: RESOLVED (accepted: consistent with the user's Q2 answer "see all listings")
- **Description**: The in-page `AdminStatusFilter` renders only for `section === 'food'` (`ProvidersContent.tsx` L721). With D6, mobile admins on `/store` get the labelled mixed "All" list but cannot switch to a specific tab. Desktop has the tabs through `Header`.
- **Recommendation**: None for this plan. The labels still give the full overview; moderation on store remains available on desktop.

#### N3 — GitHub issue #435 body is out of date

- **Status**: DEFERRED
  - **Downstream owner**: DevOps
  - **Target artifact**: PLAN-267 M5 (release artifacts)
  - **Trigger**: DevOps Stage 1
- **Description**: The issue body still says food-only and "no predicate" semantics. The plan (D1, D6) now defines a four-status set on food and store.
- **Recommendation**: Refresh the issue body from the plan when M5 release artifacts are prepared.

## Unresolved Open Questions

None. OQ1 and OQ2 are marked `[RESOLVED]`.

## Decision Record Check

- There are no `[OPEN]` decisions.
- **D8 is `[DEFERRED]`** (map pins, near-me, home page → FU-1, Owner: Planner; needs a new ID from the control window). **Acknowledged by the user** at 2026-09-28T11:58Z ("I dont care about maps and pins. The list view is important.").
- M3 was resolved by inclusion (D6), not deferral.

## Questions

All answered by the user at 2026-09-28T11:58Z:

1. D8 deferral: acknowledged.
2. `/store` included: yes (D6).
3. `removed_by_owner` excluded: yes (D1).

## Risk Assessment

| Area                                  | Rating                 | Note                                                                                                                                                            |
| ------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public data leak / CDN                | Low                    | D4 and D5 are sound; the `no-store` and admin gate have been checked against the code.                                                                          |
| Admin data correctness                | Low (after Revision 1) | D1 explicit four-status set in both queries.                                                                                                                    |
| Regression in adjacent admin surfaces | Low (after Revision 1) | D9 keeps map/near-me on the selected tab; the narrow type lets the compiler catch misuse.                                                                       |
| Requirement adherence (D3)            | Low (after Revision 1) | D7 URL normalization.                                                                                                                                           |
| Deployment ordering                   | Low                    | Fails closed in both directions. On an old DB, admin "All" without `q` already works via the outer query; with `q` it returns 0 until the migration is applied. |

## Recommendations

Proceed to implementation. The Implementer should treat D1, D7 and D9 as the highest-risk invariants and cover each with a `[pre-fix FAILS]` / `[post-fix PASSES]` regression test.

## Revision History

| Revision   | Date              | Artifact Changes                                                                                                             | Findings Addressed    | New Findings                                | Status Change              |
| ---------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------- | -------------------------- |
| Initial    | 2026-09-28T11:41Z | n/a                                                                                                                          | n/a                   | C1, M1, M2, M3, L1–L4                       | → OPEN                     |
| Revision 1 | 2026-09-28T11:59Z | D1, D2, D6, D7 revised; D9 added; success criteria 7–11; state table; M1–M5 and tests updated; user decisions Q1–Q3 recorded | C1, M1, M2, M3, L1–L4 | N1 (Deferred), N2 (Resolved), N3 (Deferred) | OPEN → Resolved (APPROVED) |
