-- =====================================================
-- PLAN 098: ADD CATEGORY IMAGES TO CATEGORY SEARCH RPC
-- =====================================================
-- Extends search_food_categories to return category_images
-- so Was? rows can render a 48x48 icon slot.
--
-- Notes:
-- - Additive signature change only (new column)
-- - category_images stored as JSONB in categories table
-- - Cast JSONB -> TEXT for frontend parsing parity
-- - SECURITY INVOKER (consistent with other search RPCs)
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_food_categories(
  search_query TEXT DEFAULT '',
  limit_count  INTEGER DEFAULT 8
)
RETURNS TABLE (
  category_id    UUID,
  name_de        TEXT,
  name_en        TEXT,
  description_de TEXT,
  description_en TEXT,
  category_images TEXT,
  provider_count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH matched_categories AS (
    SELECT
      c.category_id,
      c.name_de,
      c.name_en,
      c.description_de,
      c.description_en,
      c.category_images::TEXT AS category_images,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE GREATEST(
          ts_rank(
            to_tsvector('german',
              COALESCE(c.name_de, '') || ' ' ||
              COALESCE(c.description_de, '')
            ),
            plainto_tsquery('german', search_query)
          ),
          ts_rank(
            to_tsvector('english',
              COALESCE(c.name_en, '') || ' ' ||
              COALESCE(c.description_en, '')
            ),
            plainto_tsquery('english', search_query)
          )
        )
      END AS rank
    FROM public.categories c
    WHERE
      c.applicable_section = 'food'
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR to_tsvector('german',
             COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, ''))
           @@ plainto_tsquery('german', search_query)
        OR to_tsvector('english',
             COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, ''))
           @@ plainto_tsquery('english', search_query)
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
  'Searches food cuisine categories and returns each with category_images and approved food-provider count.';
