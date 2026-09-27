---
ID: 266
Origin: 266
UUID: 4f5bf2ef
Status: Active
---

# Code Review: Desktop search — suggestion/result parity and partial matching

**Plan Reference**: `agent-output/planning/266-desktop-search-partial-plan.md`
**Implementation Reference**: `agent-output/implementation/266-desktop-search-partial-implementation.md`
**Date**: 2026-09-27
**Reviewer**: Code Reviewer
**Session**: S266-desktop-search-partial

## Changelog

| Timestamp (UTC)   | Agent Handoff | Request                                                       | Summary                                                                                                                                                                                     |
| ----------------- | ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-26T21:31Z | Implementer   | Review migration 134, suggestion signature, and updated tests | Found one HIGH functional regression in empty mobile category search and one MEDIUM suggestion-quality defect. Verdict REJECTED.                                                            |
| 2026-09-27        | Implementer   | Re-review migration 134 and committed SQL tests               | Prior findings resolved; executable PGlite coverage added. Re-review found missing category-description GIN index and hardcoded labels in modified UI components. Verdict remains REJECTED. |
| 2026-09-27T06:48Z | Implementer   | Re-review round 2 fixes                                       | Both blocking findings resolved. Corrected two test assertions during review to preserve meaningful location-label and fallback-key coverage. Verdict APPROVED_WITH_COMMENTS.               |

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Alignment Status**: ALIGNED

The shared Postgres search RPCs, invoker security, and GIN-backed full-text matching align with the Postgres-first architecture. The category-description predicate now has a matching GIN expression index, satisfying Plan M2.6.

## Resolved Findings

### Resolved from prior review

- **HIGH: empty mobile category search** — resolved. `search_food_categories('')` now returns food categories ranked by approved-provider count, retaining the `LEFT JOIN` behavior; compatible empty-query behavior was also restored for `search_food_concepts`.
- **MEDIUM: unrelated provider suggestions** — resolved. Provider candidates now require exact-or-prefix matching against `provider_name`.
- Committed regression coverage now executes migration 134 in PGlite against a post-migration-006 schema. It caught an additional migration blocker (`providers.offers_ids` had been dropped); the function now joins through `provider_offers`.

### High

**[HIGH] i18n: hardcoded user-facing labels remain in modified components — RESOLVED**

- **Resolution**: The SearchBar Suspense fallback uses `t('search.placeholder')`. ProviderCard routes the location count, halal-level aria-label/title, and Approve/Reject text and accessible names through `t()` keys. All four new keys are present in `de`, `en`, `ar`, `tr`, `ur`, and `ps`. The German render test asserts the translated labels.
- **Review correction**: Updated the existing single-location assertion from `/Standorte/` to `/locations/`; the previous assertion no longer tested the rendered English label. Strengthened the fallback regression to require the `search.placeholder` key, not merely the absence of the former literal.

### Medium

**[MEDIUM] Performance/plan compliance: category-description predicate has no matching GIN index — RESOLVED**

- **Resolution**: Added `idx_categories_desc_simple_search` with the same `simple` tsvector expression as the name-plus-description predicate in `search_food_categories`. The name-only index remains for the provider-matcher and cuisine-suggestion predicates. The PGlite regression test disables sequential scans and requires an index scan in the plan.

### Current Findings

None. The two review-blocking findings are resolved. Translation wording in locales other than German and English should receive the usual native-speaker/UAT review; that is not a code-quality blocker.

## Review Scope Checks

### Migration 134

- `SECURITY INVOKER` is appropriate for the public search RPCs.
- User input is sanitized before construction of the `to_tsquery` prefix expression; no direct tsquery operator injection was found.
- Provider, menu, category-name, and category-name-plus-description expression indexes match their predicates. The new PGlite index test exercises the description predicate with sequential scans disabled.
- `src/__tests__/migrations/134-desktop-search-partial.test.ts` executes the migration and behavior against PGlite with a post-migration-006 schema. It is hand-maintained and does not enable RLS; I independently checked the provider SELECT policy and confirmed invoker execution remains subject to it.
- The migration must still be applied before application deployment; neither deploy workflow applies migrations.

### `fetchSearchSuggestions` signature

- The options object (`{ section, city, client }`) is safer than the initial positional design and all current repository call sites found by search use the new shape.
- The normal public result query defaults to approved rows. The status parameter is caller-controlled, but the invoker RPC is subject to provider RLS; the API route authenticates and authorizes admin status filters before using a service-role client. The updated Plan 255 test checks that suggestions do not read tables directly.

### Updated pre-existing tests

- `src/__tests__/regression/255-trust-boundaries.test.tsx`: not weakened; it asserts the new enforcement boundary and rejects direct table access.
- `src/__tests__/services/providers.test.ts`: updated for the new RPC and strengthens the policy assertion from ILIKE present to ILIKE absent.

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes, with one disclosed caveat.
**Concern**: The committed suite directly protects the primary behavior. The implementation table records the original matcher/tokenizer SQL checks as post-fix because the first-round `/tmp` harness was not test-first; review-round tests for the migration blocker, empty-query behavior, provider relevance, category descriptions, zero-provider categories, category index use, and round-2 i18n fixes were written before their fixes.

## Validation Evidence Reviewed

- Implementation document and current source diff.
- Repository search for all `fetchSearchSuggestions` call sites.
- Existing mobile search page contract for empty category queries.
- Baseline migration 107's empty-query branch and provider-count ordering.
- `git diff --check`: clean.
- The implementation document reports type-check, lint, and full Vitest passing (2609 passed, 28 skipped). Per Code Reviewer role, I did not execute tests; QA must rerun its gates after the two review-only test assertion edits.
- i18n scan: 4 modified components checked — no hardcoded user-facing labels found. The five formerly hardcoded labels now use translation keys, and all six locales contain the relevant entries.
- Migration index check: provider-name, menu, offers, needs, category-name, and category-name-plus-description indexes exist. The added PGlite regression checks index-plan use for the latter predicate.
- Static diagnostics: no errors in `ProviderCard-multi-location.test.tsx` or `ProviderCard-i18n-plan266.test.tsx` after the review-only assertion corrections.

## Positive Observations

- Reusing `search_providers_for_query` from `search_scoped_suggestions` is the right architectural direction for preventing suggestion/result drift.
- The options-object API avoids the positional `client` compatibility hazard.
- The trust-boundary test update preserves the security invariant at the new database enforcement point.
- The implementation caught and corrected an expression-index mismatch during local EXPLAIN validation.

## Verdict

**Status**: APPROVED_WITH_COMMENTS
**Rationale**: Both blocking findings are resolved: UI labels are localized in all supported locales, and the category-description predicate now has a matching GIN index. The implementation reports passing type-check, lint, and tests; this reviewer did not run tests. QA should rerun the focused migration/component tests and project gates after the review-only test assertion updates, then handle the documented browser/RTL verification.

## Required Actions

1. QA: run the project test, type-check, and lint gates, including migration 134 and the ProviderCard/SearchBar tests.
2. QA/UAT: perform the deferred browser verification, including RTL presentation and the new translated labels.

## Next Steps

Handing off to qa agent for test execution.
