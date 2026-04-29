-- =====================================================
-- CREATE get_cities_with_counts RPC FUNCTION
-- =====================================================
-- Issue: City selection page makes 3 sequential database queries:
-- 1. Fetch cities table
-- 2. Fetch provider counts from providers table
-- 3. Fetch interest counts via RPC
-- 
-- Solution: Create a single RPC function that combines all 3 queries
-- This reduces database round trips and improves performance
-- =====================================================

-- Create function to get all cities with provider and interest counts
-- Returns cities with real-time counts from providers and waitlist tables
CREATE OR REPLACE FUNCTION get_cities_with_counts()
RETURNS TABLE (
  id UUID,
  city_name TEXT,
  country TEXT,
  is_unlocked BOOLEAN,
  provider_count BIGINT,
  interest_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.city_name,
    c.country,
    c.is_unlocked,
    COALESCE(p.count, 0)::BIGINT as provider_count,
    COALESCE(w.count, 0)::BIGINT as interest_count
  FROM cities c
  LEFT JOIN (
    SELECT 
      LOWER(TRIM(address_city)) as city_name_lower,
      COUNT(*)::BIGINT as count
    FROM providers
    WHERE review_status = 'approved'
      AND address_city IS NOT NULL
    GROUP BY LOWER(TRIM(address_city))
  ) p ON LOWER(TRIM(c.city_name)) = p.city_name_lower
  LEFT JOIN (
    SELECT 
      selected_city,
      COUNT(*)::BIGINT as count
    FROM waitlist
    WHERE selected_city IS NOT NULL
    GROUP BY selected_city
  ) w ON c.city_name = w.selected_city
  ORDER BY COALESCE(p.count, 0) DESC, c.city_name ASC;
END;
$$;

-- Grant execute permissions to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_cities_with_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_cities_with_counts() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_cities_with_counts IS 
  'Returns all cities with real-time provider and interest counts. Combines 3 queries into 1 for better performance. Uses case-insensitive matching for provider counts. Accessible to all users.';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Created get_cities_with_counts function that:
-- 1. Returns all cities from cities table
-- 2. Joins with providers table to count approved providers per city
-- 3. Joins with waitlist table to count interest per city
-- 4. Uses case-insensitive matching for provider counts (LOWER comparison)
-- 5. Orders by provider count (descending), then city name (ascending)
-- 6. Returns BIGINT counts (handles large numbers)
-- 7. Accessible to both anonymous and authenticated users
-- =====================================================
