-- Plan 267: give admin list searches an explicit all-moderation-status scope.
-- Migration application is manual; apply this before deploying the dependent app code.

BEGIN;

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

DROP FUNCTION IF EXISTS public.search_scoped_suggestions(text, text, text, integer);

CREATE OR REPLACE FUNCTION public.search_scoped_suggestions(
  search_query text DEFAULT '',
  section_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL,
  result_limit integer DEFAULT 10,
  review_status_scope text DEFAULT 'approved'
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
      search_query, section_filter, city_filter, review_status_scope, 500
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

GRANT EXECUTE ON FUNCTION public.search_providers_for_query(text, text, text, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_scoped_suggestions(text, text, text, integer, text) TO anon, authenticated, service_role;

COMMIT;