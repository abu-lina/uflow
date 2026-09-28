---
ID: 267
Origin: 267
UUID: ed174b2e
Status: Planned
---

# 267 — Food Search Scope Mismatch (`/food?q=Munchies` vs `/food/berlin?q=Munchies&status=pending`)

## Changelog

| Date              | Agent   | Handoff Context                                                                                                           | Outcome                                                                                                                                                                                                                   |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28        | Analyst | Bugfix pipeline Phase 1, session S267, branch `fix/267-food-search-scope-mismatch` (base `a12aae1e`, Plan 266 / v0.15.20) | Reproduced on UAT. Root cause: the admin-only `status=pending` param changes the review-status scope. City is not a factor. With no status (the admin "All" tab), results are approved-only. Plan 266 did not cause this. |
| 2026-09-28T11:37Z | Planner | Incorporated into Plan 267                                                                                                | OQ1=A and OQ2=A resolved by user; Status → Planned; moved to `closed/`.                                                                                                                                                   |

## Value Statement and Business Objective

Admins and moderators use the `/food` discovery page to find and moderate listings. The status tabs there must match what the list shows. If the "All" tab hides pending listings, a moderator can conclude a listing does not exist. They may then create a duplicate or skip moderation. For the public, `/food` search must keep returning only approved listings.

## Objective

1. Reproduce the difference between `/food?q=Munchies` (no results) and `/food/berlin?q=Munchies&status=pending` (results).
2. Find the root cause: city/route params, status params, RPC params, or data state.
3. Decide whether Plan 266 is related.
4. Define the expected behavior on `/food`.

## Context

- Both routes render through [renderProvidersPage.tsx](<../../src/app/(public)/providers/renderProvidersPage.tsx>) and [ProvidersContent.tsx](<../../src/app/(public)/providers/ProvidersContent.tsx>). `/food/[city]` also passes `routeCity`.
- The search service is [search.ts](../../src/services/providers/search.ts). It calls RPC `search_providers_for_query` from [134_plan_266_desktop_search_partial.sql](../../supabase/migrations/134_plan_266_desktop_search_partial.sql), then re-filters `providers` with PostgREST.
- `status` is an admin-only moderation filter from Plan 058. It is honored only when the client `isAdmin` is true and the API route passes `isAdminOrModerator()`. See [route.ts](../../src/app/api/providers/search/route.ts).
- NO-MEMORY MODE: flowbaby retrieval failed with "No workspace folder open", so this analysis is based only on the repo and UAT.

## Methodology

- **Upstream tracing**: followed each URL param from route → `renderProvidersPage` (SSR) → `ProvidersContent` (client) → `/api/providers/search` → `searchProviders` → RPC.
- **Reproduction on UAT**: sent read-only public GETs to `https://uat.ummahflow.com/api/providers/search` and the SSR HTML of all three routes.
- **POC (component isolation)**: wrote a throwaway Vitest test that mocks the Supabase client and asserts the RPC args and `review_status` predicates for each route. It passed 3/3 and was then deleted, so the tree is clean. The source is reproduced below.
- **Git history**: checked `a12aae1e` (Plan 266) and `643a36e3` (#418 / Plan 255 AC7.2) for review-status changes.

## Findings

### F1 — City/route is not the discriminator (L1 Proven)

UAT public API, 2026-09-28:

| Request                                              | totalCount            |
| ---------------------------------------------------- | --------------------- |
| `q=Munchies&section=food`                            | 0                     |
| `q=Munchies&section=food&location=Berlin`            | 0                     |
| `q=Munchies&section=store` / `section=ummah`         | 0 / 0                 |
| `q=Munch&section=food` (prefix)                      | 0                     |
| `q=Burger&section=food` (sanity)                     | 18                    |
| `q=Burger&section=food&location=Berlin` (sanity)     | 2                     |
| `q=munchies&section=food&status=pending` (anonymous) | HTTP 403 (admin-only) |

The SSR HTML of `/food?q=Munchies`, `/food/berlin?q=Munchies` and `/food/berlin?q=Munchies&status=pending` all embed `"totalCount":0`. SSR ignores `status`.

Conclusion: without `status`, "Munchies" returns zero results both with and without the Berlin scope. Prefix/tsvector search works, since "Burger" and "Burg" both return 18. The only param that turns results on is `status=pending`.

### F2 — `status` changes the review-status predicate in both the RPC and the outer query (L1 Proven, code + POC)

[search.ts](../../src/services/providers/search.ts#L282-L286) and [search.ts](../../src/services/providers/search.ts#L312-L320):

- No `adminOptions.status` → `.eq('review_status','approved')` and RPC `review_status_filter: 'approved'`.
- `adminOptions.status='pending'` → `.eq('review_status','pending')` and RPC `review_status_filter: 'pending'`. The query runs on the service-role client, which bypasses RLS ([route.ts](../../src/app/api/providers/search/route.ts#L116)).

POC assertions (all passed):

| Scenario                                         | RPC `city_filter` | RPC `review_status_filter` | Outer `.eq('review_status', …)` |
| ------------------------------------------------ | ----------------- | -------------------------- | ------------------------------- |
| `/food?q=Munchies`                               | `null`            | `approved`                 | `approved`                      |
| `/food/berlin?q=Munchies`                        | `Berlin`          | `approved`                 | (approved)                      |
| `/food/berlin?q=Munchies&status=pending` (admin) | `Berlin`          | `pending`                  | `pending` (no `approved`)       |

The two routes therefore query **mutually exclusive** row sets: approved vs pending.

### F3 — The "Munchies" listing(s) have `review_status = 'pending'` (L2 Observed)

The reporter saw results only under `status=pending`. By F2, the only rows that can appear there have `review_status='pending'`, `listing_type='food'` and `address_city='Berlin'`. The public API returns nothing for any section or city (F1), so no approved Munchies row exists. This is L2 rather than L1 because the row itself was not read: there was no admin session or UAT DB access from this worker.

### F4 — The admin "All" tab is actually approved-only (L1 Proven, code)

- [AdminStatusFilter.tsx](../../src/features/admin/components/AdminStatusFilter.tsx#L36-L42) labels `value: null` as **"All"** and documents `null = all`.
- In [ProvidersContent.tsx](<../../src/app/(public)/providers/ProvidersContent.tsx#L178-L179>), `status = null` means no `status` is sent. F2 then forces `approved`.
- Plan 058's contract ([058 plan](../planning/closed/058-admin-review-in-providers-discovery-plan.md)) says: "Admin/moderator: sees all providers in all statuses", and the status tabs narrow that view.
- Since `643a36e3` (#418, 2026-09-26, AC7.2), the no-status path explicitly adds `.eq('review_status','approved')`. That is correct for public users. It also applies to admins, because the API route has no "admin + all statuses" branch: admin elevation only happens when `status` is present.

So an admin on `/food?q=Munchies` sees the **"All"** tab selected and zero results. Clicking **"Pending"** makes the listing appear. That matches the report.

### F5 — Plan 266 did not cause this (L1 Proven, git diff)

`a12aae1e` replaced the multi-query search with `search_providers_for_query`. It passed through the existing approved default: `review_status_filter: adminOptions?.status ?? 'approved'`, and the RPC `coalesce(review_status_filter,'approved')`. The outer `.eq('review_status','approved')` came earlier, in `643a36e3`. Plan 266 kept the behavior as it was.

A related detail: `search_scoped_suggestions` hard-codes `'approved'`, so admins never get suggestions for pending listings. This matches F4 and is not a separate defect.

### F6 — Branch enumeration (State-Machine heuristic)

| State (who / status param)                       | Review scope actually queried                                                                                     | Matches label/contract?                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Anonymous or non-admin, any route                | approved (RLS + explicit `.eq`)                                                                                   | Yes (AC7.2)                                                                  |
| Non-admin with `?status=…` in URL                | client drops it (`isAdmin` false) → approved; direct API call → 403                                               | Yes                                                                          |
| Admin, "All" (`status` absent)                   | **approved only**                                                                                                 | **No**: label and Plan 058 say all statuses                                  |
| Admin, "Approved"                                | approved                                                                                                          | Yes                                                                          |
| Admin, "Pending" / "Rejected" / "Needs Revision" | that status only (service role)                                                                                   | Yes                                                                          |
| Admin, first paint with any `status`             | SSR ignores `status` and renders approved data. The client skips `initialData` when `status` is set and refetches | Yes after hydration. Brief approved-only flash (L3, not verified in browser) |
| Admin while `useIsAdmin` is loading              | `status` evaluates to `null` → approved query, then refetch once admin resolves                                   | Transient, same as the row above (L3)                                        |
| Near-me active                                   | separate path (`useNearMe`); `status` not applied to the list                                                     | Not verified for review scope (out of scope)                                 |

## Root Cause

The URLs differ in **review-status scope**, not location scope. `/food?q=Munchies` runs an approved-only search. `/food/berlin?q=Munchies&status=pending` runs a pending-only search, available only to admins. Munchies exists only as a pending food listing (L2, F3). The Berlin segment has no effect (L1, F1).

The user-facing defect (L1, F4) is that the admin "All" tab, meaning no status, is labelled and specified in Plan 058 as "all statuses", but the search path always forces `review_status='approved'`. So an admin gets zero results under "All" for a listing that exists as pending.

## Expected Behavior on `/food`

| Audience                       | `/food?q=Munchies` expected result                                                                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public / non-admin             | **0 results, which is correct.** Pending listings must not appear in public search (AC7.2 / #415).                                                                                                                                                 |
| Admin/moderator, "All" tab     | Per the Plan 058 contract and the "All" label: **show Munchies**, i.e. all review statuses within the current section/city scope. Otherwise the tab label and contract must stop claiming "All". This choice needs product confirmation (see OQ1). |
| Admin/moderator, "Pending" tab | Show Munchies, with or without the city segment, if the row's `address_city` matches. This already works.                                                                                                                                          |

The city segment (`/food` vs `/food/berlin`) should only narrow by `address_city`. That is already how it behaves.

## System Weaknesses

1. **Overloaded meaning of "no status"**: `status` absent means "public approved-only" and also "admin All". The service layer has no way to tell them apart, because admin elevation depends on `status` being present.
2. **Label/contract drift**: the Plan 058 "All" semantics were never covered by a test. The #418 AC7.2 hardening changed admin behavior without anyone noticing.
3. **SSR/CSR scope divergence**: SSR ignores `status`, so admin HTML always starts as approved-only and depends on client refetch.
4. **Hidden-state UX**: a zero-result state gives admins no hint that non-approved matches exist.

## Instrumentation Gaps

| Signal                                                                                                         | Level  | Purpose                                              |
| -------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| `/api/providers/search` log field `review_scope` (approved/pending/…/all) plus `is_admin` boolean (no user id) | Normal | Triage "missing listing" reports by scope            |
| Zero-result searches: `q_length`, `section`, `city_present`, `review_scope` (no raw query)                     | Normal | Detect scope-driven empty results                    |
| RPC match count before and after the outer `.in()` re-filter                                                   | Debug  | Catch divergence between the RPC and the outer query |

## Test Infrastructure Notes

- POC pattern (mocked `getSupabaseClient` with a chainable builder that records `.eq` calls) is enough for service-level regression. Source used:

```ts
// src/__tests__/poc-267-scope.test.ts (throwaway, removed)
vi.mock('@/services/providers/client', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc, from: () => builder() }),
}));
vi.mock('@/services/badges', () => ({ getBadgesForEntities: async () => new Map() }));
// assert mockRpc.mock.calls[0][1] ⊇ { city_filter, review_status_filter } and eqCalls contains ['review_status', X]
```

- The API route needs an admin-branch test: admin + no `status` → the expected scope. None exists today; the 255 regression tests cover only the public AC7.2 path.
- The worktree had no `node_modules`, so `npm ci --ignore-scripts` was run locally to execute the POC.

## Remaining Gaps

| #   | Unknown                                                                                        | Blocker                                               | Required Action                                                                                                                                                                                                                                         | Owner          |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| G1  | Confirm the Munchies row(s) on UAT: `review_status`, `listing_type`, `address_city` (F3 is L2) | No admin session or UAT DB credentials in this worker | Admin runs `select provider_id, provider_name, review_status, listing_type, address_city from providers where to_tsvector('simple', provider_name) @@ search_prefix_query('Munchies');` on UAT, or opens `/food?q=Munchies&status=pending` with no city | User / QA      |
| G2  | Product intent for the admin "All" tab: all statuses (Plan 058) or approved-only (relabel)     | Product decision                                      | User confirms (OQ1)                                                                                                                                                                                                                                     | User → Planner |
| G3  | Admin first-paint flash of approved data before the status refetch                             | Needs a browser with an admin session                 | Observe in UAT during QA                                                                                                                                                                                                                                | QA             |
| G4  | Whether near-me results respect admin `status`                                                 | Out of scope                                          | Only if Planner widens scope                                                                                                                                                                                                                            | Planner        |

## Analysis Recommendations (next investigative steps)

1. Close G1 with the SQL above so F3 becomes L1.
2. Get the product decision on G2 before planning. It decides whether the fix changes data scope or labels.
3. During QA, check the admin "All" → "Pending" switch in a browser at both `/food` and `/food/berlin` to cover G3.

## Open Questions

- **OQ1**: For admins/moderators, should "All" on `/food` include pending/rejected/needs_revision listings, as Plan 058 specifies, or should the tab be renamed to reflect approved-only?
- **OQ2**: Should admin search suggestions (`search_scoped_suggestions`, hard-coded `'approved'`) follow the same decision?
