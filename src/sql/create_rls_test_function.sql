-- Function to test Row Level Security directly from SQL
-- This is the most direct way to verify RLS policies

-- Create helper function to format results
CREATE OR REPLACE FUNCTION format_result(test_name text, success boolean, details text)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'test_name', test_name,
    'success', success,
    'details', details
  );
END;
$$ LANGUAGE plpgsql;

-- Main test function
CREATE OR REPLACE FUNCTION test_rls_direct()
RETURNS TABLE (result jsonb) AS $$
DECLARE
  anon_result jsonb;
  auth_result jsonb;
  profile_exists boolean;
BEGIN
  -- Check if table exists and RLS is enabled
  SELECT EXISTS (
    SELECT FROM pg_class
    WHERE relname = 'profiles' AND relrowsecurity = true
  ) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RETURN QUERY SELECT format_result(
      'RLS Check', 
      false, 
      'Profiles table does not exist or RLS is not enabled'
    );
    RETURN;
  END IF;
  
  -- Test 1: Check if RLS is enabled
  RETURN QUERY SELECT format_result(
    'RLS Status', 
    true, 
    'Row Level Security is enabled for profiles table'
  );
  
  -- Test 2: Try anonymous update directly via SET ROLE
  BEGIN
    -- This should fail if RLS is working correctly
    SET LOCAL ROLE anon;
    UPDATE profiles 
    SET full_name = 'Anon Test Update'
    WHERE id = '00000000-0000-0000-0000-000000000000';
    
    -- If we get here, no error occurred (BAD)
    RETURN QUERY SELECT format_result(
      'Anonymous Update Test', 
      false, 
      'SECURITY ISSUE: Anonymous updates are allowed!'
    );
    
    EXCEPTION WHEN insufficient_privilege THEN
      -- This is what should happen - permission denied (GOOD)
      RETURN QUERY SELECT format_result(
        'Anonymous Update Test', 
        true, 
        'RLS correctly blocked anonymous update with permission denied'
      );
  END;
  RESET ROLE;
  
  -- Test 3: Try as authenticated user but updating another profile
  BEGIN
    -- Set up a test (non-existent ID)
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claims.sub" TO 'test-user-id';
    
    UPDATE profiles 
    SET full_name = 'Auth User Test'
    WHERE id = '00000000-0000-0000-0000-000000000000';
    
    -- If we get here, no error occurred (BAD)
    RETURN QUERY SELECT format_result(
      'Other User Update Test', 
      false, 
      'SECURITY ISSUE: Updates to other users profiles are allowed!'
    );
    
    EXCEPTION WHEN insufficient_privilege THEN
      -- This is what should happen - permission denied (GOOD)
      RETURN QUERY SELECT format_result(
        'Other User Update Test', 
        true, 
        'RLS correctly blocked update to another user profile'
      );
  END;
  
  RESET ROLE;
END;
$$ LANGUAGE plpgsql; 