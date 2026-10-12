# Spec: multiple categories per provider (#254)

Vocabulary is `GLOSSARY.md`: **Primary Category** = `providers.category_id`, **Secondary Category** = a junction-only row. The user's words "main category" and "additional categories" map onto those. German UI labels: `Hauptkategorie` / `Weitere Kategorien`.

Every schema claim below was checked against the running local Supabase (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`) and every trigger behaviour was executed there inside a rolled-back transaction. Probe script: `agent-output/artifacts/254-ddl-probe.sql`. Unverified claims are labelled.

## Problem Statement

A Turkish restaurant that sells Döner can only be filed under one category. Whichever one the owner picked, the other search misses them: file under `Türkisch` and nobody searching Döner finds you, file under `Kebab / Döner` and nobody searching Turkish finds you. The user's ask, verbatim: "A user should use their search and if they search for Turkish and someone has this as a second category they should be listed as well as the one who has it as a primary category."

Two constraints from the same user, also verbatim: a provider must not be "listed twice", and must not be "shown with more than one category in the same search".

## Solution

A provider gets up to five categories. One is the Primary Category, which is the only one ever displayed and the only one `listing_type` and `entityType` are derived from. The rest are Secondary Categories: they make the provider match in search, and are invisible everywhere else.

_Display rule superseded post-QA by commit `8a4cea1c` (ADR 0001 amended in the same commit): while a category filter is active, the result card shows the filtered category, not the Primary._

Searching "Turkish" returns both the restaurant that has `Türkisch` as Primary and the one that has it as Secondary, once each, with the Primary match ranked higher. Both rows still show the provider's own Primary Category name on the card.

_Superseded the same way: with a category filter active, both cards show the filtered category (commit `8a4cea1c`, ADR 0001 amended)._

Secondary Categories are set in edit mode only, by an admin or by the provider's owner. Chat registration is unchanged: it still collects exactly one category.

## User Stories

1. As a visitor searching "Türkisch", I want providers whose Secondary Category is `Türkisch` in my results, so that I find the Turkish place that happens to be filed under Döner.
2. As a visitor searching "Döner", I want providers whose Secondary Category is `Kebab / Döner` in my results, so that the filing choice of the owner stops hiding them from me.
3. As a visitor, I want each provider to appear exactly once however many of its categories match, so that the result list is not padded with duplicates.
4. As a visitor, I want each result card to show one category name, so that the list stays scannable.
5. As a visitor, I want a provider that matched on its Primary Category to rank above one that matched only on a Secondary Category, so that the closest fit is at the top.
6. As a visitor filtering by a category tile on the website, I want providers that hold that category as a Secondary Category included, so that the filter agrees with the free-text search.
7. As a visitor using the chat assistant, I want the same behaviour as the website search, so that the two do not disagree about who exists.
8. As a visitor whose query matches no category at all, I want results identical to today, so that nothing regresses.
9. As a provider owner in edit mode, I want to add up to four Secondary Categories, so that people find me under every term that describes me.
10. As a provider owner, I want to remove a Secondary Category, so that I can correct a mistake.
11. As a provider owner, I want the Primary Category picker to behave exactly as it does today, so that the existing flow is undisturbed.
12. As a provider owner, I want to be told that changing my Primary Category clears my Secondary Categories, so that I am not surprised when they vanish.
13. As a provider owner, I want the Secondary Category picker to offer only categories in my own section, so that I cannot file a restaurant under `Kleidung & Mode`.
14. As a provider owner, I want the picker to stop me at four Secondary Categories, so that I do not hit a database error on save.
15. As an admin, I want to set Secondary Categories on any provider, so that I can fix what an import or a registration got wrong.
16. As an admin, I want the backfilled Primary Category to be visible as the one existing category of every provider, so that the migration is not a silent state change.
17. As a provider owner, I want my Secondary Categories still there after I edit my address or opening hours, so that unrelated saves do not wipe them.
18. As a registering business in chat, I want to pick exactly one category as I do today, so that registration does not get longer.
19. As an operator, I want a provider with no category at all to stay valid, so that the three existing category-less providers and anything an import leaves bare do not block the migration.
20. As an operator, I want deleting a category to leave no dangling membership, so that the data model cannot rot.
21. As an operator, I want the cap and the section rule enforced by the database, so that a future UI, RPC, or import cannot bypass them.
22. As a developer, I want `search_providers_chat`'s signature and return columns unchanged, so that no caller needs touching.
23. As a developer, I want the invariant "the Primary Category is always in the junction" to be unrepresentable when violated, so that no code has to defend against it.

## Implementation Decisions

### Verified ground truth

| Claim                                            | Verified state                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider_categories`                            | Does not exist. 39 public base tables, no views in `public`.                                                                                                                                                                                                                                                                                                                                                          |
| `providers.category_id`                          | `uuid`, nullable, FK `providers_category_id_fkey -> categories(category_id) ON DELETE SET NULL`. Index `idx_providers_category_id`. No unique/check constraint.                                                                                                                                                                                                                                                       |
| `providers` owner columns                        | `provider_owner_id uuid` (FK `auth.users ON DELETE CASCADE`) and `user_created_id uuid` (FK `auth.users ON DELETE SET NULL`). Two different people.                                                                                                                                                                                                                                                                   |
| `providers` RLS UPDATE                           | `provider_owner_id = auth.uid()` OR `users.role IN ('admin','moderator')`. **`user_created_id` has no UPDATE grant.**                                                                                                                                                                                                                                                                                                 |
| `providers` RLS SELECT                           | `provider_is_visible(review_status, user_created_id, provider_owner_id)`: approved to everyone, else creator, owner, or admin/moderator.                                                                                                                                                                                                                                                                              |
| `categories.applicable_section`                  | `text NOT NULL DEFAULT 'all'`. Distribution: 41 `food`, 10 `store`, 6 `all`. **No `ummah` category exists.**                                                                                                                                                                                                                                                                                                          |
| The six `'all'` categories                       | `Bildung & Lernen`, `Dienstleistungen`, `Essen & Trinken`, `Gemeinschaft & Spenden` (`4470c3e0-458f-40a6-a96e-ca0fbdf145d7`), `Handwerk & Reparatur`, `Sonstiges`.                                                                                                                                                                                                                                                    |
| `listing_type_enum`                              | `food, store, ummah`. `providers.listing_type` is NOT NULL.                                                                                                                                                                                                                                                                                                                                                           |
| Local data                                       | 3 providers, all `category_id IS NULL`, all `listing_type = 'food'`. Production row counts **unverified**.                                                                                                                                                                                                                                                                                                            |
| `search_providers_chat`                          | 14 args, `plpgsql`, `SET search_path TO 'public'`. Category is a pure equality filter; ranking is `ts_rank` over `provider_name                                                                                                                                                                                                                                                                                       |       | ' '                                                                                |     | description`only;`ORDER BY CASE WHEN p_search_query='' THEN 0.0 ELSE 1.0 END, rank DESC, p.created_at DESC`. No `DISTINCT`. |
| `search_providers` / `search_providers_enhanced` | Exist in the DB but have **zero callers in `src/`**. Dead RPCs. Do not touch them.                                                                                                                                                                                                                                                                                                                                    |
| Website search path                              | `searchProviders()` in `src/services/providers/search.ts`. Calls RPC `search_providers_for_query` for text matching, then filters PostgREST with `.eq('category_id', category)` at line 339.                                                                                                                                                                                                                          |
| `search_providers_for_query`                     | `sql`, `STABLE`. Already matches **category name** via `EXISTS (SELECT 1 FROM categories c WHERE c.category_id = p.category_id AND <tsvector/prefix match>)`. This is the clause that makes "Turkish" work on the website today, and it is the one that has to change.                                                                                                                                                |
| `admin_update_provider`                          | `plpgsql`, `SECURITY DEFINER`. Patches `providers.category_id` from `p_data->'providers'->>'category_id'`. Reached through `src/services/admin/providerEdit.ts:238`, behind `isAdminOrModerator` in `src/app/api/admin/providers/[id]/route.ts`.                                                                                                                                                                      |
| Edit surface                                     | Both the owner route (`/profile/providers/[provider_id]/edit`) and the admin route (`/dashboard/providers/[id]/edit`) render the same `src/features/providers/pages/ProviderEditForm.tsx`, distinguished by `localStoragePrefix` (`''` vs `'admin_'`) and by `onSubmitForm` (absent = owner writes `providers` directly via PostgREST at lines 488-512; present = admin RPC). One component, one place to add the UI. |
| Category sub-page pattern                        | `edit/category/page.tsx` writes the chosen id to `localStorage` under `{pfx}edit_category_{id}` and calls `router.back()`. `ProviderEditForm` reads it at line 197 and clears it at line 357.                                                                                                                                                                                                                         |
| `PROVIDER_CATEGORY_SECTION_SCOPES`               | `['food','store','all']` in `src/services/categories.ts:18`. The current picker therefore **does** offer `'all'` categories.                                                                                                                                                                                                                                                                                          |
| `register_provider` tool schema                  | `category_id: { type: 'string' }`, listed in `required` (`tool-executor.ts:154`, `:206`).                                                                                                                                                                                                                                                                                                                             |
| `SINGLE_SELECT_RE`                               | `/(?:kategorie                                                                                                                                                                                                                                                                                                                                                                                                        | küche | küchenart)/i`at`src/features/chat/hooks/useChat.ts:8`, applied at `:140`and`:188`. |

### Two corrections to the issue body, both verified

Recorded here so no future reader trusts them:

- **"The registration UI already has multi-select support (QuickReplies with singleSelect=false)" is backwards.** `SINGLE_SELECT_RE` matches "Kategorie"/"Küche", which the assistant's category question contains by construction (`system-prompt.ts:96`), so `singleSelect` is forced **true** at exactly the category step. Multi-select in chat is a code change, not an existing capability.
- **`register_provider` does not accept several categories.** `category_id` is declared `type: 'string'` and is in `required`. It would have to become an array.

Both are moot for this spec, because chat registration is out of scope. They are the reason the issue's own "Affected files" list is misleading.

### D1. Schema

```sql
CREATE TABLE public.provider_categories (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);

CREATE INDEX idx_provider_categories_category_id
  ON public.provider_categories (category_id);
```

No `is_primary` column, no surrogate key, no `updated_at`. The PK gives both idempotency (`ON CONFLICT DO NOTHING`) and the forward lookup; the extra index serves the reverse lookup that search needs.

`ON DELETE CASCADE` on `category_id` is deliberate and pairs with the existing `ON DELETE SET NULL` on `providers.category_id`: deleting a category nulls the Primary Category and the sync trigger then empties that provider's set. Verified end to end (probe T14): deleting `Türkisch` on a provider holding 5 categories left `category_id = NULL` and 0 junction rows, with constraints forced immediate and no error.

### D2. The invariant, and where it lives

`providers.category_id` is a **pointer into** `provider_categories`, not a second truth. Three rules, all database-enforced:

- **R1** If `category_id IS NOT NULL`, a row `(provider_id, category_id)` exists. If `category_id IS NULL`, the provider has **zero** junction rows.
- **R2** At most 5 rows per provider.
- **R3** Every row other than the Primary Category row has `applicable_section` equal to the Primary Category's `applicable_section`, and that section is not `'all'`.

R3 as written means a provider whose Primary Category is one of the six `'all'` categories can hold no Secondary Categories at all, because an `'all'` Secondary is forbidden and nothing else shares the section `'all'`. That is the intended reading of decision 7 and it is what protects `shouldCreateCommunityService()` (`src/utils/categoryUtils.ts:7-13`), which branches on the `'all'` category `4470c3e0-…` to decide whether a provider or a community service gets created. It also protects `resolveListingType()` (`src/features/providers/services/create-provider.server.ts:89-105`), which maps the Primary Category's section onto `listing_type`.

#### Sync trigger (immediate)

```sql
CREATE OR REPLACE FUNCTION public.provider_categories_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    DELETE FROM public.provider_categories WHERE provider_id = NEW.provider_id;
  ELSE
    DELETE FROM public.provider_categories
      WHERE provider_id = NEW.provider_id AND category_id <> NEW.category_id;
    INSERT INTO public.provider_categories (provider_id, category_id)
      VALUES (NEW.provider_id, NEW.category_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER providers_sync_primary_category
AFTER INSERT OR UPDATE OF category_id ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.provider_categories_sync();
```

**Changing the Primary Category resets the set to just the new Primary Category.** This deviates from the Grill phase's acceptance criterion ("inserts the new primary into the junction and does not remove the old one"), on purpose, for three reasons:

1. Keeping the old Primary as a Secondary can push a provider at the cap to 6 and fail the save.
2. If the new Primary sits in a different section, or is an `'all'` category, every retained row violates R3 and the save fails.
3. The owner edit path writes `providers.category_id` with a plain PostgREST `update` (lines 488-512) and knows nothing about the junction. The trigger must leave a legal state with no help from the caller, or that path 500s.

Consequence to surface in the UI: switching the Primary Category clears the Secondary Categories. Verified (probe T10: 5 rows -> change Primary -> exactly 1 row, the new Primary; probe T11: set `category_id = NULL` -> 0 rows).

#### Validation trigger (deferred)

```sql
CREATE OR REPLACE FUNCTION public.provider_categories_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_pid uuid; v_primary uuid; v_section text; v_count int; v_bad text;
BEGIN
  v_pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.provider_id ELSE NEW.provider_id END;

  SELECT p.category_id INTO v_primary FROM public.providers p WHERE p.provider_id = v_pid;
  IF NOT FOUND THEN RETURN NULL; END IF;          -- provider deleted in the same tx

  SELECT count(*) INTO v_count FROM public.provider_categories pc WHERE pc.provider_id = v_pid;

  IF v_primary IS NULL THEN
    IF v_count > 0 THEN
      RAISE EXCEPTION 'provider % has % category rows but no primary category_id', v_pid, v_count
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.provider_categories pc
                 WHERE pc.provider_id = v_pid AND pc.category_id = v_primary) THEN
    RAISE EXCEPTION 'provider % primary category % missing from provider_categories', v_pid, v_primary
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_count > 5 THEN
    RAISE EXCEPTION 'provider % has % categories, maximum is 5', v_pid, v_count
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.applicable_section INTO v_section
    FROM public.categories c WHERE c.category_id = v_primary;

  SELECT string_agg(c.name_de, ', ') INTO v_bad
    FROM public.provider_categories pc
    JOIN public.categories c ON c.category_id = pc.category_id
   WHERE pc.provider_id = v_pid
     AND pc.category_id <> v_primary
     AND (c.applicable_section <> v_section OR c.applicable_section = 'all');

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'additional categories must be in section % and not ''all'': %', v_section, v_bad
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER provider_categories_validate
AFTER INSERT OR UPDATE OR DELETE ON public.provider_categories
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.provider_categories_validate();

CREATE CONSTRAINT TRIGGER providers_categories_validate
AFTER INSERT OR UPDATE OF category_id ON public.providers
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.provider_categories_validate();
```

`DEFERRABLE INITIALLY DEFERRED` is load-bearing, not decoration. Immediate triggers would fire mid-transaction and reject legal intermediate states: a replace-the-set operation (delete all Secondaries, insert the new ones) transiently has the Primary row absent, and a category deletion fires the junction `CASCADE` and the `providers` `SET NULL` in an order Postgres does not promise. Deferring to commit makes both benign. Verified: both constraint triggers accept `AFTER ... UPDATE OF category_id`, and `SET CONSTRAINTS ALL IMMEDIATE` forces them for tests.

Verified rejections, with the exact messages the implementer should expect:

| Probe | Action                                                       | Raised                                                                                |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| T5    | 6th category                                                 | `provider … has 6 categories, maximum is 5`                                           |
| T6    | `Kleidung & Mode` (store) as Secondary on a food Primary     | `additional categories must be in section food and not 'all': Kleidung & Mode`        |
| T7    | `Gemeinschaft & Spenden` (`all`) as Secondary                | `additional categories must be in section food and not 'all': Gemeinschaft & Spenden` |
| T8    | delete the Primary row from the junction                     | `provider … primary category … missing from provider_categories`                      |
| T9    | insert a Secondary for a provider with `category_id IS NULL` | `provider … has 1 category rows but no primary category_id`                           |

All five use `ERRCODE = 'check_violation'` (`23514`), so callers can distinguish them from an unexpected 500. The admin API route and the owner save path must map `23514` to a readable German message, not surface a raw error.

### D3. RLS

The table gets nothing for free. Four policies, mirroring `providers`:

```sql
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider categories follow provider visibility"
ON public.provider_categories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND public.provider_is_visible(p.review_status, p.user_created_id, p.provider_owner_id)
  )
);

-- one policy each for INSERT (WITH CHECK), UPDATE (USING + WITH CHECK), DELETE (USING),
-- all with the same predicate:
--   EXISTS (SELECT 1 FROM public.providers p
--           WHERE p.provider_id = provider_categories.provider_id
--             AND (p.provider_owner_id = (SELECT auth.uid())
--                  OR EXISTS (SELECT 1 FROM public.users u
--                             WHERE u.user_id = (SELECT auth.uid())
--                               AND u.role = ANY (ARRAY['admin'::user_role,'moderator'::user_role]))))
```

Reusing `provider_is_visible` keeps the SELECT rule in one place. The write predicate is a literal copy of the existing `providers` UPDATE policy, which is what makes the authz answer in D7 true by construction rather than by convention.

The SELECT policy is required, not optional: the website change in D6 reads the junction through PostgREST relationship embedding, and embedded resources are RLS-filtered. Without a public SELECT policy the inner join returns nothing and category filtering silently returns zero results for anonymous visitors.

### D4. Backfill, in the same migration

```sql
INSERT INTO public.provider_categories (provider_id, category_id)
SELECT p.provider_id, p.category_id
  FROM public.providers p
 WHERE p.category_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

Runs after the table and triggers exist, before the RPC replacements. Three notes:

- **A provider with `category_id IS NULL` gets no row and stays valid.** That is R1's second half, not an oversight. Such a provider has no categories, is matched by no category filter (exactly as today, where `p.category_id = filter` is never true for NULL), and cannot be given a Secondary Category until it gets a Primary Category. On the local DB all 3 providers are in this state, so the backfill inserts 0 rows and the migration is verified safe at zero rows (probe T1).
- **Production row count is unverified.** Nothing here depends on it: `ON CONFLICT DO NOTHING` makes the statement idempotent and re-runnable.
- **Post-migration assertion** (probe T2, returned 0):

```sql
SELECT count(*) FROM public.providers p
 WHERE p.category_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.provider_categories pc
                   WHERE pc.provider_id = p.provider_id
                     AND pc.category_id = p.category_id);
-- must be 0
```

The backfill does not need to worry about R3: every backfilled provider has exactly one category, which is its Primary, so there are no Secondaries to validate.

### D5. `search_providers_chat`

Signature and return columns **unchanged**: 14 args in the same order with the same defaults, returning the same 16 columns. No caller changes. `category_name` keeps coming from `LEFT JOIN categories c ON p.category_id = c.category_id`, so a result always displays the provider's own Primary Category and never a matched Secondary (decision 5).

_Display rule superseded post-QA by commit `8a4cea1c` (ADR 0001 amended in the same commit): the RPC still returns the Primary's `category_name`, but under an active category filter the card badges the filtered category._

Two edits to the body.

**Matching.** Replace

```sql
AND (p_category_filter IS NULL OR p.category_id = p_category_filter)
```

with

```sql
AND (p_category_filter IS NULL OR EXISTS (
      SELECT 1 FROM public.provider_categories pc
       WHERE pc.provider_id = p.provider_id
         AND pc.category_id = p_category_filter))
```

`EXISTS`, never a join. Verified on real rows: against a provider holding `Türkisch` + `Kebab / Döner`, the `EXISTS` form returns 1 row while `JOIN provider_categories ... WHERE pc.category_id IN (both)` returns 2 (probe T15). The function has no `DISTINCT` to save it.

**Ranking.** Replace the `ORDER BY` with

```sql
ORDER BY
    CASE WHEN p_search_query = '' THEN 0.0 ELSE 1.0 END,
    rank DESC,
    CASE WHEN p_category_filter IS NOT NULL
          AND p.category_id = p_category_filter THEN 0 ELSE 1 END,
    p.created_at DESC
```

The new term goes **after** `rank DESC`, per decision 6. Worth knowing where it actually bites: when `p_search_query = ''` every row has `rank = 0.0`, so the tiebreak decides the order outright, and that is the dominant case, because `tool-executor.ts:236-248` converts a cuisine-looking query into a category filter and blanks the query. With a non-empty query `ts_rank` usually separates rows first and the tiebreak rarely fires. Both behaviours are correct; the implementer should not be surprised that the "after ts_rank" placement still visibly reorders category browsing.

Keep `SET search_path TO 'public'` and `plpgsql`. Do not add `SECURITY DEFINER`.

### D6. Website search

Two changes. `search_providers` and `search_providers_enhanced` are **not** among them: both exist in the DB with zero callers in `src/`, and touching dead RPCs just widens the diff.

**D6a. `search_providers_for_query` — the free-text fix.** This is the function that makes the user's literal scenario work. It already matches category _names_, scoped to the Primary Category:

```sql
OR EXISTS (
  SELECT 1 FROM public.categories c
   WHERE c.category_id = p.category_id
     AND ( to_tsvector('simple', coalesce(c.name_de,'') || ' ' || coalesce(c.name_en,''))
             @@ plainto_tsquery('simple', q.normalized)
           OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(c.name_de,'') || ' ' || coalesce(c.name_en,'')) @@ q.prefix_query) )
)
```

Reroute it through the junction, leaving the match conditions byte-identical:

```sql
OR EXISTS (
  SELECT 1
    FROM public.provider_categories pc
    JOIN public.categories c ON c.category_id = pc.category_id
   WHERE pc.provider_id = p.provider_id
     AND ( to_tsvector('simple', coalesce(c.name_de,'') || ' ' || coalesce(c.name_en,''))
             @@ plainto_tsquery('simple', q.normalized)
           OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(c.name_de,'') || ' ' || coalesce(c.name_en,'')) @@ q.prefix_query) )
)
```

The join sits inside an `EXISTS`, and the outer query already has `GROUP BY p.provider_id, p.created_at`, so no duplication is possible. Signature, return columns (`provider_id`, `matched_menu_items`), `STABLE`, and `search_path` all unchanged.

Note the knock-on: `search_scoped_suggestions` calls `search_providers_for_query` and then re-derives a `'cuisine'` suggestion label with `JOIN scoped_providers sp ON sp.category_id = c.category_id`. It keeps using the Primary Category, so a provider newly matched through a Secondary Category contributes no new suggestion label. Accepted this pass; it only affects the suggestion dropdown, never the result list, because the result list is `search_providers_for_query` itself.

**D6b. `src/services/providers/search.ts` — the category filter.** Replace

```ts
if (isValidCategoryId(category)) {
  req = req.eq('category_id', category);
}
```

with a PostgREST inner-join embed: add `provider_categories!inner(category_id)` to `selectFields` and filter `req.eq('provider_categories.category_id', category)`, applied only when `isValidCategoryId(category)`.

**Verified, because this was the one risky assumption in the whole spec.** Probed the semantics live against PostgREST at `127.0.0.1:54321` using the structurally identical existing table `provider_offers` (same composite PK, same two `ON DELETE CASCADE` FKs), seeded with two child rows for one provider and cleaned up afterwards:

- one matching child: `Content-Range: 0-0/1`, one parent row;
- **two** matching children (`offer_id=in.(a,b)`): still `Content-Range: 0-0/1` and **one** parent row, with both children nested.

So the embed does not multiply parent rows and `count: 'exact'` stays correct. That matters because `totalCount` at line 349 drives pagination.

Two details the implementer must handle:

- The embed adds a `provider_categories` key to every returned row. The existing `data.map((provider) => ({ ...provider, ... }))` at line 385 spreads it straight onto the `Provider` object. Delete the key in that map step; do not add it to the `Provider` type.
- Add the embed to `selectFields` only when a category filter is present. Adding it unconditionally would turn every category-less search into an inner join against the junction and silently drop providers with `category_id IS NULL`.

Do **not** do this by fetching provider ids and passing them to `.in()`. The query-present branch already caps `search_providers_for_query` at 500 ids; a category can hold far more providers than that, so an id-set intersection would truncate category browsing, which `.eq('category_id', ...)` never does today.

### D7. Authorization: who may write Secondary Categories

Decision 9 says "in edit mode, by admin and creator". Pinned against the real code and policies:

- **Admin** = `users.role IN ('admin','moderator')`, checked by `isAdminOrModerator(user.id)` in `src/app/api/admin/providers/[id]/route.ts`, which then calls `updateProviderFields` -> `admin_update_provider` on the service-role client. Database side: the `admin`/`moderator` branch of the `providers` UPDATE policy and of the new junction write policies. Fully covered by existing machinery.
- **Owner** = `providers.provider_owner_id = auth.uid()`. This is the column the existing `providers` UPDATE policy uses ("Users can update their own providers or admins can update any"), and the owner save path in `ProviderEditForm` relies on exactly it. Copying that predicate into the junction's write policies gives the owner the same reach over Secondary Categories as over the provider row. No new authz work.

**Risk, needs your decision.** If "creator" means `providers.user_created_id`, the person who submitted or recommended the provider, then **this is new authz work and the spec does not cover it.** Verified: `user_created_id` appears in the `providers` INSERT policy and in `provider_is_visible` (so a creator can _see_ their own pending submission), but it appears in **no** UPDATE policy. A creator who is not the owner cannot update a provider today, and granting them Secondary Categories would mean widening the `providers` UPDATE policy, which hands them every other editable field at the same time. That is a bigger change than this issue, with its own review-integrity question (a recommender editing a business they do not run). My reading is that "creator" means the owner, i.e. `provider_owner_id`, and the spec assumes that. **If you meant `user_created_id`, this needs a separate decision and probably a separate issue.**

Separate pre-existing finding, not caused by this change: `src/app/(public)/profile/providers/[provider_id]/edit/page.tsx` has no server-side authz guard. It loads the provider with `getProviderById` on the user session client and renders the form, so any logged-in user can open the edit form for any approved provider. Only the write is gated, by RLS. The Secondary Category UI inherits that shape: the picker will render for a non-owner and the save will fail. Leave it as is, but do not let it look like a new hole in code review.

### D8. Edit-mode UI

One component, one new sub-page, mirrored on both route trees. `ProviderEditForm.tsx` is shared by owner and admin, so the UI is written once.

**Form state.** Add `secondaryCategoryIds: string[]` to `ProviderEditFormData`. Initialize from the provider's junction rows, which means the two edit pages must load them: `getProviderById` (owner) and `getProviderForAdmin` (admin) each need `provider_categories(category_id)` added to their select, and `ProviderEditForm` derives `secondaryCategoryIds` as those ids minus `provider.category_id`.

**Entry point.** A new row under the existing Category row at `ProviderEditForm.tsx:658`, labelled `Weitere Kategorien`, showing the count or the names, navigating with the same `saveInlineDataAndNavigate(\`${editBaseUrl}/additional-categories\`)` helper.

**Sub-page.** New `edit/additional-categories/page.tsx` on both trees (`src/app/(public)/profile/providers/[provider_id]/` and `src/app/(dashboard)/dashboard/providers/[id]/`), following the existing `edit/category/page.tsx` pattern exactly: search box, list, write to `localStorage` under `{pfx}edit_additional_categories_{providerId}` as a JSON array, `router.back()`. Differences from the Primary picker:

- multi-select with checkmarks, not select-and-return;
- the option list is the Primary Category's section only, and excludes `'all'` categories. Add a `getSecondaryCategoryOptions(primaryCategoryId)` to `src/services/categories.ts` that resolves the Primary Category's `applicable_section` and returns `categories` in that section. It must **not** reuse `PROVIDER_CATEGORY_SECTION_SCOPES`, which includes `'all'`;
- the Primary Category itself is excluded from the list;
- selection is capped at 4, with the 5th tap refused and a message rather than a silent no-op;
- if the Primary Category's section is `'all'`, the page shows an explanatory empty state and offers nothing. That follows from R3 and is why the section lookup has to happen before rendering.

`ProviderEditForm` reads the key at line ~197 alongside the others and adds `'edit_additional_categories_'` to the `clearDraftLocalStorage` list at line 357.

**Primary-change warning.** When the user picks a different Primary Category while `secondaryCategoryIds` is non-empty, clear `secondaryCategoryIds` in form state and show a toast ("Weitere Kategorien wurden zurückgesetzt"). This makes the trigger's reset behaviour visible before save instead of after.

**Owner save path** (`ProviderEditForm.tsx:488-512`, no `onSubmitForm`). After the `providers` update succeeds, replace the Secondary set in this exact order:

1. `UPDATE providers SET category_id = ...` (already there). The sync trigger resets the junction to the new Primary.
2. `DELETE FROM provider_categories WHERE provider_id = … AND category_id <> <primary>`.
3. `INSERT` the chosen Secondary rows.

Order matters: step 1 wipes the set, so inserting before it would lose the new Secondaries. Verified that Primary-then-Secondaries in one transaction validates clean (probe T12: 3 rows, `SET CONSTRAINTS ALL IMMEDIATE` passes). Steps 2 and 3 are two PostgREST calls and are therefore **not** atomic with step 1; a failure between them leaves the Primary-only state, which is legal under R1-R3. No partial-write corruption is possible, only a lost edit.

**Admin save path.** `admin_update_provider` grows one optional key, handled like the existing `menu_items` / `delivery_links` replace-lists:

```sql
IF p_data ? 'secondary_category_ids' THEN
  DELETE FROM public.provider_categories
   WHERE provider_id = p_provider_id
     AND category_id <> (SELECT category_id FROM public.providers WHERE provider_id = p_provider_id);
  IF jsonb_array_length(p_data->'secondary_category_ids') > 0 THEN
    INSERT INTO public.provider_categories (provider_id, category_id)
    SELECT p_provider_id, value::uuid
      FROM jsonb_array_elements_text(p_data->'secondary_category_ids') AS value
    ON CONFLICT DO NOTHING;
  END IF;
END IF;
```

Place this block **after** the `UPDATE public.providers` block, for the same ordering reason. The `?` guard means an admin edit that does not mention categories leaves them untouched (user story 17). The deferred triggers validate once at commit, so the whole edit is atomic. Add `buildSecondaryCategoriesPayload` to `src/services/admin/providerEdit.ts` next to `buildCommunityServicePayload`, wire it into `buildRpcPayload`, add `secondaryCategoryIds?: string[]` to `AdminProviderEditData`, and extend the admin PATCH validation schema in `src/lib/validations/adminSchemas.ts` with a `z.array(z.string().uuid()).max(4)`.

**Error surfacing.** Both save paths must translate Postgres `23514` from the validation trigger into a German message instead of a raw error or a 500.

### D9. Types

Regenerate `src/types/supabase.ts` after the migration (`provider_categories` row/insert/update types plus the `providers` relationship entry). The PostgREST embed in D6b does not type-check without it.

### D10. Unchanged, explicitly

`create-provider.server.ts`, `resolveListingType()`, `shouldCreateCommunityService()`, the chat tool schemas, `system-prompt.ts`, `useChat.ts`, `QuickReplies.tsx`, the joinhalal import, `cuisine-category-mapper.ts`, `upsert_joinhalal_providers`, every display component, and the `/food/[city]/[category]` route. All keep reading `providers.category_id` and keep working. The sync trigger means a provider created through any existing write path lands with a correct one-row junction set and no code change.

## Testing Decisions

A good test here asserts externally observable behaviour: what the database refuses, and what a search returns. It does not assert that a particular trigger name fired or that a particular index exists. The seams are deliberately few.

### Seam 1: the migration, against real Postgres (primary seam)

Prior art: `src/__tests__/migrations/*.test.ts`, 19 files, the closest being `134-desktop-search-partial.test.ts` (reads the migration file off `supabase/migrations`, builds a minimal schema, executes it in PGlite, then queries the RPCs) and `076-provider-badge-boolean-sync-trigger-tdd.test.ts` (a sync trigger, the same shape as `providers_sync_primary_category`). Use PGlite, not mocks: triggers and `EXISTS` semantics cannot be faked. The fixture schema must include `categories.applicable_section`, which `134`'s fixture already has, and `providers.listing_type`.

Cases, with assertions:

_Backfill_

1. Provider with a `category_id` -> exactly one junction row, equal to `category_id`.
2. Provider with `category_id IS NULL` -> zero junction rows; migration completes without error.
3. Migration runs against zero providers without error.
4. Re-running the backfill statement inserts nothing (idempotence).
5. The D4 assertion query returns 0.

_Invariant (R1-R3), each with `SET CONSTRAINTS ALL IMMEDIATE` to force the deferred trigger inside the test transaction_ 6. Insert a 6th category -> raises, `SQLSTATE 23514`, message contains `maximum is 5`. 7. Insert a 5th (4 Secondaries) -> succeeds. 8. Insert a `store` category as Secondary on a `food` Primary -> raises `23514`, message names the offending category. 9. Insert an `applicable_section = 'all'` category as Secondary -> raises `23514`. 10. Delete the Primary row from the junction -> raises `23514`, message contains `missing from provider_categories`. 11. Insert a Secondary for a provider with `category_id IS NULL` -> raises `23514`. 12. Delete a Secondary row -> succeeds. 13. `UPDATE providers SET category_id = <other>` with 5 rows present -> exactly 1 row remains, the new Primary; constraints validate clean. 14. `UPDATE providers SET category_id = NULL` -> zero rows remain; validates clean. 15. `INSERT INTO providers` with a `category_id` -> one junction row created automatically. 16. `DELETE FROM categories` where that category is a Secondary -> that row disappears, the rest survive, validates clean. 17. `DELETE FROM categories` where that category is the Primary -> `providers.category_id` becomes NULL, **all** junction rows for that provider disappear, validates clean. (This is the FK-action ordering case; it is why the trigger is deferred.) 18. Primary-then-Secondaries in one transaction -> all rows present, validates clean. 19. `DELETE FROM providers` -> junction rows cascade away, no trigger error.

_`search_providers_chat`_ 20. Provider A Primary `Türkisch`; Provider B Primary `Kebab / Döner` + Secondary `Türkisch`. Filter `Türkisch` -> both returned. 21. Same setup -> each provider appears exactly once; `count(*) = 2`. 22. Same setup, empty `p_search_query` -> A (Primary match) sorts before B (Secondary match). 23. B's returned `category_name` is `Kebab / Döner`, its own Primary, not the matched `Türkisch`. 24. Single-category provider, same arguments as before the migration -> identical rows in the same order (regression). 25. `p_category_filter IS NULL` -> unchanged behaviour. 26. A provider with `category_id IS NULL` is returned by no category filter. 27. Returns the same 16 columns in the same order (guards the "no caller changes" claim).

_`search_providers_for_query`_ 28. Provider with Secondary `Türkisch` is returned for query `Türkisch` (the user's literal scenario). 29. Returned exactly once when both its Primary and Secondary category names match the query. 30. `matched_menu_items` unchanged for an unrelated query (regression). 31. Every assertion in `134-desktop-search-partial.test.ts` still passes.

_`admin_update_provider`_ 32. Payload with `secondary_category_ids: [x, y]` -> those two rows plus the Primary exist. 33. Payload with `secondary_category_ids: []` -> only the Primary row remains. 34. Payload **without** the key -> existing Secondary rows untouched (user story 17). 35. Payload with 5 Secondaries -> raises `23514`; no partial write survives. 36. Payload changing both `category_id` and `secondary_category_ids` in one call -> the new Primary plus the new Secondaries, nothing from the old set.
Prior art: `src/__tests__/migrations/145-provider-edit-rpc.test.ts`.

### Seam 2: RLS, against real Postgres

Prior art: `137-provider-route-visibility.test.ts`. Set `request.jwt.claims` / `SET LOCAL ROLE` and assert:

37. Anonymous can `SELECT` junction rows for an approved provider.
38. Anonymous cannot `SELECT` junction rows for a pending provider.
39. The owner (`provider_owner_id`) can `INSERT` and `DELETE` their own junction rows.
40. A logged-in non-owner, non-admin cannot.
41. An admin can, on any provider.
42. A user who is `user_created_id` but not `provider_owner_id` **cannot** write. This test pins the D7 risk: if it ever has to flip, that is the signal the authz decision was reopened.

### Seam 3: `src/services/providers/search.ts`, unit level

Prior art: `src/__tests__/services/providers.test.ts`, which already mocks the Supabase builder chain and `search_providers_for_query`.

43. With a category filter, the select string contains `provider_categories!inner(category_id)` and the filter is `provider_categories.category_id`, not `category_id`.
44. Without a category filter, the select string contains no `provider_categories` embed.
45. The returned provider objects carry no `provider_categories` key.
46. `totalCount` still comes from the count header.
    Existing chain mocks in that file will need updating; treat a failure there as the test catching the change, not as the change being wrong.

### Seam 4: `ProviderEditForm`, component level

Prior art: `src/__tests__/components/ProviderEditForm.regression.test.tsx`, which already drives the `localStorage` draft keys for both prefixes.

47. Secondary categories hydrate from the provider's junction rows.
48. The `{pfx}edit_additional_categories_{id}` draft key overrides the loaded value, for both `''` and `'admin_'`.
49. Changing the Primary Category clears the Secondary selection in form state and shows the toast.
50. Saving in owner mode issues the `providers` update before the junction writes.
51. Saving in admin mode puts `secondaryCategoryIds` in the `onSubmitForm` payload.
52. `clearDraftLocalStorage` removes the new key.
53. A provider with an `'all'` Primary Category renders no Secondary Category entry point.

### Not worth a test

The sub-page list rendering and the search box (the Primary picker's equivalents are untested today, and an E2E would be the right seam if one is ever wanted). The cap in the picker UI is worth one assertion only because the DB error it prevents is user-visible.

## Out of Scope

Deliberate, with the inconsistency each one leaves:

- **Chat registration.** Still exactly one category. No change to `SINGLE_SELECT_RE` (`useChat.ts:8`), the `register_provider` tool schema (`tool-executor.ts:154,206`), `QuickReplies.tsx`, or `system-prompt.ts`, all of which the issue body called for. A business registering via chat gets one category and adds the rest in edit mode.
- **Category tile counts.** `search_food_categories` counts via `LEFT JOIN providers p ON p.category_id = m.category_id`, so a tile still shows only Primary members. A tile can read "12 Restaurants" while filtering it returns 15.
- **Facet lists.** `get_filtered_category_ids_by_search` (`SELECT DISTINCT p.category_id`) and `get_filtered_cities_by_search`. A category held only as a Secondary by every matching provider never appears as an available facet, even though filtering by it would work.
- **`search_providers` / `search_providers_enhanced`.** Dead RPCs, zero callers in `src/`. Left on Primary-only.
- **`search_food_near_me`, `search_scoped_suggestions`.** Primary-only. For suggestions this means a `'cuisine'` label is not offered for a Secondary-only match, though the result list is still correct.
- **`/food/[city]/[category]` SEO route.** Lists Primary members only. No sitemap generator exists, so the exposure stops there.
- **Display surfaces.** `useImageFallback` galleries, map pin labels, `ProviderCard`, detail pages and modals, `SearchResultsList`, `DiscoveryResultsGrid`. All keep showing one category, which is decision 5, not an omission. Filtered result lists excepted post-QA: under an active category filter the card badges the filtered category (commit `8a4cea1c`, ADR 0001 amended in the same commit).
- **Import and enrichment.** `upsert_joinhalal_providers`, `src/lib/import/joinhalal.ts`, `cuisine-category-mapper.ts` keep assigning exactly one category. The sync trigger gives each imported provider a correct one-row set for free.
- **Category-keyed suggestions.** `get_suggested_offers_for_category` / `get_suggested_needs_for_category` stay keyed to the Primary Category.
- **`category_type` taxonomy cleanup.** Follow-up issue, not filed here, per decision 10. 17 food categories have `category_type = NULL` and overlap semantically with the 8 typed `cuisine` rows added by migration 100; `Amerikanisch` has `slug = NULL`, which breaks its `/food/[city]/[category]` route. Multi-category works fine over the mess, it just makes it easier to see: nothing stops a provider holding both `Mediterran` (typed `cuisine`) and `Türkisch` (untyped). The next obvious request, "filter by cuisine _and_ dish type", does need `category_type` populated first.
- **Backfilling anything beyond the Primary Category.** No attempt to guess that a provider filed under `Türkisch` also sells Döner.

## Further Notes

### Scope check

**It fits one implement phase only as two sequential chunks on this branch.** Honest breakdown:

- **Chunk A, data model and search.** One migration (table, 2 trigger functions, 3 triggers, 4 RLS policies, backfill, `search_providers_chat`, `search_providers_for_query`), `src/services/providers/search.ts`, regenerated types, Seams 1-3 (test cases 1-31, 37-46). Self-contained, independently shippable, and it is the user's actual ask: search starts finding Secondary Categories the moment it lands. Delivers no way to _create_ a Secondary Category except by direct SQL, which is fine for an admin and fine for QA.
- **Chunk B, write surface.** `admin_update_provider`, `providerEdit.ts`, the admin PATCH schema, `ProviderEditForm`, two new sub-pages, `getSecondaryCategoryOptions`, the provider loaders, Seam 4 and cases 32-36.

They are the same feature over the same model, so one phase with two commits is reasonable, and reviewing them together is better than reviewing them apart. But if the implement phase has to be a single chunk, **split it into two implement phases with A first** rather than compressing. Chunk B is roughly half the work on its own: two parallel route trees, the `localStorage` draft protocol, and a cap plus section rule that have to be mirrored in the UI to avoid a raw Postgres error reaching the user.

Do not reorder. B before A gives you a write surface for data nothing reads.

### The one decision left for you

D7's "creator". The spec reads it as `provider_owner_id`, which needs no new authz. If you meant `user_created_id`, stop and decide separately: that column has no UPDATE grant anywhere today and widening the `providers` UPDATE policy to include it hands recommenders every editable field, not just categories.

### Smaller things the implementer should not rediscover

- `SET CONSTRAINTS ALL IMMEDIATE` is the only way to observe the deferred triggers inside a test transaction. Without it, a probe that expects a rejection silently passes. That cost one iteration of the probe script.
- The chat path reaches `search_providers_chat` with an empty query and a category filter far more often than with a text query, because `tool-executor.ts:236-248` converts any query matching a category name into a filter and blanks the query. That is the regime where the new ranking tiebreak actually decides the order.
- Both `ilike('name_de', '%' + x + '%').limit(1)` category lookups in `tool-executor.ts` (lines ~238 and ~509) have no `ORDER BY`, so the match is arbitrary when several category names share a substring. Pre-existing, untouched here, and it will get more annoying once providers hold several categories.
- `PROVIDER_CATEGORY_SECTION_SCOPES` includes `'all'`. Reusing it for the Secondary Category picker is the single easiest way to produce an unsaveable form.
