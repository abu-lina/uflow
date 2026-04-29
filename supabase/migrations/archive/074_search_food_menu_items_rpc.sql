-- =====================================================
-- PLAN 098: FOOD MENU ITEM SEARCH RPC (WAS? SECTION)
-- =====================================================
-- Searches provider_menu_items.search_vector and returns
-- deduplicated dish names with approved food-provider counts.
--
-- Key points:
-- - Searches the per-provider menu items table (high coverage)
-- - Groups by exact name_de so "Burger" merges across providers
-- - Empty/short query guard: returns 0 rows (never called with < 2 chars)
-- - plainto_tsquery('german', ...) leverages the existing GIN index
-- - SECURITY INVOKER (consistent with other search RPCs)
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_food_menu_items(
  search_query TEXT DEFAULT '',
  limit_count  INTEGER DEFAULT 10
)
RETURNS TABLE (
  name_de        TEXT,
  name_en        TEXT,
  provider_count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    mi.name_de,
    MAX(mi.name_en)                  AS name_en,
    COUNT(DISTINCT p.provider_id)    AS provider_count
  FROM public.provider_menu_items mi
  INNER JOIN public.providers p
    ON p.provider_id    = mi.provider_id
   AND p.listing_type   = 'food'
   AND p.review_status  = 'approved'
  WHERE
    btrim(COALESCE(search_query, '')) <> ''
    AND mi.is_available  = true
    AND mi.search_vector @@ plainto_tsquery('german', search_query)
  GROUP BY
    mi.name_de
  ORDER BY
    ts_rank(
      to_tsvector('german', mi.name_de),
      plainto_tsquery('german', search_query)
    ) DESC,
    COUNT(DISTINCT p.provider_id) DESC,
    mi.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$$;

COMMENT ON FUNCTION public.search_food_menu_items(TEXT, INTEGER) IS
  'Searches provider menu items and returns deduplicated dish names with approved food-provider counts.';
