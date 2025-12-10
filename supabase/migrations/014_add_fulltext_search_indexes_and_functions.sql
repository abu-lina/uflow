-- Migration: Add full-text search indexes and functions for offers, needs, and providers
-- This implements the Reddit post recommendation to use Postgres tsvector instead of ILIKE
-- Date: 2025-01-XX

-- Add tsvector indexes for offers table
CREATE INDEX IF NOT EXISTS idx_offers_name_de_search ON public.offers USING gin(to_tsvector('german', name_de));
CREATE INDEX IF NOT EXISTS idx_offers_name_en_search ON public.offers USING gin(to_tsvector('english', name_en));
CREATE INDEX IF NOT EXISTS idx_offers_combined_search ON public.offers USING gin(
  to_tsvector('german', COALESCE(name_de, '') || ' ' || COALESCE(name_en, ''))
);

-- Add tsvector indexes for needs table
CREATE INDEX IF NOT EXISTS idx_needs_name_de_search ON public.needs USING gin(to_tsvector('german', name_de));
CREATE INDEX IF NOT EXISTS idx_needs_name_en_search ON public.needs USING gin(to_tsvector('english', name_en));
CREATE INDEX IF NOT EXISTS idx_needs_combined_search ON public.needs USING gin(
  to_tsvector('german', COALESCE(name_de, '') || ' ' || COALESCE(name_en, ''))
);

-- Function to search offers with full-text search and ranking
CREATE OR REPLACE FUNCTION search_offers(
  search_query TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  offer_id UUID,
  name_de TEXT,
  name_en TEXT,
  category_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.offer_id,
    o.name_de,
    o.name_en,
    o.category_id,
    o.created_by,
    o.created_at,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
        plainto_tsquery('german', search_query)
      ) + ts_rank(
        to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
        plainto_tsquery('english', search_query)
      )
    END as rank
  FROM public.offers o
  WHERE 
    search_query = '' OR 
    to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')) @@ plainto_tsquery('german', search_query) OR
    to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    CASE WHEN search_query = '' THEN created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    name_de ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search needs with full-text search and ranking
CREATE OR REPLACE FUNCTION search_needs(
  search_query TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  need_id UUID,
  name_de TEXT,
  name_en TEXT,
  category_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.need_id,
    n.name_de,
    n.name_en,
    n.category_id,
    n.created_by,
    n.created_at,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', COALESCE(n.name_de, '') || ' ' || COALESCE(n.name_en, '')),
        plainto_tsquery('german', search_query)
      ) + ts_rank(
        to_tsvector('english', COALESCE(n.name_en, '') || ' ' || COALESCE(n.name_de, '')),
        plainto_tsquery('english', search_query)
      )
    END as rank
  FROM public.needs n
  WHERE 
    search_query = '' OR 
    to_tsvector('german', COALESCE(n.name_de, '') || ' ' || COALESCE(n.name_en, '')) @@ plainto_tsquery('german', search_query) OR
    to_tsvector('english', COALESCE(n.name_en, '') || ' ' || COALESCE(n.name_de, '')) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    CASE WHEN search_query = '' THEN created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    name_de ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to search providers with full-text search
-- This improves the existing search_providers function to better handle offers/needs matching
CREATE OR REPLACE FUNCTION search_providers_enhanced(
  search_query TEXT DEFAULT '',
  category_filter UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  provider_description TEXT,
  address_city TEXT,
  category_id UUID,
  category_name TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.provider_description,
    p.address_city,
    p.category_id,
    c.name_de as category_name,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
        plainto_tsquery('german', search_query)
      )
    END as rank
  FROM public.providers p
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE 
    p.review_status = 'approved'
    AND (search_query = '' OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')) @@ plainto_tsquery('german', search_query))
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (city_filter IS NULL OR p.address_city = city_filter)
  ORDER BY 
    CASE WHEN search_query = '' THEN p.created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search community services with full-text search
CREATE OR REPLACE FUNCTION search_community_services_enhanced(
  search_query TEXT DEFAULT '',
  category_filter UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  community_service_id UUID,
  community_service_name TEXT,
  community_service_description TEXT,
  address_city TEXT,
  category_id UUID,
  category_name TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.community_service_id,
    cs.community_service_name,
    cs.community_service_description,
    cs.address_city,
    cs.category_id,
    c.name_de as category_name,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', cs.community_service_name || ' ' || COALESCE(cs.community_service_description, '')),
        plainto_tsquery('german', search_query)
      )
    END as rank
  FROM public.community_services cs
  LEFT JOIN public.categories c ON cs.category_id = c.category_id
  WHERE 
    cs.review_status = 'approved'
    AND (search_query = '' OR to_tsvector('german', cs.community_service_name || ' ' || COALESCE(cs.community_service_description, '')) @@ plainto_tsquery('german', search_query))
    AND (category_filter IS NULL OR cs.category_id = category_filter)
    AND (city_filter IS NULL OR cs.address_city = city_filter)
  ORDER BY 
    CASE WHEN search_query = '' THEN cs.created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    cs.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

