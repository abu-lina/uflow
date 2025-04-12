-- CRITICAL SECURITY FIX - Run immediately
-- Prevent anonymous users from updating profiles by adding a restrictive policy

-- First, enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies with the same name to avoid conflicts
DROP POLICY IF EXISTS "Prevent anonymous profile updates" ON profiles;
DROP POLICY IF EXISTS "Block all anon updates" ON profiles;

-- Create a restrictive policy that explicitly blocks anonymous updates
-- This policy uses a RESTRICTIVE qualifier which takes precedence over PERMISSIVE policies
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles 
  FOR UPDATE
  USING (auth.role() <> 'anon')
  WITH CHECK (auth.role() <> 'anon');

-- Make the policy extra strict with an additional barrier
CREATE POLICY "Block all anon updates"
  ON profiles 
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify current policies
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'profiles'
  AND cmd = 'UPDATE'; 