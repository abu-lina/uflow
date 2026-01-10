-- =====================================================
-- ADD get_provider_count_by_city RPC FUNCTION
-- =====================================================
-- Issue: 404 error when calling get_provider_count_by_city RPC function
-- The function is called from useAppStage.ts but doesn't exist in the database
-- 
-- Solution: Create the RPC function to count approved providers by city
-- Uses case-insensitive matching for city names
-- =====================================================

-- Create function to get provider count for a specific city
-- Returns count of approved providers matching the city name (case-insensitive)
CREATE OR REPLACE FUNCTION get_provider_count_by_city(city_name TEXT)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  provider_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO provider_count
  FROM providers
  WHERE review_status = 'approved'
    AND LOWER(TRIM(address_city)) = LOWER(TRIM(city_name));
  
  RETURN COALESCE(provider_count, 0);
END;
$$;

-- Grant execute permissions to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_provider_count_by_city(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_provider_count_by_city(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_provider_count_by_city IS 
  'Returns count of approved providers for a specific city. Uses case-insensitive matching. Accessible to all users.';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Created get_provider_count_by_city function that:
-- 1. Takes city_name as parameter (TEXT)
-- 2. Returns INTEGER count of approved providers
-- 3. Uses case-insensitive matching (LOWER comparison)
-- 4. Trims whitespace from both city name and address_city
-- 5. Only counts providers with review_status = 'approved'
-- 6. Accessible to both anonymous and authenticated users
-- =====================================================
