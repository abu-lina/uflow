-- =====================================================
-- FIX WAITLIST RLS POLICIES - RPC FUNCTIONS
-- =====================================================
-- This migration creates RPC functions to handle waitlist
-- operations that require token-based access, avoiding
-- the need to bypass RLS with admin client.
-- =====================================================

-- =====================================================
-- 1. WAITLIST UPDATE FUNCTION
-- =====================================================
-- Function for updating waitlist entry with token validation
-- Uses SECURITY DEFINER to bypass RLS while maintaining security
-- through explicit token validation in the function

CREATE OR REPLACE FUNCTION update_waitlist_entry_with_token(
  p_email TEXT,
  p_token TEXT,
  p_selected_city TEXT DEFAULT NULL,
  p_has_seen_early_access BOOLEAN DEFAULT NULL,
  p_skipped_early_access BOOLEAN DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Validate token and update
  -- Only updates if email and token match (security check)
  UPDATE waitlist
  SET 
    selected_city = CASE 
      WHEN p_selected_city IS NOT NULL THEN p_selected_city 
      ELSE selected_city 
    END,
    has_seen_early_access = CASE 
      WHEN p_has_seen_early_access IS NOT NULL THEN p_has_seen_early_access 
      ELSE has_seen_early_access 
    END,
    skipped_early_access = CASE 
      WHEN p_skipped_early_access IS NOT NULL THEN p_skipped_early_access 
      ELSE skipped_early_access 
    END
  WHERE email = LOWER(TRIM(p_email))
    AND waitlist_token = p_token;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid email or token',
      'updated', 0
    );
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'updated', v_updated_count
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_waitlist_entry_with_token(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_waitlist_entry_with_token(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_waitlist_entry_with_token IS 
  'Updates waitlist entry with token validation. Bypasses RLS using SECURITY DEFINER but validates token for security.';

-- =====================================================
-- 2. CITY INTEREST COUNTS FUNCTION
-- =====================================================
-- Function to get city interest counts (aggregated, no PII)
-- Returns only city names and counts, no personal information

CREATE OR REPLACE FUNCTION get_city_interest_counts()
RETURNS TABLE (
  city_name TEXT,
  interest_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.city_name,
    COUNT(w.id)::BIGINT as interest_count
  FROM cities c
  LEFT JOIN waitlist w ON w.selected_city = c.city_name
  GROUP BY c.city_name
  ORDER BY interest_count DESC, c.city_name ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_city_interest_counts() TO anon;
GRANT EXECUTE ON FUNCTION get_city_interest_counts() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_city_interest_counts IS 
  'Returns aggregated city interest counts. No PII exposed. Uses SECURITY DEFINER to bypass RLS for counting.';
