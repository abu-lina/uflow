-- Migration 139: multiple categories per provider (#254, Chunk A)
--
-- A provider gets up to five categories. providers.category_id stays the
-- Primary Category — the only one displayed and the one listing_type is
-- derived from — and acts as a pointer into the new provider_categories
-- junction, which holds the complete set. Secondary Categories exist only
-- in the junction: they make a provider match in search and are invisible
-- everywhere else.
--
-- Three rules, all database-enforced:
--   R1  category_id IS NOT NULL  <=>  the junction contains that row.
--       category_id IS NULL      <=>  the provider has zero junction rows.
--   R2  At most 5 rows per provider (1 primary + 4 secondary).
--   R3  Every secondary shares the primary's applicable_section, and no
--       secondary may be an 'all' category. Consequence: a provider whose
--       primary is an 'all' category can hold no secondaries at all.
--
-- The sync trigger (immediate) keeps the junction mirroring category_id.
-- Changing the primary RESETS the set to just the new primary — that is a
-- settled product decision (the UI warns in Chunk B); keeping the old
-- primary as a secondary could breach the cap or R3 and leave the
-- owner-save path (a plain PostgREST UPDATE) in an invalid state.
--
-- The validation constraint triggers are DEFERRABLE INITIALLY DEFERRED —
-- load-bearing, not stylistic. Immediate triggers would reject legal
-- intermediate states: a replace-the-set operation transiently lacks the
-- primary row, and deleting a category fires the junction CASCADE and the
-- providers SET NULL in an order Postgres does not guarantee. Deferring
-- to commit makes both resolve clean (probe T10-T14, spec comment on
-- issue #254).
--
-- Migration application is manual; apply before deploying dependent code.

BEGIN;

-- ---------------------------------------------------------------------------
-- D1. Junction table
-- ---------------------------------------------------------------------------

CREATE TABLE public.provider_categories (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);

CREATE INDEX idx_provider_categories_category_id
  ON public.provider_categories (category_id);

COMMENT ON TABLE public.provider_categories IS
  'All categories of a provider: the primary (mirroring providers.category_id) plus up to 4 secondaries, enforced by provider_categories_validate. Secondaries match in search but are never displayed.';

-- ---------------------------------------------------------------------------
-- D2. Sync trigger (immediate): keep the junction mirroring category_id
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- D2. Validation trigger (deferred): R1, R2, R3 checked once at commit
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- D3. RLS: SELECT follows provider visibility; writes mirror the providers
-- UPDATE policy (provider_owner_id or admin/moderator) — no widened authz.
-- The SELECT policy is required for the PostgREST !inner embed used by the
-- website category filter (D6b); without it anonymous visitors get nothing.
-- ---------------------------------------------------------------------------

ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider categories follow provider visibility"
ON public.provider_categories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND public.provider_is_visible(p.review_status, p.user_created_id, p.provider_owner_id)
  )
);

CREATE POLICY "Provider owners and admins insert categories"
ON public.provider_categories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND (p.provider_owner_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM public.users u
                      WHERE u.user_id = (SELECT auth.uid())
                        AND u.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])))
  )
);

CREATE POLICY "Provider owners and admins update categories"
ON public.provider_categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND (p.provider_owner_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM public.users u
                      WHERE u.user_id = (SELECT auth.uid())
                        AND u.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND (p.provider_owner_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM public.users u
                      WHERE u.user_id = (SELECT auth.uid())
                        AND u.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])))
  )
);

CREATE POLICY "Provider owners and admins delete categories"
ON public.provider_categories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND (p.provider_owner_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM public.users u
                      WHERE u.user_id = (SELECT auth.uid())
                        AND u.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])))
  )
);

-- ---------------------------------------------------------------------------
-- D4. Backfill, same migration. NULL category_id gets no row and stays valid
-- (R1's second half); ON CONFLICT DO NOTHING makes this idempotent.
-- ---------------------------------------------------------------------------

INSERT INTO public.provider_categories (provider_id, category_id)
SELECT p.provider_id, p.category_id
  FROM public.providers p
 WHERE p.category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- D5. search_providers_chat: match the category filter against ANY of the
-- provider's categories (EXISTS, never a join — the function has no
-- DISTINCT, so a join would list a provider twice) and rank a primary
-- match above a secondary match at equal text rank. Signature and the 16
-- return columns are unchanged; category_name still comes from the primary.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_providers_chat(
    p_search_query      TEXT DEFAULT '',
    p_category_filter   UUID DEFAULT NULL,
    p_city_filter       TEXT DEFAULT NULL,
    p_listing_type_filter TEXT DEFAULT NULL,
    p_muslim_owned      BOOLEAN DEFAULT NULL,
    p_has_prayer_space  BOOLEAN DEFAULT NULL,
    p_family_friendly   BOOLEAN DEFAULT NULL,
    p_women_friendly    BOOLEAN DEFAULT NULL,
    p_children_friendly BOOLEAN DEFAULT NULL,
    p_has_parking       BOOLEAN DEFAULT NULL,
    p_economic_solidarity BOOLEAN DEFAULT NULL,
    p_makes_donations   BOOLEAN DEFAULT NULL,
    p_limit_count       INTEGER DEFAULT 5,
    p_offset_count      INTEGER DEFAULT 0
)
RETURNS TABLE(
    provider_id          UUID,
    provider_name        TEXT,
    provider_description TEXT,
    address_city         TEXT,
    category_name        TEXT,
    listing_type         TEXT,
    muslim_owned         BOOLEAN,
    has_prayer_space     BOOLEAN,
    family_friendly      BOOLEAN,
    women_friendly       BOOLEAN,
    children_friendly    BOOLEAN,
    has_parking          BOOLEAN,
    economic_solidarity  BOOLEAN,
    makes_donations      BOOLEAN,
    opening_hours        JSONB,
    rank                 REAL
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.provider_id,
        p.provider_name,
        p.provider_description,
        p.address_city,
        c.name_de AS category_name,
        p.listing_type::TEXT,
        p.muslim_owned,
        p.has_prayer_space,
        p.family_friendly,
        p.women_friendly,
        p.children_friendly,
        p.has_parking,
        p.economic_solidarity,
        p.makes_donations,
        p.opening_hours,
        CASE
            WHEN p_search_query = '' THEN 0.0
            ELSE ts_rank(
                to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
                plainto_tsquery('german', p_search_query)
            )
        END AS rank
    FROM public.providers p
    LEFT JOIN public.categories c ON p.category_id = c.category_id
    WHERE p.review_status = 'approved'
      AND (
          p_search_query = ''
          OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, ''))
             @@ plainto_tsquery('german', p_search_query)
      )
      AND (p_category_filter IS NULL OR EXISTS (
          SELECT 1 FROM public.provider_categories pc
           WHERE pc.provider_id = p.provider_id
             AND pc.category_id = p_category_filter))
      AND (p_city_filter IS NULL OR p.address_city ILIKE p_city_filter || '%')
      AND (p_listing_type_filter IS NULL OR p.listing_type::TEXT = p_listing_type_filter)
      AND (p_muslim_owned IS NULL OR p.muslim_owned = p_muslim_owned)
      AND (p_has_prayer_space IS NULL OR p.has_prayer_space = p_has_prayer_space)
      AND (p_family_friendly IS NULL OR p.family_friendly = p_family_friendly)
      AND (p_women_friendly IS NULL OR p.women_friendly = p_women_friendly)
      AND (p_children_friendly IS NULL OR p.children_friendly = p_children_friendly)
      AND (p_has_parking IS NULL OR p.has_parking = p_has_parking)
      AND (p_economic_solidarity IS NULL OR p.economic_solidarity = p_economic_solidarity)
      AND (p_makes_donations IS NULL OR p.makes_donations = p_makes_donations)
    ORDER BY
        CASE WHEN p_search_query = '' THEN 0.0 ELSE 1.0 END,
        rank DESC,
        CASE WHEN p_category_filter IS NOT NULL
              AND p.category_id = p_category_filter THEN 0 ELSE 1 END,
        p.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

COMMENT ON FUNCTION public.search_providers_chat IS 'Chatbot search with boolean flag filtering. v4 (#254): category filter matches primary + secondary categories via provider_categories; primary matches rank first.';

-- ---------------------------------------------------------------------------
-- D6a. search_providers_for_query: reroute the category-NAME match through
-- the junction (join inside EXISTS; the outer GROUP BY keeps one row per
-- provider). Everything else byte-identical to migration 135, including the
-- review_status_filter 'all' scope. Signature, return columns, STABLE and
-- search_path unchanged.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_providers_for_query(
  search_query text DEFAULT '',
  section_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL,
  review_status_filter text DEFAULT 'approved',
  limit_count integer DEFAULT 500
)
RETURNS TABLE(provider_id uuid, matched_menu_items text[])
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH query_terms AS (
    SELECT
      btrim(coalesce(search_query, '')) AS normalized,
      public.search_prefix_query(search_query) AS prefix_query
  )
  SELECT
    p.provider_id,
    coalesce(
      array_agg(DISTINCT mi.name_de ORDER BY mi.name_de)
        FILTER (WHERE mi.name_de IS NOT NULL AND mi.name_de <> ''),
      ARRAY[]::text[]
    ) AS matched_menu_items
  FROM public.providers p
  CROSS JOIN query_terms q
  LEFT JOIN public.food_menu mi
    ON mi.provider_id = p.provider_id
   AND mi.is_available = true
   AND (
     to_tsvector('simple', coalesce(mi.name_de, '') || ' ' || coalesce(mi.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
     OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(mi.name_de, '') || ' ' || coalesce(mi.name_en, '')) @@ q.prefix_query)
   )
  WHERE
    q.normalized <> ''
    AND (
      (review_status_filter = 'all' AND p.review_status::text IN ('approved', 'pending', 'rejected', 'needs_revision'))
      OR (
        review_status_filter IS DISTINCT FROM 'all'
        AND p.review_status::text = coalesce(review_status_filter, 'approved')
      )
    )
    AND (section_filter IS NULL OR p.listing_type::text = section_filter)
    AND (nullif(city_filter, '') IS NULL OR p.address_city = city_filter)
    AND (
      to_tsvector('simple', coalesce(p.provider_name, '')) @@ plainto_tsquery('simple', q.normalized)
      OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(p.provider_name, '')) @@ q.prefix_query)
      OR EXISTS (
        SELECT 1
        FROM public.provider_offers po
        JOIN public.offers o ON o.offer_id = po.offer_id
        WHERE po.provider_id = p.provider_id
          AND (
            to_tsvector('simple', coalesce(o.name_de, '') || ' ' || coalesce(o.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
            OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(o.name_de, '') || ' ' || coalesce(o.name_en, '')) @@ q.prefix_query)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.provider_needs pn
        JOIN public.needs n ON n.need_id = pn.need_id
        WHERE pn.provider_id = p.provider_id
          AND (
            to_tsvector('simple', coalesce(n.name_de, '') || ' ' || coalesce(n.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
            OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(n.name_de, '') || ' ' || coalesce(n.name_en, '')) @@ q.prefix_query)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.provider_categories pc
        JOIN public.categories c ON c.category_id = pc.category_id
        WHERE pc.provider_id = p.provider_id
          AND (
            to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
            OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '')) @@ q.prefix_query)
          )
      )
      OR mi.provider_id IS NOT NULL
    )
  GROUP BY p.provider_id, p.created_at
  ORDER BY p.created_at DESC
  LIMIT greatest(limit_count, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_providers_for_query(text, text, text, text, integer) TO anon, authenticated, service_role;

COMMIT;
