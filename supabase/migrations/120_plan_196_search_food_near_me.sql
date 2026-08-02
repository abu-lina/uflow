-- Plan 196: "Near me + open now" restaurant search.
-- Adds a new, additive RPC that returns approved food providers within a
-- radius of a point, using nearest-location-per-provider semantics against
-- the `locations` table (Analysis 196 #4). Does NOT modify or replace the
-- existing `find_nearby_food_providers` function (Analysis 196 #2 / Critic F-none),
-- which remains the "related nearby food" lookup used by the provider detail page.
--
-- Open-now filtering is intentionally NOT performed in SQL (Analysis 196 #3):
-- opening_hours is returned as raw JSONB so the client can reuse the single
-- tested source of truth (src/utils/openStatus.ts getOpenStatus), which uses
-- device-local time and already handles overnight windows correctly.

BEGIN;

-- Partial index for the approved-food + non-null-coords radius query (Critic F3).
CREATE INDEX IF NOT EXISTS idx_locations_food_approved_coords
  ON public.locations (provider_id)
  WHERE location_latitude IS NOT NULL
    AND location_longitude IS NOT NULL;

COMMENT ON INDEX public.idx_locations_food_approved_coords IS
  'Partial index supporting search_food_near_me radius queries against locations with coordinates.';

DROP FUNCTION IF EXISTS public.search_food_near_me;

CREATE OR REPLACE FUNCTION public.search_food_near_me(
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_radius_km NUMERIC DEFAULT 5,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  provider_images JSONB,
  address_city TEXT,
  opening_hours JSONB,
  location_latitude NUMERIC,
  location_longitude NUMERIC,
  distance_km NUMERIC
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH candidate_locations AS (
    SELECT DISTINCT ON (l.provider_id)
      l.provider_id,
      p.provider_name,
      p.provider_images,
      l.address_city,
      l.opening_hours,
      l.location_latitude,
      l.location_longitude,
      -- Haversine distance in km (earth radius ~= 6371 km).
      -- Clamp acos argument to [-1, 1] to prevent NaN from floating-point rounding
      -- (same pattern as find_nearby_food_providers, migration 093).
      6371 * acos(
        GREATEST(-1, LEAST(1,
          sin(radians(p_lat)) * sin(radians(l.location_latitude))
          + cos(radians(p_lat)) * cos(radians(l.location_latitude))
          * cos(radians(l.location_longitude - p_lon))
        ))
      ) AS distance_km
    FROM public.locations l
    JOIN public.providers p ON p.provider_id = l.provider_id
    WHERE
      p.listing_type = 'food'::public.listing_type_enum
      AND p.review_status = 'approved'::public.review_status
      AND l.location_latitude IS NOT NULL
      AND l.location_longitude IS NOT NULL
      -- Reject out-of-range coordinates server-side (Critic F2) rather than
      -- computing a meaningless distance for garbage input.
      AND p_lat BETWEEN -90 AND 90
      AND p_lon BETWEEN -180 AND 180
    ORDER BY l.provider_id, distance_km ASC
  )
  SELECT
    cl.provider_id,
    cl.provider_name,
    cl.provider_images,
    cl.address_city,
    cl.opening_hours,
    cl.location_latitude,
    cl.location_longitude,
    ROUND(cl.distance_km::NUMERIC, 2) AS distance_km
  FROM candidate_locations cl
  WHERE
    p_lat BETWEEN -90 AND 90
    AND p_lon BETWEEN -180 AND 180
    -- Clamp the radius server-side (Critic F1): never search beyond 25 km
    -- regardless of what the client requests.
    AND cl.distance_km <= LEAST(p_radius_km, 25)
  ORDER BY distance_km ASC
  -- Hard server-side LIMIT (Critic F1): candidate cap is server-authoritative,
  -- bounded between 1 and 100 regardless of what the client requests.
  LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

COMMENT ON FUNCTION public.search_food_near_me IS
  'Plan 196: Returns approved food providers within a radius (km, capped at 25) of a point, '
  'nearest-location-per-provider, distance-ordered. opening_hours returned raw for client-side open-now filtering.';

REVOKE ALL ON FUNCTION public.search_food_near_me FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_food_near_me TO anon;
GRANT EXECUTE ON FUNCTION public.search_food_near_me TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_food_near_me TO service_role;

COMMIT;
