-- =============================================================================
-- Migration 084: M-6 — Table Renames (Semantic Clarity)
-- Plan: PLAN-116  Origin: 118  UUID: e7a3f1c9
-- Renames:
--   provider_menu_items   → provider_menu
--   provider_service_offers → provider_catalog
-- Rationale: Shorter, more consistent names. "items" and "offers" suffixes
--   were redundant given the table is inherently a collection. "menu" and
--   "catalog" match the domain vocabulary used in the UI and API layer.
-- Impact: Zero data changes. Structural rename only.
--   Functions search_food_menu_items and search_provider_items rewritten
--   to reference new table names.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Rename tables
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='provider_menu_items') THEN
    ALTER TABLE public.provider_menu_items RENAME TO provider_menu;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='provider_service_offers') THEN
    ALTER TABLE public.provider_service_offers RENAME TO provider_catalog;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: Rewrite search_food_menu_items — references provider_menu_items → provider_menu
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_food_menu_items(
  search_query   TEXT DEFAULT '',
  limit_count    INTEGER DEFAULT 10
)
RETURNS TABLE(name_de TEXT, name_en TEXT, provider_count BIGINT)
LANGUAGE sql
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
                '\s+'
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
  FROM public.provider_menu mi
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

COMMENT ON FUNCTION public.search_food_menu_items(text, integer) IS
  'Searches provider menu items with exact and prefix text matching and returns deduplicated dish names with approved food-provider counts.';

-- ---------------------------------------------------------------------------
-- Step 3: Rewrite search_provider_items — references provider_menu and provider_catalog
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_provider_items(
  search_query        TEXT    DEFAULT '',
  listing_type_filter TEXT    DEFAULT NULL,
  provider_id_filter  UUID    DEFAULT NULL,
  limit_count         INTEGER DEFAULT 50,
  offset_count        INTEGER DEFAULT 0
)
RETURNS TABLE(
  item_id      UUID,
  provider_id  UUID,
  item_type    TEXT,
  name_de      TEXT,
  name_en      TEXT,
  price_cents  INTEGER,
  is_available BOOLEAN,
  rank         REAL
)
LANGUAGE sql
AS $$
  WITH menu_rows AS (
    SELECT
      m.id AS item_id,
      m.provider_id,
      'menu_item'::TEXT AS item_type,
      m.name_de,
      m.name_en,
      m.price_cents,
      m.is_available,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE ts_rank(m.search_vector, plainto_tsquery('german', search_query))
      END AS rank,
      m.sort_order,
      p.listing_type::TEXT AS listing_type
    FROM public.provider_menu m
    JOIN public.providers p ON p.provider_id = m.provider_id
    WHERE
      m.is_available = true
      AND (provider_id_filter IS NULL OR m.provider_id = provider_id_filter)
      AND (listing_type_filter IS NULL OR p.listing_type::TEXT = listing_type_filter)
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR m.search_vector @@ plainto_tsquery('german', search_query)
      )
  ),
  service_rows AS (
    SELECT
      s.id AS item_id,
      s.provider_id,
      'service_offer'::TEXT AS item_type,
      s.name_de,
      s.name_en,
      s.price_cents,
      s.is_available,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE ts_rank(s.search_vector, plainto_tsquery('german', search_query))
      END AS rank,
      s.sort_order,
      p.listing_type::TEXT AS listing_type
    FROM public.provider_catalog s
    JOIN public.providers p ON p.provider_id = s.provider_id
    WHERE
      s.is_available = true
      AND (provider_id_filter IS NULL OR s.provider_id = provider_id_filter)
      AND (listing_type_filter IS NULL OR p.listing_type::TEXT = listing_type_filter)
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR s.search_vector @@ plainto_tsquery('german', search_query)
      )
  )
  SELECT
    u.item_id,
    u.provider_id,
    u.item_type,
    u.name_de,
    u.name_en,
    u.price_cents,
    u.is_available,
    u.rank
  FROM (
    SELECT * FROM menu_rows
    UNION ALL
    SELECT * FROM service_rows
  ) u
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN u.sort_order END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN u.name_de END ASC,
    CASE WHEN btrim(COALESCE(search_query,''))<>'' THEN u.rank END DESC,
    u.name_de ASC
  LIMIT GREATEST(limit_count, 0)
  OFFSET GREATEST(offset_count, 0);
$$;

COMMENT ON FUNCTION public.search_provider_items(text, text, uuid, integer, integer) IS
  'Unified item search across provider_menu and provider_catalog with listing_type/provider filters.';
