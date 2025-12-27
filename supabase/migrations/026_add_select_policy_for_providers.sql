-- =====================================================
-- ADD SELECT POLICY FOR PROVIDERS (Required for .select() after insert)
-- =====================================================
-- Issue: INSERT works but .select() after insert fails
-- When you do .insert([data]).select('provider_id'), Supabase needs SELECT permission
-- to return the inserted row.
-- 
-- Solution: Add a SELECT policy that allows reading providers
-- =====================================================

-- Check existing SELECT policies
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Drop any existing restrictive SELECT policies
DROP POLICY IF EXISTS "Anyone can view approved providers" ON public.providers;
DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Allow public read of providers" ON public.providers;

-- Create a permissive SELECT policy that allows reading all providers
-- This is needed for .select() to work after .insert()
CREATE POLICY "Allow public read of providers" ON public.providers
  FOR SELECT 
  TO PUBLIC
  USING (true);

-- Verify the SELECT policy was created
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Added SELECT policy that allows reading providers
-- This is required when using .insert([data]).select('provider_id')
-- because Supabase needs to read the row back after inserting it
-- =====================================================

