-- =====================================================
-- FOOD SEARCH PREFIX MATCHING (AD-HOC BUGFIX)
-- =====================================================
-- Problem:
--   plainto_tsquery does exact lexeme matching and does not support
--   incremental prefix input (e.g. "Afgh" should match "Afghanische").
--
-- Solution:
--   Extend food search RPCs to include a sanitized prefix tsquery (`:*`)
--   in both filtering and ranking, while preserving existing tsvector paths.
-- =====================================================

-- Compatibility guard for environments with older function row types.
-- CREATE OR REPLACE cannot change OUT parameter row definitions.
DROP FUNCTION IF EXISTS public.search_food_concepts(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.search_food_categories(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.search_food_menu_items(TEXT, INTEGER);

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
  INNER JOIN public.providers p
    ON p.offers_ids @> ARRAY[mo.offer_id]
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


CREATE OR REPLACE FUNCTION public.search_food_categories(
  search_query TEXT DEFAULT '',
  limit_count  INTEGER DEFAULT 8
)
RETURNS TABLE (
  category_id UUID,
  name_de TEXT,
  name_en TEXT,
  description_de TEXT,
  description_en TEXT,
  category_images TEXT,
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
  matched_categories AS (
    SELECT
      c.category_id,
      CASE
        WHEN c.name_de IS NULL THEN NULL
        ELSE regexp_replace(
          regexp_replace(c.name_de, '\\s*Küche\\s*$', '', 'i'),
          'ische$',
          'isch',
          'i'
        )
      END AS name_de,
      c.name_en,
      c.description_de,
      c.description_en,
      c.category_images::TEXT AS category_images,
      CASE
        WHEN qt.normalized = '' THEN 0::REAL
        ELSE GREATEST(
          ts_rank(
            to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')),
            plainto_tsquery('german', qt.normalized)
          ),
          ts_rank(
            to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')),
            plainto_tsquery('english', qt.normalized)
          ),
          CASE
            WHEN qt.german_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')),
              qt.german_prefix_query
            )
          END,
          CASE
            WHEN qt.english_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')),
              qt.english_prefix_query
            )
          END
        )
      END AS rank
    FROM public.categories c
    CROSS JOIN query_terms qt
    WHERE
      c.applicable_section = 'food'
      AND (
        qt.normalized = ''
        OR to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')) @@ plainto_tsquery('german', qt.normalized)
        OR to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')) @@ plainto_tsquery('english', qt.normalized)
        OR (qt.german_prefix_query IS NOT NULL AND to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')) @@ qt.german_prefix_query)
        OR (qt.english_prefix_query IS NOT NULL AND to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')) @@ qt.english_prefix_query)
      )
  )
  SELECT
    mc.category_id,
    mc.name_de,
    mc.name_en,
    mc.description_de,
    mc.description_en,
    mc.category_images,
    COUNT(DISTINCT p.provider_id) AS provider_count
  FROM matched_categories mc
  LEFT JOIN public.providers p
    ON p.category_id = mc.category_id
   AND p.listing_type = 'food'
   AND p.review_status = 'approved'
  GROUP BY
    mc.category_id, mc.name_de, mc.name_en,
    mc.description_de, mc.description_en,
    mc.category_images, mc.rank
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN COUNT(DISTINCT p.provider_id) END DESC NULLS LAST,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN mc.rank END DESC NULLS LAST,
    COUNT(DISTINCT p.provider_id) DESC,
    mc.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$$;

COMMENT ON FUNCTION public.search_food_categories(TEXT, INTEGER) IS
  'Searches food cuisine categories with exact and prefix text matching, returns display-normalized German names, category_images, and approved food-provider count.';

REVOKE ALL ON FUNCTION public.search_food_categories(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_food_categories(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_food_categories(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_food_categories(TEXT, INTEGER) TO service_role;


CREATE OR REPLACE FUNCTION public.search_food_menu_items(
  search_query TEXT DEFAULT '',
  limit_count  INTEGER DEFAULT 10
)
RETURNS TABLE (
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
      CASE WHEN prefix_query_str IS NULL THEN NULL ELSE to_tsquery('german', prefix_query_str) END AS german_prefix_query
    FROM query_input
  )
  SELECT
    mi.name_de,
    MAX(mi.name_en) AS name_en,
    COUNT(DISTINCT p.provider_id) AS provider_count
  FROM public.provider_menu_items mi
  INNER JOIN public.providers p
    ON p.provider_id = mi.provider_id
   AND p.listing_type = 'food'
   AND p.review_status = 'approved'
  CROSS JOIN query_terms qt
  WHERE
    qt.normalized <> ''
    AND mi.is_available = true
    AND (
      mi.search_vector @@ plainto_tsquery('german', qt.normalized)
      OR (qt.german_prefix_query IS NOT NULL AND mi.search_vector @@ qt.german_prefix_query)
    )
  GROUP BY
    mi.name_de
  ORDER BY
    MAX(
      GREATEST(
        ts_rank(to_tsvector('german', mi.name_de), plainto_tsquery('german', qt.normalized)),
        CASE
          WHEN qt.german_prefix_query IS NULL THEN 0::REAL
          ELSE ts_rank(to_tsvector('german', mi.name_de), qt.german_prefix_query)
        END
      )
    ) DESC,
    COUNT(DISTINCT p.provider_id) DESC,
    mi.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$$;

COMMENT ON FUNCTION public.search_food_menu_items(TEXT, INTEGER) IS
  'Searches provider menu items with exact and prefix text matching and returns deduplicated dish names with approved food-provider counts.';

REVOKE ALL ON FUNCTION public.search_food_menu_items(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_food_menu_items(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_food_menu_items(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_food_menu_items(TEXT, INTEGER) TO service_role;
