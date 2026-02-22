-- Migration 056: Add GIN tsvector indexes for providers and community_services
-- Part of Plan 007 — Performance Improvements v0.4.0
-- 
-- Problem: search_providers_enhanced and search_community_services_enhanced
-- compute to_tsvector() at query time without supporting indexes, causing
-- sequential scans. providers.provider_name and community_services.community_service_name
-- lack GIN indexes (unlike offers/needs which have them from migration 014).
--
-- Solution: Add GIN tsvector indexes matching the patterns used in existing RPC
-- functions, plus helper RPCs for filtered city/category lookups that currently
-- use forbidden ILIKE.

-- ============================================================================
-- 1. GIN INDEXES
-- ============================================================================

-- Index for provider name only (provider_description column does not exist in production)
CREATE INDEX IF NOT EXISTS idx_providers_name_search
ON public.providers USING gin(
  to_tsvector('german', provider_name)
);

-- Index for community service name only
CREATE INDEX IF NOT EXISTS idx_community_services_name_search
ON public.community_services USING gin(
  to_tsvector('german', community_service_name)
);

-- Index for community service name + description (community_service_description exists)
CREATE INDEX IF NOT EXISTS idx_community_services_name_desc_search
ON public.community_services USING gin(
  to_tsvector('german', community_service_name || ' ' || COALESCE(community_service_description, ''))
);

-- ============================================================================
-- 2. HELPER RPC: Search provider IDs by name (tsvector)
-- ============================================================================
-- Used by searchProviders() in providers.ts to replace ILIKE on provider_name.
-- Returns only provider_ids for efficient OR-condition building.

CREATE OR REPLACE FUNCTION search_provider_ids_by_name(
  search_query TEXT DEFAULT ''
)
RETURNS TABLE (provider_id UUID) AS $$
BEGIN
  IF search_query = '' OR search_query IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.provider_id
  FROM public.providers p
  WHERE p.review_status = 'approved'
    AND to_tsvector('german', p.provider_name)
        @@ plainto_tsquery('german', search_query)
  LIMIT 500; -- Safety cap for provider ID lookup — well above expected provider count; prevents runaway scans
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. HELPER RPC: Get filtered cities by search query
-- ============================================================================
-- Used by fetchFilteredCities() in providers.ts to replace ILIKE.
-- Returns distinct cities from both providers and community_services
-- matching a tsvector search query and optional category filter.

CREATE OR REPLACE FUNCTION get_filtered_cities_by_search(
  search_query TEXT DEFAULT '',
  category_filter UUID DEFAULT NULL
)
RETURNS TABLE (city TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT sub.address_city
  FROM (
    -- Provider cities
    SELECT p.address_city
    FROM public.providers p
    WHERE p.review_status = 'approved'
      AND p.address_city IS NOT NULL
      AND p.address_city != ''
      AND (search_query = '' OR search_query IS NULL OR
           to_tsvector('german', p.provider_name)
           @@ plainto_tsquery('german', search_query))
      AND (category_filter IS NULL OR p.category_id = category_filter)

    UNION

    -- Community service cities
    SELECT cs.address_city
    FROM public.community_services cs
    WHERE cs.review_status = 'approved'
      AND cs.address_city IS NOT NULL
      AND cs.address_city != ''
      AND (search_query = '' OR search_query IS NULL OR
           to_tsvector('german', cs.community_service_name || ' ' || COALESCE(cs.community_service_description, ''))
           @@ plainto_tsquery('german', search_query))
      AND (category_filter IS NULL OR cs.category_id = category_filter)
  ) sub
  ORDER BY sub.address_city;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. HELPER RPC: Get filtered category IDs by search query
-- ============================================================================
-- Used by fetchFilteredCategories() in categories.ts to replace ILIKE.
-- Returns distinct category_ids from providers matching a tsvector search
-- query and optional location filter.

CREATE OR REPLACE FUNCTION get_filtered_category_ids_by_search(
  search_query TEXT DEFAULT '',
  location_filter TEXT DEFAULT NULL
)
RETURNS TABLE (category_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.category_id
  FROM public.providers p
  WHERE p.review_status = 'approved'
    AND p.category_id IS NOT NULL
    AND (search_query = '' OR search_query IS NULL OR
         to_tsvector('german', p.provider_name)
         @@ plainto_tsquery('german', search_query))
    AND (location_filter IS NULL OR location_filter = 'Überall' OR p.address_city = location_filter)
  ORDER BY p.category_id;
END;
$$ LANGUAGE plpgsql STABLE;
