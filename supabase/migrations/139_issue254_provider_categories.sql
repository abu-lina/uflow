-- Migration 139: multiple categories per provider (#254, Chunks A + B)
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
-- settled product decision (the UI warns before saving); keeping the old
-- primary as a secondary could breach the cap or R3 and leave the
-- owner-save path (a plain PostgREST UPDATE) in an invalid state.
-- An UPDATE that merely re-sends the same category_id (ProviderEditForm
-- always includes it) is guarded to be inert.
--
-- PostgREST note: the composite PK over two FKs is the many-to-many
-- signature, so providers -> categories now has TWO relationships. Every
-- categories embed in the app must carry the !providers_category_id_fkey
-- hint or it fails with PGRST201.
--
-- The DDL is re-runnable (IF NOT EXISTS / DROP ... IF EXISTS) per project
-- convention; the backfill is idempotent via ON CONFLICT DO NOTHING.
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

CREATE TABLE IF NOT EXISTS public.provider_categories (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_categories_category_id
  ON public.provider_categories (category_id);

COMMENT ON TABLE public.provider_categories IS
  'All categories of a provider: the primary (mirroring providers.category_id) plus up to 4 secondaries, enforced by provider_categories_validate. Secondaries match in search but are never displayed.';

-- ---------------------------------------------------------------------------
-- D2. Sync trigger (immediate): keep the junction mirroring category_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.provider_categories_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- No-op guard (code review finding): UPDATE OF category_id fires whenever
  -- the column appears in the SET list, even when the value is unchanged —
  -- ProviderEditForm always sends category_id in its blanket update. Without
  -- this guard a routine no-op save would wipe every secondary category.
  -- A real change still resets the set (decision: primary change clears
  -- secondaries, UI warns).
  IF TG_OP = 'UPDATE' AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN
    RETURN NULL;
  END IF;

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

DROP TRIGGER IF EXISTS providers_sync_primary_category ON public.providers;
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

DROP TRIGGER IF EXISTS provider_categories_validate ON public.provider_categories;
CREATE CONSTRAINT TRIGGER provider_categories_validate
AFTER INSERT OR UPDATE OR DELETE ON public.provider_categories
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.provider_categories_validate();

DROP TRIGGER IF EXISTS providers_categories_validate ON public.providers;
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

DROP POLICY IF EXISTS "Provider categories follow provider visibility" ON public.provider_categories;
CREATE POLICY "Provider categories follow provider visibility"
ON public.provider_categories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.provider_id = provider_categories.provider_id
      AND public.provider_is_visible(p.review_status, p.user_created_id, p.provider_owner_id)
  )
);

DROP POLICY IF EXISTS "Provider owners and admins insert categories" ON public.provider_categories;
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

DROP POLICY IF EXISTS "Provider owners and admins update categories" ON public.provider_categories;
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

DROP POLICY IF EXISTS "Provider owners and admins delete categories" ON public.provider_categories;
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

-- ---------------------------------------------------------------------------
-- D8. admin_update_provider (Chunk B): the admin save path learns one
-- optional key, secondary_category_ids — a replace-list like menu_items.
-- The block MUST run after the providers UPDATE: the sync trigger resets
-- the junction to the new primary, and the delete below must measure
-- "secondary" against the NEW primary, not the old one. A payload without
-- the key leaves the set untouched (unrelated admin edits are inert).
-- The function body is copied verbatim from
-- 133_fix_location_upsert_supplied_id.sql; only the secondary_category_ids
-- block, the declaration, and COMMENT ON FUNCTION are new.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_provider(
  p_provider_id UUID,
  p_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers JSONB;
  v_food_providers JSONB;
  v_store_providers JSONB;
  v_menu_items JSONB;
  v_delivery_links JSONB;
  v_community_service_ids JSONB;
  v_secondary_category_ids JSONB;
  v_locations JSONB;
  v_listing_type TEXT;
  v_result JSONB;
  v_updated_at TIMESTAMPTZ := NOW();
  v_location JSONB;
  v_location_id UUID;
  v_existing_ids UUID[];
BEGIN
  SELECT p.listing_type INTO v_listing_type
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  v_providers := p_data->'providers';
  v_food_providers := p_data->'food_providers';
  v_store_providers := p_data->'store_providers';
  v_menu_items := p_data->'menu_items';
  v_delivery_links := p_data->'delivery_links';
  v_community_service_ids := p_data->'community_service_ids';
  v_secondary_category_ids := p_data->'secondary_category_ids';
  v_locations := p_data->'locations';

  IF v_providers IS NOT NULL AND v_providers != 'null'::jsonb THEN
    UPDATE public.providers SET
      provider_name       = COALESCE(v_providers->>'provider_name', provider_name),
      provider_description = CASE WHEN v_providers ? 'provider_description'
                             THEN v_providers->>'provider_description'
                             ELSE provider_description END,
      category_id         = CASE WHEN v_providers ? 'category_id'
                            THEN NULLIF(v_providers->>'category_id', '')::uuid
                            ELSE category_id END,
      listing_type        = CASE WHEN v_providers ? 'listing_type'
                            THEN NULLIF(v_providers->>'listing_type', '')::listing_type_enum
                            ELSE listing_type END,
      address_street      = CASE WHEN v_providers ? 'address_street'
                            THEN v_providers->>'address_street'
                            ELSE address_street END,
      address_zip         = CASE WHEN v_providers ? 'address_zip'
                            THEN v_providers->>'address_zip'
                            ELSE address_zip END,
      address_city        = CASE WHEN v_providers ? 'address_city'
                            THEN v_providers->>'address_city'
                            ELSE address_city END,
      address_country     = CASE WHEN v_providers ? 'address_country'
                            THEN v_providers->>'address_country'
                            ELSE address_country END,
      contact_email       = CASE WHEN v_providers ? 'contact_email'
                            THEN v_providers->>'contact_email'
                            ELSE contact_email END,
      contact_phone       = CASE WHEN v_providers ? 'contact_phone'
                            THEN v_providers->>'contact_phone'
                            ELSE contact_phone END,
      social_website      = CASE WHEN v_providers ? 'social_website'
                            THEN v_providers->>'social_website'
                            ELSE social_website END,
      social_instagram    = CASE WHEN v_providers ? 'social_instagram'
                            THEN v_providers->>'social_instagram'
                            ELSE social_instagram END,
      provider_images     = CASE WHEN v_providers ? 'provider_images'
                            THEN v_providers->'provider_images'
                            ELSE provider_images END,
      review_status      = CASE WHEN v_providers ? 'review_status'
                            THEN NULLIF(v_providers->>'review_status', '')::review_status
                            ELSE review_status END,
      opening_hours       = CASE WHEN v_providers ? 'opening_hours'
                            THEN v_providers->'opening_hours'
                            ELSE opening_hours END,
      muslim_owned        = COALESCE((v_providers->>'muslim_owned')::boolean, muslim_owned),
      has_prayer_space    = COALESCE((v_providers->>'has_prayer_space')::boolean, has_prayer_space),
      family_friendly     = COALESCE((v_providers->>'family_friendly')::boolean, family_friendly),
      women_friendly      = COALESCE((v_providers->>'women_friendly')::boolean, women_friendly),
      children_friendly   = COALESCE((v_providers->>'children_friendly')::boolean, children_friendly),
      makes_donations     = COALESCE((v_providers->>'makes_donations')::boolean, makes_donations),
      has_parking         = COALESCE((v_providers->>'has_parking')::boolean, has_parking),
      economic_solidarity = COALESCE((v_providers->>'economic_solidarity')::boolean, economic_solidarity),
      show_address        = COALESCE((v_providers->>'show_address')::boolean, show_address),
      updated_at          = v_updated_at
    WHERE provider_id = p_provider_id;
  END IF;

  -- Replace secondary categories (#254). Runs after the providers UPDATE on
  -- purpose: the sync trigger just reset the junction to the new primary,
  -- so "non-primary" must be measured against the CURRENT providers row.
  IF p_data ? 'secondary_category_ids' THEN
    DELETE FROM public.provider_categories
     WHERE provider_id = p_provider_id
       AND category_id <> (SELECT category_id FROM public.providers WHERE provider_id = p_provider_id);
    IF jsonb_array_length(v_secondary_category_ids) > 0 THEN
      INSERT INTO public.provider_categories (provider_id, category_id)
      SELECT p_provider_id, value::uuid
        FROM jsonb_array_elements_text(v_secondary_category_ids) AS value
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Upsert food_providers extension
  IF v_food_providers IS NOT NULL AND v_food_providers != 'null'::jsonb THEN
    INSERT INTO public.food_providers (
      provider_id, verification_method, has_certificate, certificate_url,
      no_alcohol, no_pork, no_gambling, updated_at
    ) VALUES (
      p_provider_id,
      COALESCE(NULLIF(v_food_providers->>'verification_method', ''), 'online'),
      COALESCE((v_food_providers->>'has_certificate')::boolean, false),
      NULLIF(v_food_providers->>'certificate_url', ''),
      CASE WHEN v_food_providers ? 'no_alcohol' THEN (v_food_providers->>'no_alcohol')::boolean ELSE NULL END,
      CASE WHEN v_food_providers ? 'no_pork' THEN (v_food_providers->>'no_pork')::boolean ELSE NULL END,
      CASE WHEN v_food_providers ? 'no_gambling' THEN (v_food_providers->>'no_gambling')::boolean ELSE NULL END,
      v_updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      verification_method = COALESCE(NULLIF(EXCLUDED.verification_method, ''), food_providers.verification_method, 'online'),
      has_certificate     = COALESCE(EXCLUDED.has_certificate, food_providers.has_certificate),
      certificate_url     = COALESCE(NULLIF(EXCLUDED.certificate_url, ''), food_providers.certificate_url),
      no_alcohol          = CASE WHEN v_food_providers ? 'no_alcohol' THEN (v_food_providers->>'no_alcohol')::boolean ELSE food_providers.no_alcohol END,
      no_pork          = CASE WHEN v_food_providers ? 'no_pork' THEN (v_food_providers->>'no_pork')::boolean ELSE food_providers.no_pork END,
      no_gambling          = CASE WHEN v_food_providers ? 'no_gambling' THEN (v_food_providers->>'no_gambling')::boolean ELSE food_providers.no_gambling END,
      updated_at          = v_updated_at;
  END IF;

  -- Upsert store_providers extension (now includes no_alcohol, no_pork)
  IF v_store_providers IS NOT NULL AND v_store_providers != 'null'::jsonb THEN
    INSERT INTO public.store_providers (
      provider_id, verification_method, has_certificate, certificate_url,
      no_alcohol, no_pork, no_gambling, updated_at
    ) VALUES (
      p_provider_id,
      COALESCE(NULLIF(v_store_providers->>'verification_method', ''), 'online'),
      COALESCE((v_store_providers->>'has_certificate')::boolean, false),
      NULLIF(v_store_providers->>'certificate_url', ''),
      CASE WHEN v_store_providers ? 'no_alcohol' THEN (v_store_providers->>'no_alcohol')::boolean ELSE NULL END,
      CASE WHEN v_store_providers ? 'no_pork' THEN (v_store_providers->>'no_pork')::boolean ELSE NULL END,
      CASE WHEN v_store_providers ? 'no_gambling' THEN (v_store_providers->>'no_gambling')::boolean ELSE NULL END,
      v_updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      verification_method = COALESCE(NULLIF(EXCLUDED.verification_method, ''), store_providers.verification_method, 'online'),
      has_certificate     = COALESCE(EXCLUDED.has_certificate, store_providers.has_certificate),
      certificate_url     = COALESCE(NULLIF(EXCLUDED.certificate_url, ''), store_providers.certificate_url),
      no_alcohol          = CASE WHEN v_store_providers ? 'no_alcohol' THEN (v_store_providers->>'no_alcohol')::boolean ELSE store_providers.no_alcohol END,
      no_pork          = CASE WHEN v_store_providers ? 'no_pork' THEN (v_store_providers->>'no_pork')::boolean ELSE store_providers.no_pork END,
      no_gambling          = CASE WHEN v_store_providers ? 'no_gambling' THEN (v_store_providers->>'no_gambling')::boolean ELSE store_providers.no_gambling END,
      updated_at          = v_updated_at;
  END IF;

  -- Replace menu items
  IF p_data ? 'menu_items' THEN
    DELETE FROM public.food_menu WHERE provider_id = p_provider_id;
    IF jsonb_array_length(v_menu_items) > 0 THEN
      INSERT INTO public.food_menu (provider_id, name_de, name_en, description_de, price_cents, category, is_available, sort_order, updated_at)
      SELECT
        p_provider_id,
        item->>'name_de',
        item->>'name_en',
        item->>'description_de',
        NULLIF(item->>'price_cents', '')::int,
        NULLIF(item->>'category', ''),
        COALESCE((item->>'is_available')::boolean, true),
        COALESCE((item->>'sort_order')::int, 0),
        v_updated_at
      FROM jsonb_array_elements(v_menu_items) AS item;
    END IF;
  END IF;

  -- Replace delivery links
  IF p_data ? 'delivery_links' THEN
    DELETE FROM public.provider_delivery_links WHERE provider_id = p_provider_id;
    IF jsonb_array_length(v_delivery_links) > 0 THEN
      INSERT INTO public.provider_delivery_links (provider_id, platform, platform_url, platform_slug, is_active, updated_at)
      SELECT
        p_provider_id,
        item->>'platform',
        item->>'platform_url',
        NULLIF(item->>'platform_slug', ''),
        COALESCE((item->>'is_active')::boolean, true),
        v_updated_at
      FROM jsonb_array_elements(v_delivery_links) AS item;
    END IF;
  END IF;

  -- Replace community service engagements
  IF p_data ? 'community_service_ids' THEN
    DELETE FROM public.provider_engagements WHERE initiating_provider_id = p_provider_id;
    IF jsonb_array_length(v_community_service_ids) > 0 THEN
      INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id)
      SELECT p_provider_id, value::uuid
      FROM jsonb_array_elements_text(v_community_service_ids) AS value;
    END IF;
  END IF;

  -- Upsert locations
  IF p_data ? 'locations' THEN
    v_existing_ids := ARRAY[]::uuid[];
    IF jsonb_array_length(v_locations) > 0 THEN
      FOR v_location IN SELECT * FROM jsonb_array_elements(v_locations)
      LOOP
        v_location_id := NULLIF(v_location->>'location_id', '')::uuid;

        -- Update in place when the id already belongs to this provider.
        IF v_location_id IS NOT NULL THEN
          UPDATE public.locations SET
            location_name    = COALESCE(NULLIF(v_location->>'location_name', ''), location_name),
            address_street   = COALESCE(NULLIF(v_location->>'address_street', ''), address_street),
            address_zip      = COALESCE(NULLIF(v_location->>'address_zip', ''), address_zip),
            address_city     = COALESCE(NULLIF(v_location->>'address_city', ''), address_city),
            address_country  = COALESCE(NULLIF(v_location->>'address_country', ''), address_country),
            location_latitude = COALESCE(NULLIF(v_location->>'location_latitude', '')::numeric, location_latitude),
            location_longitude = COALESCE(NULLIF(v_location->>'location_longitude', '')::numeric, location_longitude),
            opening_hours    = CASE WHEN v_location ? 'opening_hours'
                               THEN v_location->'opening_hours'
                               ELSE opening_hours END,
            show_address     = COALESCE(NULLIF(v_location->>'show_address', '')::boolean, show_address),
            contact_phone    = COALESCE(NULLIF(v_location->>'contact_phone', ''), contact_phone),
            is_primary       = COALESCE(NULLIF(v_location->>'is_primary', '')::boolean, is_primary),
            updated_at       = v_updated_at
          WHERE location_id = v_location_id AND provider_id = p_provider_id;

          IF FOUND THEN
            v_existing_ids := array_append(v_existing_ids, v_location_id);
            CONTINUE;
          END IF;

          -- An id was supplied but matches no row for this provider. Never touch
          -- another provider's location, and never hit a bare PK unique violation.
          IF EXISTS (SELECT 1 FROM public.locations WHERE location_id = v_location_id) THEN
            RAISE EXCEPTION 'location % belongs to another provider', v_location_id
              USING ERRCODE = 'check_violation';
          END IF;
        END IF;

        -- Insert: either no id was supplied, or the client generated one for a
        -- brand-new location (the admin edit form does exactly this).
        INSERT INTO public.locations (
          location_id, provider_id, location_name, address_street, address_zip, address_city,
          address_country, location_latitude, location_longitude, opening_hours,
          show_address, contact_phone, is_primary, updated_at
        ) VALUES (
          COALESCE(v_location_id, gen_random_uuid()),
          p_provider_id,
          NULLIF(v_location->>'location_name', ''),
          NULLIF(v_location->>'address_street', ''),
          NULLIF(v_location->>'address_zip', ''),
          NULLIF(v_location->>'address_city', ''),
          COALESCE(NULLIF(v_location->>'address_country', ''), 'DE'),
          NULLIF(v_location->>'location_latitude', '')::numeric,
          NULLIF(v_location->>'location_longitude', '')::numeric,
          CASE WHEN v_location ? 'opening_hours' THEN v_location->'opening_hours' ELSE NULL END,
          COALESCE(NULLIF(v_location->>'show_address', '')::boolean, true),
          NULLIF(v_location->>'contact_phone', ''),
          COALESCE(NULLIF(v_location->>'is_primary', '')::boolean, false),
          v_updated_at
        )
        RETURNING location_id INTO v_location_id;

        -- The inserted row must survive the delete-sweep below.
        v_existing_ids := array_append(v_existing_ids, v_location_id);
      END LOOP;

      -- Prune only when the caller actually sent a list. An empty or null
      -- locations payload must never wipe a provider's locations: with an
      -- empty v_existing_ids, `location_id <> ALL(...)` is true for every row.
      DELETE FROM public.locations
      WHERE provider_id = p_provider_id
        AND location_id <> ALL(v_existing_ids);
    END IF;
  END IF;

  SELECT to_jsonb(p.*)
  INTO v_result
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_update_provider IS
  '133 body (tri-state halal, caller-supplied location ids) plus #254: optional secondary_category_ids replace-list applied after the providers UPDATE so it measures against the new primary.';

REVOKE ALL ON FUNCTION public.admin_update_provider(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_provider(UUID, JSONB) TO service_role;

COMMIT;
