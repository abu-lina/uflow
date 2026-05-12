-- Plan 129 hotfix
-- Fix runtime 42703 in search_food_concepts after providers.offers_ids was
-- dropped in phase 3 referential-integrity migration.

DROP FUNCTION IF EXISTS public.search_food_concepts(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.search_food_concepts(
  search_query TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  offer_id UUID,
  name_de TEXT,
  name_en TEXT,
  provider_count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH query_input AS (
    SELECT
      btrim(COALESCE(search_query, '')) AS normalized,
      NULLIF(
        array_to_string(
          ARRAY(
            SELECT token || ':*'
            FROM unnest(
              regexp_split_to_array(
                regexp_replace(lower(btrim(COALESCE(search_query, ''))), '[^[:alnum:]\s]+', ' ', 'g'),
                '\\s+'
              )
            ) AS token
            WHERE token <> ''
          ),
          ' & '
        ),
        ''
      ) AS prefix_query_str
  ),
  query_terms AS (
    SELECT
      normalized,
      CASE WHEN prefix_query_str IS NULL THEN NULL ELSE to_tsquery('german', prefix_query_str) END AS german_prefix_query,
      CASE WHEN prefix_query_str IS NULL THEN NULL ELSE to_tsquery('english', prefix_query_str) END AS english_prefix_query
    FROM query_input
  ),
  matched_offers AS (
    SELECT
      o.offer_id,
      o.name_de,
      o.name_en,
      CASE
        WHEN qt.normalized = '' THEN 0::REAL
        ELSE GREATEST(
          ts_rank(
            to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
            plainto_tsquery('german', qt.normalized)
          ),
          ts_rank(
            to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
            plainto_tsquery('english', qt.normalized)
          ),
          CASE
            WHEN qt.german_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
              qt.german_prefix_query
            )
          END,
          CASE
            WHEN qt.english_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
              qt.english_prefix_query
            )
          END
        )
      END AS rank
    FROM public.offers o
    CROSS JOIN query_terms qt
    WHERE
      qt.normalized = ''
      OR to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')) @@ plainto_tsquery('german', qt.normalized)
      OR to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')) @@ plainto_tsquery('english', qt.normalized)
      OR (qt.german_prefix_query IS NOT NULL AND to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')) @@ qt.german_prefix_query)
      OR (qt.english_prefix_query IS NOT NULL AND to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')) @@ qt.english_prefix_query)
  )
  SELECT
    mo.offer_id,
    mo.name_de,
    mo.name_en,
    COUNT(DISTINCT p.provider_id) AS provider_count
  FROM matched_offers mo
  INNER JOIN public.provider_offers po
    ON po.offer_id = mo.offer_id
  INNER JOIN public.providers p
    ON p.provider_id = po.provider_id
   AND p.listing_type = 'food'
   AND p.review_status = 'approved'
  GROUP BY mo.offer_id, mo.name_de, mo.name_en, mo.rank
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN COUNT(DISTINCT p.provider_id) END DESC,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN mo.rank END DESC,
    COUNT(DISTINCT p.provider_id) DESC,
    mo.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$$;

COMMENT ON FUNCTION public.search_food_concepts(TEXT, INTEGER) IS
  'Searches canonical food concepts (offers) with exact and prefix text matching and returns approved food-provider counts.';

REVOKE ALL ON FUNCTION public.search_food_concepts(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_food_concepts(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_food_concepts(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_food_concepts(TEXT, INTEGER) TO service_role;
