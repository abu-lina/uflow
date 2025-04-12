-- Apply this immediately to fix the RLS issue 
-- This script will strengthen RLS policies on the profiles table

-- First, make sure RLS is enabled on the profiles table
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists 
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create a more restrictive update policy that requires both conditions:
-- 1. The user must be authenticated (not anonymous)
-- 2. The user can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id AND auth.role() <> 'anon');

-- Add a separate policy to explicitly block anonymous updates
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles FOR UPDATE
  USING (auth.role() <> 'anon');

-- Prevent profile deletion by any user
CREATE POLICY "Prevent profile deletion"
  ON profiles FOR DELETE
  USING (false);

-- Ensure only authenticated users can insert profiles 
-- (though the trigger should handle most insertions)
CREATE POLICY "Only authenticated users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.role() <> 'anon');

-- Verify the policies exist
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