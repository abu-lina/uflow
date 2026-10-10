# #254 post-QA defect: "/food category filter returns unfiltered results"

Verdict: **PRE-EXISTING**. Not caused by PR #599.

## Reproduction (branch, :3000, live local Supabase)

| URL                                              | Result                          | Correct?                    |
| ------------------------------------------------ | ------------------------------- | --------------------------- |
| `/food` (no filter)                              | all 4 QA providers              | yes                         |
| `/food?category=9026edb0-…` (Kebab / Döner UUID) | QA Doener Palast, QA Kebab Haus | **yes**                     |
| `/food/berlin/kebab-doener`                      | QA Doener Palast, QA Kebab Haus | **yes**                     |
| `/food?category=Kebab / Döner` (name)            | all 4                           | no, filter silently dropped |
| `/food?category=b73bd3cf-…` (Italienisch UUID)   | QA Multi Cucina                 | yes                         |
| `/food/berlin/italian`                           | QA Multi Cucina                 | yes                         |
| `/food?category=Italienisch` (name)              | all 4                           | no, filter silently dropped |

The #254 feature works: QA Doener Palast matches on its **secondary** Kebab / Döner, appears **once**, and still displays Türkisch (its primary).

## The query layer is correct

Direct PostgREST with the exact shape `search.ts` builds:

```
GET /rest/v1/providers
  ?select=provider_name,category_id,provider_categories!inner(category_id)
  &review_status=eq.approved
  &listing_type=eq.food
  &provider_categories.category_id=eq.9026edb0-490a-4395-a3d7-27c5eacde0e2
```

Returns exactly QA Doener Palast and QA Kebab Haus, one row each. `!inner` does not multiply parents, so `count: 'exact'` stays right. The Chunk A review's `.in()`-truncation concern does not apply: no id-set is used.

Chat path via PostgREST RPC `search_providers_chat` with the same category UUID returns `['QA Kebab Haus', 'QA Doener Palast']`. Also correct.

## Root cause

`src/lib/search-params.ts:19-24`

```ts
if (city) {
  path += `/${slugify(city)}`;
  if (categorySlug) {
    // <-- only reachable when a city is set
    path += `/${categorySlug}`;
  }
}
```

The category segment is nested inside `if (city)`. Select a category on `/search` without picking a city and `buildSearchResultsUrl` (called at `src/app/(public)/search/page.tsx:590`) produces the bare string `/food`. The category is discarded with no error, no param, no fallback.

Verified by executing the function body:

```
city=Berlin, cat=kebab-doener -> /food/berlin/kebab-doener
city=null,   cat=kebab-doener -> /food
```

That is exactly the user's URL and exactly the user's symptom.

Contributing factor, same silent-drop class: `isValidCategoryId` (`src/services/providers/search.ts:66-73`) returns false for any non-UUID and the caller then omits the constraint entirely rather than failing loudly.

## Why this is not a regression

Every file on the path from "user clicks Döner" to "category reaches the query" is **byte-identical to `main`**. `git diff main --stat` reports zero changes for:

- `src/lib/search-params.ts`
- `src/app/(public)/search/page.tsx`
- `src/app/(public)/providers/renderProvidersPage.tsx`
- `src/app/(public)/providers/ProvidersContent.tsx`
- `src/app/(public)/food/[city]/[category]/page.tsx`
- `src/features/search/components/WasCategoryResults.tsx`
- `src/features/search/components/SearchContextBar.tsx`
- `src/app/api/providers/route.ts`

`isValidCategoryId` is also unchanged. The only file #254 touched here is `search.ts`, and it is proven correct above.

Additional discriminator: the failure is **identical for Italienisch**, a primary-only category with no junction involvement. If the new `!inner` embed were at fault, primary-only filters would still work. They fail the same way. That rules out the embed.

## Honest caveat on the branch-vs-main run

I did check out `main` in a throwaway worktree at `/tmp/uflow-main-254` and ran it on :3100 against the same database. **A behavioral comparison was not possible.** Migration 139 adds a second FK path between `providers` and `categories`, so `main`'s unhinted `categories(...)` embed is ambiguous and every provider query throws:

```
PGRST201: Could not embed because more than one relationship was found for 'providers' and 'categories'
hint: Try changing 'categories' to one of the following:
      'categories!providers_category_id_fkey', 'categories!provider_categories'
```

`main` renders **zero** providers on `/food` regardless of filter. Log kept at `/tmp/main254-pgrst201.log`. Reverting migration 139 to get a clean comparison would have disturbed the seeded QA data the user is actively testing, so I did not.

So "pre-existing" rests on source identity of the eight files above plus the positive branch tests, **not** on a `main` behavioral run. The evidence is strong but it is of that kind, and I am not claiming more.

Side note worth keeping: that PGRST201 confirms the FK hints added across the 18 embed sites are load-bearing once migration 139 lands. Anything on `main` not carrying the hint breaks at runtime after merge. Worth a grep sweep for remaining unhinted `categories(` embeds before merge.

## Ranked hypotheses

1. **`buildResultsUrl` drops the category when no city is selected.** Confirmed by direct execution plus end-to-end URL reproduction. **This is the cause.**
2. `isValidCategoryId` silently drops non-UUIDs instead of erroring. Real, and it is why hypothesis 1 produces a wrong-but-quiet page instead of a 400. Contributing, not root.
3. `!inner` embed or the conditional around it is broken. **Ruled out**: direct PostgREST returns the right two rows, and primary-only categories fail identically.
4. Broken select-string concatenation at `search.ts:276`. **Ruled out**: `/food?category=<uuid>` returns correctly filtered results through that exact code path.
5. Chat path affected. **Ruled out**: RPC returns the right two providers.

## Recommended fix (not implemented)

Smallest correct change, in `src/lib/search-params.ts`:

Move the category out of the `if (city)` block. When no city is selected, fall back to the query-param form on the bare section path, `/food?category=<categoryId>`, since `renderProvidersPage` already reads `params.category` and handles a UUID correctly (proven above). `buildSearchResultsUrl` already has `selectedWas.categoryId` in hand at line 106; today it only forwards `categorySlug`.

Second, separate change: make the `isValidCategoryId` rejection observable. A category value that arrives non-UUID is always a bug upstream, and it should log or 400 rather than quietly widening the result set.

Scope: this is a separate issue, not a change to PR #599.
