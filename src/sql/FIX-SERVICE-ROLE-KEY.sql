-- CRITICAL FIX FOR SERVICE ROLE KEY BYPASS
-- Run this if you confirmed you're using a service role key in your application

-- 1. First, verify that RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Make sure RLS applies to ALL roles, including service_role
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- 3. Remove any excessive GRANT permissions that might be bypassing RLS
REVOKE ALL ON profiles FROM service_role;
REVOKE ALL ON profiles FROM anon;

-- 4. Grant minimum required permissions
GRANT SELECT ON profiles TO anon;
GRANT SELECT, UPDATE(full_name, avatar_url, website, about) ON profiles TO authenticated;

-- 5. Double-check the RESTRICTIVE policies are in place
DROP POLICY IF EXISTS "Prevent anonymous profile updates" ON profiles;
DROP POLICY IF EXISTS "Block all anon updates" ON profiles;

-- 6. Recreate them as RESTRICTIVE policies that apply to ALL roles
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles 
  AS RESTRICTIVE
  FOR UPDATE
  USING (auth.role() <> 'anon')
  WITH CHECK (auth.role() <> 'anon');

CREATE POLICY "Block all anon updates"
  ON profiles 
  AS RESTRICTIVE
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Verify all policies are correctly set
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM 
  pg_policies
WHERE 
  tablename = 'profiles'; 