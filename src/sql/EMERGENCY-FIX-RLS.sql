-- EMERGENCY FIX for RLS policies
-- Run this script immediately to fix the security issue with anonymous access

-- First, make sure RLS is enabled for the profiles table
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies for the profiles table to ensure clean state
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Prevent anonymous profile updates" ON profiles;
DROP POLICY IF EXISTS "Only authenticated users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON profiles;

-- Create policy to allow everyone to read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Create policy to allow only authenticated users to update their own profile
-- This explicitly checks both conditions:
-- 1. User must be authenticated (not anonymous)
-- 2. User can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id AND 
    auth.role() != 'anon'
  );

-- Add an explicit policy to prevent anonymous updates (double security)
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles FOR UPDATE
  USING (auth.role() != 'anon');

-- Add policy to ensure only authenticated users can insert profiles
CREATE POLICY "Only authenticated users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.role() != 'anon'
  );

-- Add policy to prevent profile deletion by anyone
CREATE POLICY "Prevent profile deletion"
  ON profiles FOR DELETE
  USING (false);

-- Verify the policies exist and are applied
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

-- Grant basic privileges to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, website, about) ON profiles TO authenticated; 