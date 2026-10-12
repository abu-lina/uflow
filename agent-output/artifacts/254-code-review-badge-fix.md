# Code Review: #254 post-QA badge fix (`8a4cea1c`)

**Commit**: `8a4cea1c` — "fix: filtered results badge shows the filtered category, not the primary (#254)"
**Scope**: that commit only. Everything before it is pushed, reviewed and CI-green.
**Spec reference**: `agent-output/artifacts/254-spec.md`; ADR `docs/adr/0001-provider-categories-primary-plus-junction.md`
**Prior reviews**: issue #254 Code Review comments (chunk A, chunk B, post-QA), `agent-output/artifacts/254-code-review-chunk-b.md`
**Date**: 2026-10-10
**Reviewer**: Code Reviewer (two-axis: Standards + Spec)

## Verdict

**Status**: ACCEPTED (APPROVED_WITH_COMMENTS)
**Findings**: 0 CRITICAL, 0 HIGH, 1 MEDIUM, 3 LOW, 1 INFO.
No finding blocks merge. The MEDIUM is documentation drift in a non-shipping artifact.

## Presentation-only claim: verified

The Fix phase claimed result set, ordering, matching, RPCs, the junction table and the edit UI are untouched. Confirmed:

- `git show 8a4cea1c --stat`: 14 files, zero under `supabase/`, zero migrations, zero registration/edit components, zero RPC SQL. No `.sql` file in the diff.
- The only non-presentation edit is a pure move: `isValidCategoryId` lifted out of `src/services/providers/search.ts` and `src/services/communityServices.ts` into `src/lib/categoryFilter.ts:12-20`. Both deleted copies are byte-identical in logic to the new one (same `ALL_CATEGORIES_LABELS` guard, same UUID regex, same falsy guard). No call-site semantics change; `search.ts:275` and `communityServices.ts:210` call it on the same values as before.
- `ALL_CATEGORIES_LABELS` is still imported and still used in `search.ts:281` (the fail-closed branch), so the move left no dead import.
- Matching is still `req.eq('provider_categories.category_id', category)` (`search.ts:364-369`) with no parent/child expansion, so the badge label is exactly the id that was filtered on. No way for the badge to assert a category the row does not hold.
- Everything else is prop threading: `renderProvidersPage` -> `ProvidersContent` (`:102,:111,:563`) -> `DiscoveryResultsGrid` (`:92,:154,:289`) -> `ProviderCard` (`:50,:79,:197`). One new optional prop at each level, default-undefined, so untouched call sites keep the old behaviour by construction.
- `ProviderCard`'s `category` prop is genuinely untouched: `:197` reads `displayCategory ?? category` for the badge only, while the fallback image path still reads `category?.category_images` (`:328`).

**Verified gates**: `npx tsc --noEmit` clean; `eslint` clean on all 7 changed source files; 83 tests pass across the 4 new suites (35 tests) plus the existing `ProviderCard.test.tsx` (48).

## Behavioural-change hunt (what I went looking for and did not find)

| Risk                                                        | Result                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stale badge after a client-side filter change               | Not reachable. The filter is applied by navigation (`src/lib/search-params.ts:36,90` builds `/food/<city>?category=<id>` and the app pushes it), and `?category=` navigation re-renders the server component, so `displayCategory` is recomputed with the results.  |
| Second grid instance missing the prop                       | Deliberate, not an omission. `ProvidersContent` renders two `DiscoveryResultsGrid`s: the near-me branch (`:539`) and the list branch (`:559`). Near-me is not category-filtered (no category in the near-me query path), so omitting the override there is correct. |
| Other `ProviderCard` surfaces silently flipped              | None. `DiscoveryResultsGrid` is the only grid that sets the prop; `RootPageContent.tsx` (home) reads no category param at all (`grep category` -> only result-mapping lines 201-202). `SearchMap` pins bind names, not cards.                                       |
| Community-service rows mislabelled in a filtered ummah grid | No. `searchCommunityServices` filters `category_id` directly (`communityServices.ts:210-212`), so a CS row in a filtered grid holds the filtered category as its primary and the override is a no-op for it.                                                        |
| Nonexistent-but-well-formed UUID filter                     | Safe both ways: search fails to the empty set, and `getCategoryById`'s `.single()` throws PGRST116, caught at `categoryFilter.ts:57` -> null label. No "filtered" label with no filter behind it.                                                                   |
| Extra query per render                                      | One `getCategoryById` on the `?category=<uuid>` form; zero on `/food/[city]/[category]`, which threads the already-fetched row as `routeCategoryRecord` (`page.tsx:480`). Reasonable; the page already does an SSR search query.                                    |

## Spec axis

**AC compliance**

- AC 4 ("each result card shows one category name") — HOLDS. Still exactly one badge; only the source changed.
- AC 5 (primary match ranks above secondary match) — untouched. No ordering code in the diff.
- AC 6 (category filter includes secondary holders) — untouched and now visibly coherent: the card no longer badges a category the user did not ask about.
- AC 22/23 (RPC signature, junction invariant) — untouched.

**Deliberate spec deviation, authorised**

The spec asserts the opposite of what shipped, in three places: `254-spec.md:15` ("the only one ever displayed"), `:17` ("Both rows still show the provider's own Primary Category name on the card"), `:278` (decision 5), and the display-surfaces note at `:513`. The post-QA user change request supersedes decision 5, and the commit amends ADR 0001 in the same change (`docs/adr/0001-…:32-34`), which is the repo's canonical decision record per `docs/agents/domain.md`. So this is an authorised deviation, not drift. The documentation gap is finding M1 below.

**Prior-review findings: none reopened**

- The chunk-B/post-QA MEDIUM about the sentinel list being hand-duplicated between `search.ts` and `communityServices.ts` is advanced, not regressed: both copies of `isValidCategoryId` now import one definition.
- `254-code-review-chunk-b.md` contains no display, badge or duplication finding to reopen.
- Fail-closed behaviour on an unrecognised category (`search.ts:281-286`, from `065c8abe`/`5f6cde34`) is preserved verbatim.

## Findings

### Critical

None.

### High

None.

### Medium

**[MEDIUM] Documentation**: spec artifact still asserts the superseded display rule with no pointer

- **Location**: `agent-output/artifacts/254-spec.md:15`, `:17`, `:278`, `:513`
- **Issue**: The ADR was amended but the spec was not annotated. The spec is what a QA re-run reads for acceptance criteria, and it says in four places that the primary is the only category ever displayed. A reviewer or QA pass starting from the spec would file the shipped badge as a regression. The Fix phase chose to treat the spec as a historical record, which is a defensible convention, but then the record needs a forward pointer.
- **Recommendation**: One line under decision 5: "Superseded post-QA by the ADR 0001 amendment (`8a4cea1c`): while a category filter is active, the card badges the filtered category." No rewrite of the surrounding prose.

### Low

**[LOW] DRY**: the `displayCategory` shape is retyped inline in three files

- **Location**: `src/app/(public)/providers/ProvidersContent.tsx:102`, `src/features/search/components/DiscoveryResultsGrid.tsx:92`, `src/features/providers/components/ProviderCard.tsx:50`
- **Issue**: `{ name_de: string; name_en?: string } | null` is written out three times although `FilteredCategoryLabel` now exists as the canonical name (`src/lib/categoryFilter.ts:24`). Structural typing keeps it correct today; the cost is that adding a field (a slug, an icon) means editing four places and `tsc` won't point at the three stale ones.
- **Recommendation**: `import type { FilteredCategoryLabel } from '@/lib/categoryFilter'` in the three components. The module is pure (its only import is a constants file), so a client component can take the type without pulling anything server-only.

**[LOW] Observability**: the resolver swallows every fetch error without a trace

- **Location**: `src/lib/categoryFilter.ts:56-59`
- **Issue**: `catch { return null }` is the right default (degrade to the primary badge, never an unlabelled filter), and the common throw is `getCategoryById`'s `.single()` PGRST116 for a nonexistent id, where logging would be noise. But a genuine Supabase outage during SSR now produces a silently primary-badged filtered list with nothing in the logs, which is the exact failure mode `search.ts:282` goes out of its way to make loud.
- **Recommendation**: log at warn level when the error code is not PGRST116, reusing `sanitizeLogValue` on the id as `search.ts:283` does.

**[LOW] Correctness (narrow)**: a context-only category filter gets no badge override

- **Location**: `src/app/(public)/providers/ProvidersContent.tsx:163`
- **Issue**: the client falls back to the search context's `selectedCategory` when `?category=` is absent. In that state the client-side query is category-filtered but the server-resolved `displayCategory` is null, so cards badge the primary; the exact inconsistency this commit set out to remove, in a corner it doesn't cover. Reachability is low (the URL is the canonical source and navigation always writes the param) and the fallback is the old behaviour, so nothing regressed.
- **Recommendation**: no change now. Note it in the ADR amendment as a known edge, or drop the context fallback in a later cleanup once it is shown dead.

### Info

**[INFO] Design**: badge and fallback imagery can now disagree

- **Location**: `src/features/providers/components/ProviderCard.tsx:197` vs `:328`
- **Issue**: the badge follows the filter, the fallback stock image still comes from the primary category's `category_images`. A card badged "Kebab / Döner" can carry the Turkish stock photo. The inline comment says this is intentional, and it is the conservative choice (the image is about the business, the badge about the query).
- **Recommendation**: FYI for design. No code change.

## TDD compliance

**Table present**: yes, in the Fix phase comment (red-first: 12 failing -> 35 passing).
**Verified**: the 35 claimed tests exist and pass, split exactly as claimed: `src/__tests__/lib/category-filter.test.ts` (19), `render-providers-page-display-category.test.tsx` (10), `ProviderCard-display-category.test.tsx` (4), `discovery-results-grid-display-category.test.tsx` (2). All six `ALL_CATEGORIES_LABELS` sentinels are covered individually, including the `ur`/`ps` pair that an earlier review found missing.
**Concern**: none. Coverage matches the behaviour change, including the negative cases (no prop -> primary, bogus -> null, throw -> null).

## Positive observations

- The sentinel/UUID predicate was consolidated instead of copied a third time, closing the drift trap a prior review flagged on this same branch rather than widening it.
- `resolveFilteredCategoryLabel` takes `fetchById` by injection, which is why the 19-test suite needs no Supabase mock and the module stays pure.
- `routeCategoryRecord` reuses the row the slug route already fetched for its 404 check, so the common SEO URL costs zero extra queries.
- The ADR amendment explains _why_ the spec-time rule was wrong in front of a real user rather than just restating the new behaviour, and names the superseded decision.
- Every new prop is optional and unset by default, so the five other `ProviderCard` surfaces keep the primary without a single edit.

## Required actions

None blocking. Recommended before close: M1 (one supersession line in the spec). The three LOWs are fine as follow-ups.

## Next steps

Hand to QA for a re-run of the filtered-badge scenario, or close the change request if the Fix phase's live verification on `:3000` is accepted as the QA evidence.
