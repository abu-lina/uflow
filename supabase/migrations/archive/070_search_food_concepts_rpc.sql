-- =====================================================
-- PLAN 097: FOOD CONCEPT SEARCH RPC (WAS? SEARCH)
-- =====================================================
-- Searches canonical food concepts in public.offers and returns
-- deduplicated concepts with provider counts from approved food providers.
--
-- Key constraints:
-- - Use offers vocabulary table as source of truth for concept names
-- - Join providers via GIN-friendly offers_ids containment (@>)
-- - Include both German and English tsvector matching
-- - SECURITY INVOKER (consistent with existing search RPCs)
-- =====================================================

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
  WITH matched_offers AS (
    SELECT
      o.offer_id,
      o.name_de,
      o.name_en,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE GREATEST(
          ts_rank(
            to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
            plainto_tsquery('german', search_query)
          ),
          ts_rank(
            to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
            plainto_tsquery('english', search_query)
          )
        )
      END AS rank
    FROM public.offers o
    WHERE
      btrim(COALESCE(search_query, '')) = ''
      OR to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, ''))
          @@ plainto_tsquery('german', search_query)
      OR to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, ''))
          @@ plainto_tsquery('english', search_query)
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
  'Searches canonical food concepts (offers) and returns deduplicated concepts with approved food-provider counts.';
