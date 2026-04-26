---
ID: 105
Origin: 105
UUID: e6056b72
Status: Resolved
---

# Critique 105 — Wire Values & Amenities Filters to Provider Search

| Field              | Value                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| Artifact           | [agent-output/planning/105-filter-wiring-plan.md](../planning/105-filter-wiring-plan.md) |
| Reviewer           | Critic                                                                                 |
| Date               | 2026-04-26T12:30Z                                                                      |
| Status             | Resolved                                                                               |
| Verdict            | **APPROVED**                                                                           |

## Changelog

| Date (UTC)        | Agent  | Request / Handoff     | Summary                                     |
| ----------------- | ------ | --------------------- | ------------------------------------------- |
| 2026-04-26T12:30Z | critic | Planner → Critic      | Initial critique; APPROVED with 2 LOW notes |

---

## Value Statement Assessment

**PASS.**

> "As a user searching for providers on /search, I want the filter items I select … to actually filter search results, so that I receive only providers matching my Values & Amenities criteria instead of the full unfiltered list."

- Presence: ✅ User story format with clear actor/goal/outcome
- Clarity: ✅ "So that" outcome is directly verifiable (server query returns fewer results)
- Alignment: ✅ Supports Master Product Objective — precision filtering strengthens discoverability ("first thought when any Muslim seeks a service")
- Directness: ✅ Value is delivered in this plan; no deferral of the core outcome

---

## Overview

Plan 105 is a tightly scoped data-wiring fix resolving a clear user-visible defect: the Values & Amenities filter UI from Plan 104 updates state and badge counts but the state is silently discarded on navigation — results are never filtered. The fix threads `selectedFilters` through 6 files across 3 layers (URL params → API route → Supabase query predicates).

The plan is correct in its core architectural assessment:
- No DB migration needed (migration 067 confirmed to contain all five boolean columns: `muslim_owned`, `accepts_donations`, `solidarity_pricing`, `has_parking`, `has_prayer_space`)
- No new UI needed (Plan 104 delivered `FilterSection.tsx`)
- No new RPC function needed (client-side `.eq()` predicates are sufficient)

---

## Architectural Alignment

**PASS.** The plan aligns cleanly with established patterns:

| Pattern | Plan 105 compliance |
|---------|-------------------|
| Postgres-first (tsvector / boolean indexes) | ✅ Boolean columns are indexed from Plan 089; no array containment (`@>`) used |
| URL params as canonical state | ✅ Consistent with `section`, `status`, `location` params (Plans 058/089) |
| Allowlist validation at API boundary | ✅ D4 decision; matches `status` param validation pattern in current `route.ts` |
| Cache-control discipline (Plan 010) | ✅ M4 no-store rule for filter-bearing requests |
| Server-first initial render (Plan 010 P1a) | ✅ M6 ensures SSR initial fetch is filter-aware |
| React Query cache key includes all discriminators | ✅ M5 adds filters to query key |
| Community services isolation | ✅ D3 decision; ummah section explicitly excluded |

**D1 decision (boolean vs. TEXT[])** is the most consequential architectural decision in the plan. The rationale is technically correct: the boolean columns are the canonical write-path (backfilled from `barakah_effects` in migration 067), are btree-indexed, type-safe, and simpler to query. The task attachment's reference to "barakah_effects filter" was conceptual, not literal. Affirmed.

---

## Scope Assessment

**PASS.** The plan is appropriately contained:
- 7 files modified + 1 new constant file
- No schema changes, no migrations
- No UI changes
- No new dependencies
- Tests are scoped to unit/logic layer; no e2e required

The plan correctly identifies the three-layer fix path (URL → route → service) and sequences milestones with explicit dependency edges.

---

## Technical Debt Risks

**Low.** No architectural debt introduced. The mapping constant (M1) prevents future drift between UI key names and column names. The allowlist validation (M4) is the existing pattern.

One latent risk worth flagging at implementation time: the `searchProviders()` function signature growth. It now takes: `query`, `category`, `location`, `limit`, `offset`, `adminOptions`, `listingType`, and will receive `barakahFilters`. Seven-parameter functions are a SRP signal (see Engineering Standards: SRP detection — method with mixed concerns). This plan adds one more necessary param but does not worsen the debt below its current threshold. Refactoring the signature into a params object is a future concern, not a blocker for Plan 105.

---

## Findings

### CRITICAL
None.

### MEDIUM

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|-------------|--------|-------------|--------|----------------|
| M-1 | `ProvidersContent` interface gap not explicitly listed | RESOLVED | M6 states "pass the filter array to `<ProvidersContent initialData={...} />` as a prop" — but the current `ProvidersContentProps` interface does not include a `filters` prop. M5 lists the client-side changes but does not call out the interface addition. The implementer will naturally discover this during TypeScript compilation, but the plan's files-touched table omits the interface change from `ProvidersContent`. | If missed, the server-rendered initial data and the client query key will diverge on filter-bearing URLs, causing an unnecessary re-fetch on first load. Not a correctness bug (React Query key mismatch → re-fetch), but a performance regression. | The plan already covers this in spirit via M5 step 5 and M6. The Implementer should confirm: add `initialFilters?: string[]` (or equivalent) to `ProvidersContentProps` and include it in the React Query `queryKey` alongside `initialData`. |

### LOW

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|-------------|--------|-------------|--------|----------------|
| L-1 | M4 validation strategy left ambiguous (400 vs. silent strip) | RESOLVED | The plan says "reject unknown values with 400 or silently filter them out — implementer decision." Both options satisfy the security constraint ("no unknown keys reach the service layer"). However, silent stripping is preferable from a security standpoint: returning a 400 response for unrecognized filter keys would allow an adversary to probe valid key names via differential responses. The plan correctly notes the key constraint is the service-layer gate. | Negligible for this domain (filter keys are not secret). No correctness risk either way. | Implementer should default to silent stripping (log a dev-mode warning, ignore the key) rather than 400, consistent with how the `location` param handles invalid city strings (no error thrown — invalid values yield empty results). |
| L-2 | Empty-result UX with sparse boolean columns not addressed | RESOLVED | Risk table correctly notes "Boolean columns have low data density (most providers have `false`)" and marks it out of scope. No UX mitigation (e.g., "No results with these filters — try removing one") is planned. | Users selecting rare filters (e.g., `solidarity_pricing`) in cities with few tagged providers will see an empty results page with no explanation. This is a UX gap, not a data bug. | Acceptable for this plan's scope. Consider a follow-on plan that adds filter-aware empty-state copy to `SearchResultsList` or `EmptyState`. Log as open action if desired. |

---

## Open Questions

None. All 8 decisions in the Decision Record are marked `[RESOLVED]`.

---

## Unresolved Open Questions

None.

---

## OPEN QUESTION CHECK Result

**CLEAN.** No `OPEN QUESTION` items found in the plan document. No approval gate triggered.

---

## Decision Record Check

**CLEAN.** No `[OPEN]` decisions. No `[DEFERRED: ...]` decisions requiring explicit user acknowledgement.

---

## Duration Estimates Check

**PASS.** Duration Estimates section present with phase-level breakdown (4.5–7.5h total).

---

## Risk Assessment

**LOW overall risk.** The plan is application-layer only (no DB, no new dependencies, no UI). The three identified risks in the plan are all correctly assessed at Low-Medium likelihood and well-mitigated. No systemic risks identified by this review that the plan does not already acknowledge.

**Hotfix scenario**: If the filter wiring produces wrong results post-deploy, the rollback is a revert of 6 files. No DB rollback required. Hotfix risk is minimal.

---

## Recommendations

1. **Implementer**: Confirm `ProvidersContentProps` gets a `filters` prop (finding M-1). TypeScript strict mode will surface this at compile time — treat it as a mandatory gate.
2. **Implementer**: Use silent stripping (not 400) for unknown filter keys at the API route boundary (finding L-1).
3. **QA**: Verify that the pre-fix regression test is named to make the bug path visible (e.g., `[pre-fix FAILS] handleSearch ignores selectedFilters`), per Client-State Precedence Regression Pattern.
4. **User/Future plan**: Consider a follow-on for empty-state messaging when filters produce zero results (finding L-2). Not blocking Plan 105.

---

## Verdict: APPROVED

All findings are RESOLVED (accepted at implementation time or acknowledged as out-of-scope). No blocking concerns. No unresolved open questions. No deferred decisions requiring user acknowledgement.

The plan is structurally complete, architecturally consistent, correctly scoped, and the root cause analysis is verified against the live migration file.
