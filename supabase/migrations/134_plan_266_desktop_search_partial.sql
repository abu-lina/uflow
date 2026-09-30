-- Plan 266: unify desktop suggestions and provider results around safe prefix matching.
-- Migration application is manual; deploy the migration before the dependent app code.

CREATE OR REPLACE FUNCTION public.search_prefix_query(input_text text)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  WITH tokens AS (
    SELECT token
    FROM unnest(
      regexp_split_to_array(
        regexp_replace(lower(btrim(input_text)), '[^[:alnum:]\s]+', ' ', 'g'),
        '\s+'
      )
    ) AS token
    WHERE token <> ''
  )
  SELECT CASE
    WHEN COUNT(*) = 0 THEN NULL::tsquery
    ELSE to_tsquery('simple', string_agg(token || ':*', ' & ' ORDER BY token))
  END
  FROM tokens;
$$;

COMMENT ON FUNCTION public.search_prefix_query(text) IS
  'Builds an AND prefix tsquery from sanitized whitespace-separated tokens without stopword removal.';

-- NOTE: each index expression must match the RPC predicate EXACTLY (including
-- coalesce) or the planner cannot use it.
CREATE INDEX IF NOT EXISTS idx_providers_name_simple_search
  ON public.providers USING gin (to_tsvector('simple', coalesce(provider_name, '')));
CREATE INDEX IF NOT EXISTS idx_offers_simple_search
  ON public.offers USING gin (to_tsvector('simple', coalesce(name_de, '') || ' ' || coalesce(name_en, '')));
CREATE INDEX IF NOT EXISTS idx_needs_simple_search
  ON public.needs USING gin (to_tsvector('simple', coalesce(name_de, '') || ' ' || coalesce(name_en, '')));
CREATE INDEX IF NOT EXISTS idx_categories_simple_search
  ON public.categories USING gin (to_tsvector('simple', coalesce(name_de, '') || ' ' || coalesce(name_en, '')));
-- search_food_categories matches name + description (107 semantics).
CREATE INDEX IF NOT EXISTS idx_categories_desc_simple_search
  ON public.categories USING gin (to_tsvector('simple', coalesce(name_de, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(description_de, '') || ' ' || coalesce(description_en, '')));
CREATE INDEX IF NOT EXISTS idx_food_menu_simple_search
  ON public.food_menu USING gin (to_tsvector('simple', coalesce(name_de, '') || ' ' || coalesce(name_en, '')));

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
    AND p.review_status::text = coalesce(review_status_filter, 'approved')
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
        FROM public.categories c
        WHERE c.category_id = p.category_id
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

CREATE OR REPLACE FUNCTION public.search_scoped_suggestions(
  search_query text DEFAULT '',
  section_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL,
  result_limit integer DEFAULT 10
)
RETURNS TABLE(label text, type text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH query_terms AS (
    SELECT
      btrim(coalesce(search_query, '')) AS normalized,
      public.search_prefix_query(search_query) AS prefix_query
  ),
  -- Reuse the results matcher so a suggestion can never be shown without results.
  scoped_providers AS (
    SELECT p.provider_id, p.provider_name, p.category_id
    FROM public.search_providers_for_query(
      search_query, section_filter, city_filter, 'approved', 500
    ) m
    JOIN public.providers p ON p.provider_id = m.provider_id
  ),
  candidates AS (
    SELECT sp.provider_name AS label, 'provider'::text AS type
    FROM scoped_providers sp
    CROSS JOIN query_terms q
    WHERE sp.provider_name IS NOT NULL AND sp.provider_name <> ''
      AND (
        to_tsvector('simple', coalesce(sp.provider_name, '')) @@ plainto_tsquery('simple', q.normalized)
        OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(sp.provider_name, '')) @@ q.prefix_query)
      )
    UNION
    SELECT mi.name_de, 'menuItem'::text
    FROM public.food_menu mi
    JOIN scoped_providers sp ON sp.provider_id = mi.provider_id
    CROSS JOIN query_terms q
    WHERE mi.is_available = true
      AND mi.name_de IS NOT NULL
      AND mi.name_de <> ''
      AND (
        to_tsvector('simple', coalesce(mi.name_de, '') || ' ' || coalesce(mi.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
        OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(mi.name_de, '') || ' ' || coalesce(mi.name_en, '')) @@ q.prefix_query)
      )
    UNION
    SELECT c.name_de, 'cuisine'::text
    FROM public.categories c
    JOIN scoped_providers sp ON sp.category_id = c.category_id
    CROSS JOIN query_terms q
    WHERE c.name_de IS NOT NULL
      AND c.name_de <> ''
      AND (
        to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
        OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '')) @@ q.prefix_query)
      )
  )
  SELECT c.label, c.type
  FROM candidates c
  ORDER BY CASE WHEN lower(c.label) = lower((SELECT normalized FROM query_terms)) THEN 0 ELSE 1 END, c.label
  LIMIT greatest(result_limit, 0);
$$;

-- Keep existing signatures and 089/107 semantics (empty query = top by provider
-- count); only the broken '\\s+' tokenizer is replaced.
CREATE OR REPLACE FUNCTION public.search_food_concepts(
  search_query text DEFAULT '',
  limit_count integer DEFAULT 10
)
RETURNS TABLE(offer_id uuid, name_de text, name_en text, provider_count bigint)
LANGUAGE sql
AS $$
  WITH q AS (
    SELECT btrim(coalesce(search_query, '')) AS normalized, public.search_prefix_query(search_query) AS prefix_query
  ),
  matched AS (
    SELECT o.offer_id, o.name_de, o.name_en,
           CASE WHEN q.normalized = '' THEN 0::real ELSE greatest(
             ts_rank(to_tsvector('simple', coalesce(o.name_de, '') || ' ' || coalesce(o.name_en, '')), plainto_tsquery('simple', q.normalized)),
             coalesce(ts_rank(to_tsvector('simple', coalesce(o.name_de, '') || ' ' || coalesce(o.name_en, '')), q.prefix_query), 0)
           ) END AS rank
    FROM public.offers o
    CROSS JOIN q
    WHERE q.normalized = ''
      OR to_tsvector('simple', coalesce(o.name_de, '') || ' ' || coalesce(o.name_en, '')) @@ plainto_tsquery('simple', q.normalized)
      OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(o.name_de, '') || ' ' || coalesce(o.name_en, '')) @@ q.prefix_query)
  )
  SELECT m.offer_id, m.name_de, m.name_en, count(DISTINCT p.provider_id)
  FROM matched m
  JOIN public.provider_offers po ON po.offer_id = m.offer_id
  JOIN public.providers p ON p.provider_id = po.provider_id AND p.listing_type = 'food' AND p.review_status = 'approved'
  GROUP BY m.offer_id, m.name_de, m.name_en, m.rank
  ORDER BY m.rank DESC, count(DISTINCT p.provider_id) DESC, m.name_de
  LIMIT greatest(limit_count, 0);
$$;

CREATE OR REPLACE FUNCTION public.search_food_categories(
  search_query text DEFAULT '',
  limit_count integer DEFAULT 8
)
RETURNS TABLE(category_id uuid, name_de text, name_en text, description_de text, description_en text, category_images text, provider_count bigint)
LANGUAGE sql
AS $$
  WITH q AS (
    SELECT btrim(coalesce(search_query, '')) AS normalized, public.search_prefix_query(search_query) AS prefix_query
  ),
  matched AS (
    SELECT c.*,
           CASE WHEN q.normalized = '' THEN 0::real ELSE greatest(
             ts_rank(to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '') || ' ' || coalesce(c.description_de, '') || ' ' || coalesce(c.description_en, '')), plainto_tsquery('simple', q.normalized)),
             coalesce(ts_rank(to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '') || ' ' || coalesce(c.description_de, '') || ' ' || coalesce(c.description_en, '')), q.prefix_query), 0)
           ) END AS rank
    FROM public.categories c
    CROSS JOIN q
    WHERE c.applicable_section = 'food'
      AND (
        q.normalized = ''
        OR to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '') || ' ' || coalesce(c.description_de, '') || ' ' || coalesce(c.description_en, '')) @@ plainto_tsquery('simple', q.normalized)
        OR (q.prefix_query IS NOT NULL AND to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '') || ' ' || coalesce(c.description_de, '') || ' ' || coalesce(c.description_en, '')) @@ q.prefix_query)
      )
  )
  SELECT m.category_id, m.name_de, m.name_en, m.description_de, m.description_en, m.category_images::text,
         count(DISTINCT p.provider_id)
  FROM matched m
  LEFT JOIN public.providers p
    ON p.category_id = m.category_id AND p.listing_type = 'food' AND p.review_status = 'approved'
  GROUP BY m.category_id, m.name_de, m.name_en, m.description_de, m.description_en, m.category_images::text, m.rank
  ORDER BY m.rank DESC, count(DISTINCT p.provider_id) DESC, m.name_de
  LIMIT greatest(limit_count, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_prefix_query(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_providers_for_query(text, text, text, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_scoped_suggestions(text, text, text, integer) TO anon, authenticated, service_role;
