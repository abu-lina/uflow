-- VERIFY and FIX RLS - Run this if anonymous updates are succeeding
-- This script will verify and enforce strict RLS policies for the profiles table

-- 1. VERIFICATION SECTION
-- First, show the current RLS settings
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

-- Show all current policies for the profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM
  pg_policies
WHERE
  tablename = 'profiles';

-- 2. FIX SECTION
-- Make sure RLS is enabled for the profiles table
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Prevent anonymous profile updates" ON profiles;
DROP POLICY IF EXISTS "Only authenticated users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated read access" ON profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated update access" ON profiles;
DROP POLICY IF EXISTS "Allow individual delete access" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON profiles;
DROP POLICY IF EXISTS "Allow individual insert access" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON profiles;

-- Create essential policies with extremely explicit conditions

-- 1. Allow anyone to read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 2. CRITICAL: Prevent anonymous users from updating profiles
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

-- 3. Allow authenticated users to update ONLY their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id AND 
    auth.role() = 'authenticated'
  );

-- 4. Only allow authenticated users to insert profiles
CREATE POLICY "Only authenticated users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id AND
    auth.role() = 'authenticated'
  );

-- 5. Prevent profile deletion by anyone
CREATE POLICY "Prevent profile deletion"
  ON profiles FOR DELETE
  USING (false);

-- 3. TEST SECTION
-- This will create a test function to verify RLS is working
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE (
  test_name text,
  success boolean,
  details text
) AS $$
DECLARE
  anon_update_test boolean := false;
BEGIN
  -- Instead of trying to set roles inside the function (which isn't allowed in SECURITY DEFINER functions),
  -- we'll just return instructions for manual verification
  
  test_name := 'Anonymous Update RLS Test';
  success := NULL; -- Cannot determine automatically
  details := 'To verify: Run the web test or execute this SQL as anonymous user: UPDATE profiles SET full_name = ''Test'' WHERE id = ''00000000-0000-0000-0000-000000000000''; It should fail with permission denied.';
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Run the verification test
SELECT * FROM test_rls_policies();

-- 4. GRANT PERMISSIONS
-- Grant appropriate permissions to the authenticated role
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, website, about) ON profiles TO authenticated; 

-- Verify RLS is enabled and policies are in place
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM
  pg_policies
WHERE
  tablename = 'profiles'; 