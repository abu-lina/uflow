### Phase: Grill — Done

- Issue: #254
- Worktree: /Users/NARAFIQ/Projects/uflow-wt/254-multiple-categories-per-provider
- Branch: feature/254-multiple-categories-per-provider
- Flow: feature / Grill -> Spec -> Implement -> Code Review -> QA -> Done

## Verified DB state (ground truth)

Queried the running local Supabase at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Caveat up front: the local DB has **3 providers, all with `category_id IS NULL`**, so every _row-count_ claim about production is unverified. Schema and function bodies below are verified.

| Claim                         | Verified state                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider_categories` exists? | **No.** 39 public tables; no junction table.                                                                                                                                                                                                         |
| `providers.category_id`       | `uuid`, **nullable**, FK `providers_category_id_fkey -> categories(category_id) ON DELETE SET NULL`. No unique/check constraints on it.                                                                                                              |
| `categories` columns          | `category_id, name_de, name_en, description_de, description_en, category_images, applicable_section (text NOT NULL default 'all'), category_type (category_type_enum, nullable), slug (nullable)`                                                    |
| `category_type_enum`          | `cuisine, dish_type, dietary, meal, store_type`                                                                                                                                                                                                      |
| `listing_type_enum`           | `food, store, ummah`                                                                                                                                                                                                                                 |
| Category rows                 | 57 total: 6 at `applicable_section='all'` (untyped), 41 `food`, 10 `store`.                                                                                                                                                                          |
| `search_providers_chat`       | 14 args, `plpgsql`. Matching is `AND (p_category_filter IS NULL OR p.category_id = p_category_filter)`. Ordering is `CASE WHEN p_search_query='' THEN 0.0 ELSE 1.0 END, rank DESC, p.created_at DESC`, where `rank` is `ts_rank` over `provider_name |     | provider_description` only. **Category plays no part in ranking today, only in filtering.** |
| RLS                           | `providers` has 4 policies (public sees approved, users see/update/delete own, admins all). `categories` is admin-write, public-read. A new junction table needs its own policies; it gets none for free.                                            |

### The category taxonomy is already two overlapping generations

This matters for the issue's own example. `Türkisch` (`232c2870-…`) sits at `applicable_section='food'` with `category_type = NULL`, alongside `Afghanisch`, `Arabisch`, `Persisch`, `Balkan`, `Bäckerei`, `Amerikanisch` and 11 more untyped food categories. Meanwhile migration 100 added a _typed_ `cuisine` set: `Chinese, French, Greek, Indian, Italian, Japanese, Mediterranean, Thai`. `Kebab / Döner` (`9026edb0-…`) is `dish_type`.

So "Turkish restaurant that serves Döner" spans an untyped legacy row and a `dish_type` row. Multi-category will make the duplication more visible, not less: nothing stops a provider getting both `Mediterran` (cuisine) and `Türkisch` (untyped). Also note `Amerikanisch` has `slug = NULL`, which breaks the `/food/[city]/[category]` route for it.

## Corrections to the issue body

**The "Notes" claim about multi-select is wrong.** The issue says "The registration UI already has multi-select support (QuickReplies with singleSelect=false)". The opposite is true for the category step specifically:

- `src/features/chat/hooks/useChat.ts:8` — `const SINGLE_SELECT_RE = /(?:kategorie|küche|küchenart)/i`
- `useChat.ts:140,188` — `singleSelect: SINGLE_SELECT_RE.test(last.content || '')`

The assistant's category question contains "Kategorie" or "Küche" by construction (`system-prompt.ts:96`), so `singleSelect` is forced **true** exactly at the category step. It renders as a single-pick list (`ChatMessage.tsx:80-93`), not `QuickReplies`. Multi-select is a code change, not a free lunch.

Two more things in that path:

- `QuickReplies.tsx:18` decides multi-select by content heuristic: `!singleSelect && (options.length >= 3 || o.includes('?') || o.includes('(Ja') || o.includes('Nein'))`. Any 3+ option list silently becomes multi-select. Flipping the category step just by deleting the regex would be an accidental, fragile fix.
- `tool-executor.ts:154,206` — `register_provider` declares `category_id: {type: 'string'}` and lists it in `required`. It must become an array (or gain a second array field) for the LLM to send more than one.

**"Category search already resolves name to UUID via ILIKE lookup"** is true but weaker than it sounds: `tool-executor.ts:238-246` and `509-515` both do `.ilike('name_de', '%' + x + '%').limit(1)` with no ordering, so the match is arbitrary when several categories contain the substring. With N names per registration, that ambiguity multiplies and there is no "did you mean" path, only a hard throw at `tool-executor.ts:518`.

## The one-to-one assumptions I found (full read-path inventory)

596 matches for `category_id|categoryId` across 134 files in `src/`. The ones that actually assume cardinality one:

**Hard invariant, must be enforced or the model breaks:**

1. `src/features/providers/services/create-provider.server.ts:89-105` — `resolveListingType()` reads the chosen category's `applicable_section` and that becomes `providers.listing_type`. With multiple categories this is **ambiguous**: pick two categories from different sections and `listing_type` is undefined behaviour.
2. `src/utils/categoryUtils.ts:7-13` — `shouldCreateCommunityService()` hardcodes `4470c3e0-…` ("Gemeinschaft & Spenden") and decides `entityType: 'community_service' | 'provider'` from the single category (`create/basics/category/page.tsx:144-146`). The _kind of entity created_ is derived from the one category.

**Matching paths that would disagree with chat search (consistency gap):**

3. `search_providers` / `search_providers_enhanced` (RPC) — `AND (category_filter IS NULL OR p.category_id = category_filter)`. These back the main web search.
4. `src/services/providers/search.ts:338-340` — `req.eq('category_id', category)` direct PostgREST filter.
5. `get_filtered_category_ids_by_search` (RPC) — `SELECT DISTINCT p.category_id`, drives the facet list. Secondary categories would never appear as available facets.
6. `get_filtered_cities_by_search` (RPC, line 19) — city facet counts filtered by `p.category_id`.
7. `search_food_near_me`, `search_scoped_suggestions`, `search_providers_for_query` — all join/filter on `p.category_id`.
8. `search_food_categories` (RPC) — `count(DISTINCT p.provider_id)` via `LEFT JOIN providers p ON p.category_id = m.category_id`. This is the **provider count shown on category tiles**; it would understate every secondary membership.

**Display paths (read the primary only; arguably correct to leave alone):**

9. `src/hooks/useImageFallback.ts:72-77` — gallery images for a category are sourced by `.eq('category_id', categoryId)` on `providers`.
10. `src/services/providers/map-pins.ts:55` — map pin label/image from the embedded single `categories(...)` join.
11. `ProviderCard.tsx`, `ProviderDetailPage.tsx:116,126`, `ProviderDetailModal.tsx:160,171`, `MobileProviderDetail.tsx`, `SearchResultsList.tsx:86`, `DiscoveryResultsGrid.tsx` — all render one category name.
12. `src/app/(public)/food/[city]/[category]/page.tsx:77` — SEO route resolves slug to one `category_id` and passes it as `routeCategory`. Secondary members would be absent from their own SEO page.
13. `src/lib/route-guard.ts:190-196` + `search.ts:335-345` — slug validity cache.

**Write/ingest paths:**

14. `upsert_joinhalal_providers` (RPC) — sets and `EXCLUDED`-updates a single `category_id`.
15. `src/lib/import/joinhalal.ts` (14 refs) and `src/lib/enrichment/cuisine-category-mapper.ts` — maps a scraped cuisine string to exactly one `category_id`; auto-enrichment applies it.
16. `admin_update_provider` (RPC, lines 40-42) — patches `category_id` from a JSONB payload. Admin edit UI (`ProviderEditForm.tsx:150,200,493,667`) is a single select.
17. Self-serve category edit: `app/(public)/profile/providers/[id]/edit/category/page.tsx`, `app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx`, `create/basics/category/page.tsx`, `create/recommend/category/page.tsx` — four single-select screens.

**Category-keyed side data (not provider-keyed, so unaffected but worth knowing):**

18. `get_suggested_offers_for_category(p_category_id)` / `get_suggested_needs_for_category` and `src/services/category-suggestions.ts` — offer/need suggestions are keyed to _one_ category. If a provider has 3 categories, which category's suggestions do you show during registration? Today: the primary's.

No sitemap or robots generator exists (`find src -iname '*sitemap*'` is empty), so the SEO exposure is limited to the `/food/[city]/[category]` route. No database views exist (`information_schema.views` is empty for `public`), so nothing hidden there.

## Decisions reached

**D1. The junction-table shape is right, but not for the reason the issue gives.** The decisive fact is item 1 above plus the 134-file surface: a single `category_ids uuid[]` column loses the FK and the `ON DELETE SET NULL` semantics, and an `is_primary`-flag-only model (dropping `category_id`) forces every one of the read paths 3-17 to change in one pass. Junction + retained `category_id` lets this ship as one implement phase. Recorded as `docs/adr/0001-provider-categories-primary-plus-junction.md` (status: proposed).

**D2. The dual source of truth is justified only if the DB enforces the overlap.** Not two independent truths: `provider_categories` is the complete set, `providers.category_id` is a _pointer into it_. So:

- no `is_primary` column (a second definition of "primary" is exactly the sync bug the brief worries about);
- the junction always contains a row equal to `category_id`, kept true by a trigger on `providers` INSERT/UPDATE OF `category_id`, and by a BEFORE DELETE trigger on the junction that refuses to delete the primary row;
- answering the brief's question directly: `category_id` can never be absent from the junction rows; that state is unrepresentable.

**D3. Backfill is in-scope and in the same migration.** Not "considered". `INSERT INTO provider_categories (provider_id, category_id) SELECT provider_id, category_id FROM providers WHERE category_id IS NOT NULL ON CONFLICT DO NOTHING;` Without it, the moment `search_providers_chat` switches to `EXISTS (junction)` every existing provider becomes unfindable by category. Row count in production is unverified from here (local has 0 non-null `category_id`), so the migration must also be safe at zero rows.

**D4. Matching must use `EXISTS`, not a join.** A `JOIN provider_categories` multiplies rows when a provider matches on more than one category, and the current RPC has no `DISTINCT`. With `p_category_filter` scalar today it is one row max, but the fix should be written join-free so adding a multi-category filter later does not reintroduce duplicates.

**D5. Ranking changes, minimally.** A provider whose _primary_ category matches should outrank one matching on a secondary. Add one tiebreak ahead of `rank DESC`: `CASE WHEN p.category_id = p_category_filter THEN 0 ELSE 1 END ASC`. Safe because the existing leading `CASE WHEN p_search_query='' ...` term is constant per query and is a no-op in practice.

**D6. Cap enforced in the DB.** The UI and the LLM both get it wrong eventually; the trigger does not. Recommend 5 total (1 primary + 4 secondary) via a constraint trigger, mirrored in the UI and in the tool JSON schema description. Number is Q2 below.

**D7. Section invariant enforced in the DB.** Every junction category must have `applicable_section` equal to the provider's `listing_type` or `'all'`. Without it, item 1 is a live data-corruption path. Whether `'all'` categories are allowed is Q3 below.

**D8. Glossary written.** Created `GLOSSARY.md` at the root (neither it nor `docs/adr/` existed). Terms: Provider, Listing Type, Category, Primary Category, Secondary Category, Category Type, Applicable Section. The important sharpening: the issue says "primary display category", and that is the right concept, but it is _display and derivation_, not just display, since `listing_type` and `entityType` are derived from it.

**D9. Out of scope for this pass, deliberately.** Read paths 3-18 keep reading `category_id` and will undercount secondary membership. Shipping them all is a different, much larger change. This is Q1, the biggest open question.

## Open questions

1. **Read-path scope.** Does this pass fix matching _only in the chat RPC_ (`search_providers_chat`, as the issue's "Affected files" implies), or also the web search (`search_providers`, `search_providers_enhanced`, `src/services/providers/search.ts`), the facet lists (`get_filtered_category_ids_by_search`, `get_filtered_cities_by_search`), and the category tile counts (`search_food_categories`)? Chat-only means a user who finds a Döner place via the assistant cannot find it by the same filter on the web search page, which is a visible inconsistency.
   ➡️ Recommendation: chat RPC only this pass, matching the issue's stated files, and open a follow-up issue for web search + facets + counts. Reason: the facets and the tile counts are not just a WHERE-clause swap, they change displayed numbers and would need their own QA; bundling them puts a 6-RPC change into one implement phase. Accept the inconsistency for one release and say so in the PR.

2. **Cap on categories per provider.** How many? Recommend **5 total (1 primary + 4 secondary)**, enforced by a DB constraint trigger as the source of truth, with the UI and the tool schema both told the same number. Reason: it bounds the LLM's enthusiasm, keeps the cards readable if secondary categories ever get displayed, and 5 covers the realistic case (cuisine + 2 dish types + dietary). Say no cap if you would rather not litigate the number, but then it has to be no cap, not "the UI happens to limit it".

3. **May a secondary category cross sections, or be an `applicable_section='all'` category?** Recommend **no on both**: all categories must have `applicable_section = provider.listing_type`, excluding `'all'`. Reason: `resolveListingType()` (`create-provider.server.ts:89-105`) derives `listing_type` from the category's section, and `shouldCreateCommunityService()` branches on one specific `'all'` category id to decide whether a _provider_ or a _community service_ gets created. Allowing `'all'` categories as secondaries means a food provider could carry "Gemeinschaft & Spenden" and the two derivations contradict each other.

4. **Who can set secondary categories?** Chat registration only (the issue's scope), or also the admin edit form (`ProviderEditForm.tsx` / `admin_update_provider`) and the four self-serve category screens? Recommend **chat registration + admin edit**. Reason: without admin edit there is no way to correct an LLM mistake or to act on the backfill, which makes the feature unmaintainable on day one. The self-serve screens are four separate single-select UIs and can wait.

5. **Should a secondary-category match rank below a primary-category match?** Recommend **yes**, via the one-line tiebreak in D5. Confirm, because it changes result order for existing single-category providers too (it won't reorder them in practice, since they all match on primary, but it is a behaviour change to the RPC's contract).

6. **Do secondary memberships count toward the provider counts on category tiles and the facet lists?** Tied to Q1. Recommend **no this pass**: "17 Restaurants" under the Döner tile would change to include every Turkish place that also does Döner, which is arguably more correct but is a user-visible number change that deserves its own decision.

7. **Is the `category_type` mess a prerequisite?** 17 food categories have `category_type = NULL` and overlap semantically with the 8 typed `cuisine` rows; `Amerikanisch` has no slug. Recommend **separate issue, not a prerequisite**. Multi-category works fine over a messy taxonomy; it just makes the mess easier to see. But flag it, because the obvious next request ("let users filter by cuisine _and_ dish type") does need `category_type` populated.

8. **Approve ADR 0001?** It is currently `status: proposed`. Recommend accepting it: the decision is hard to reverse (a data model plus a backfill), surprising without context (a future reader will ask why `category_id` survived alongside a junction table), and the result of a real trade-off (array column and `is_primary`-only were both genuinely considered).

## Acceptance criteria (paste into the issue body)

**Schema**

- [ ] `provider_categories (provider_id uuid NOT NULL, category_id uuid NOT NULL)` exists, PK `(provider_id, category_id)`, both FKs `ON DELETE CASCADE`, plus an index on `(category_id)` for the reverse lookup.
- [ ] No `is_primary` column. The primary category is `providers.category_id` and nothing else.
- [ ] RLS enabled with policies mirroring `providers`: public `SELECT` restricted to rows whose provider is approved; `INSERT`/`UPDATE`/`DELETE` for the provider's owner/creator or an admin.
- [ ] A trigger on `providers` (INSERT, UPDATE OF `category_id`) inserts the new primary into the junction and does not remove the old one.
- [ ] A trigger on `provider_categories` BEFORE DELETE raises if the row being deleted equals `providers.category_id` for that provider.
- [ ] A constraint trigger rejects an insert whose category's `applicable_section` is not the provider's `listing_type` (per Q3).
- [ ] A constraint trigger rejects an insert that would take the provider above the cap (per Q2).

**Backfill**

- [ ] The same migration backfills one junction row per provider with a non-null `category_id`, idempotently (`ON CONFLICT DO NOTHING`), and runs clean against an empty `providers` table.
- [ ] After the migration, `SELECT count(*) FROM providers WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM provider_categories pc WHERE pc.provider_id = providers.provider_id AND pc.category_id = providers.category_id)` returns 0.

**Search**

- [ ] `search_providers_chat` matches `p_category_filter` against **any** of the provider's categories, implemented as `EXISTS (SELECT 1 FROM provider_categories ...)`, never a join.
- [ ] A provider returns exactly once no matter how many of its categories match.
- [ ] Primary-category matches sort ahead of secondary-category matches at equal text rank (per Q5).
- [ ] The function signature and return columns are unchanged, so no caller needs updating.
- [ ] Regression: a single-category provider returns identically to before for the same arguments.

**Registration**

- [ ] `register_provider`'s tool schema accepts multiple categories; the first is the primary and the rest are secondary.
- [ ] Each supplied category name resolves to a UUID; an unresolvable name fails with the existing German error rather than being silently dropped.
- [ ] The category step in chat renders as multi-select, and the change is explicit rather than a side effect of `SINGLE_SELECT_RE` or the `options.length >= 3` heuristic in `QuickReplies.tsx:18`.
- [ ] `listing_type` is still derived deterministically, from the primary category only.
- [ ] Registering with one category produces the same `providers` row as today, plus one junction row.

**Admin (per Q4)**

- [ ] The admin provider edit form can add and remove secondary categories; `admin_update_provider` persists them.
- [ ] Removing the category that is currently primary is rejected with a usable message, not a 500.

**Explicitly not in this change** (document in the PR, per Q1 and Q6)

- [ ] `search_providers`, `search_providers_enhanced`, `src/services/providers/search.ts`, `get_filtered_category_ids_by_search`, `get_filtered_cities_by_search`, `search_food_near_me`, `search_scoped_suggestions`, `search_providers_for_query` still match on the primary only.
- [ ] `search_food_categories` provider counts, `useImageFallback` galleries, map pin labels, provider cards, and the `/food/[city]/[category]` SEO route still reflect the primary only.
- [ ] The joinhalal import and auto-enrichment (`cuisine-category-mapper.ts`) still assign exactly one category.
