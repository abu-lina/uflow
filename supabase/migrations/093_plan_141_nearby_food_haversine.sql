-- Plan 141: Nearby food providers using Haversine distance with city-based fallback.
-- Replaces the simple city-based nearby query with a Haversine-based proximity
-- search using the providers' lat/lng coordinates, falling back to city match.

BEGIN;

-- Drop if exists to allow idempotent re-runs
DROP FUNCTION IF EXISTS public.find_nearby_food_providers;

CREATE OR REPLACE FUNCTION public.find_nearby_food_providers(
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_exclude_id UUID,
  p_radius_km NUMERIC DEFAULT 10,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  distance_km NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH provider_distances AS (
    SELECT
      p.provider_id,
      p.provider_name,
      -- Haversine distance in km (earth radius ≈ 6371 km)
      -- Clamp acos argument to [-1, 1] to prevent NaN from floating-point rounding
      6371 * acos(
        GREATEST(-1, LEAST(1,
          sin(radians(p_lat)) * sin(radians(p.location_latitude))
          + cos(radians(p_lat)) * cos(radians(p.location_latitude))
          * cos(radians(p.location_longitude - p_lon))
        ))
      ) AS distance_km
    FROM public.providers p
    WHERE
      p.listing_type = 'food'::public.listing_type_enum
      AND p.review_status = 'approved'::public.review_status
      AND p.provider_id <> p_exclude_id
      AND p.location_latitude IS NOT NULL
      AND p.location_longitude IS NOT NULL
      AND 6371 * acos(
        GREATEST(-1, LEAST(1,
          sin(radians(p_lat)) * sin(radians(p.location_latitude))
          + cos(radians(p_lat)) * cos(radians(p.location_latitude))
          * cos(radians(p.location_longitude - p_lon))
        ))
      ) <= p_radius_km
  )
  SELECT
    pd.provider_id,
    pd.provider_name,
    ROUND(pd.distance_km::NUMERIC, 2) AS distance_km
  FROM provider_distances pd
  ORDER BY pd.distance_km ASC
  LIMIT GREATEST(p_limit, 0);
$$;

COMMENT ON FUNCTION public.find_nearby_food_providers IS
  'Returns approved food providers within a given radius (km) using Haversine distance.';

REVOKE ALL ON FUNCTION public.find_nearby_food_providers FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_food_providers TO anon;
GRANT EXECUTE ON FUNCTION public.find_nearby_food_providers TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearby_food_providers TO service_role;

-- Partial index for the food + approved + coordinates filter
CREATE INDEX IF NOT EXISTS idx_providers_food_approved_location
  ON public.providers (listing_type, review_status)
  WHERE listing_type = 'food'::public.listing_type_enum
    AND review_status = 'approved'::public.review_status
    AND location_latitude IS NOT NULL
    AND location_longitude IS NOT NULL;

COMMENT ON INDEX public.idx_providers_food_approved_location IS
  'Partial index for nearby food provider queries that filter by listing_type, review_status, and non-null coordinates.';

COMMIT;
