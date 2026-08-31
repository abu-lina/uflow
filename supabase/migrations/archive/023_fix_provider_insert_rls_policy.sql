-- =====================================================
-- FIX PROVIDER INSERT RLS POLICY FOR ANONYMOUS USERS
-- =====================================================
-- Issue: RLS policy violation when anonymous users try to create providers
-- in recommendation mode. The policy might not be applied or there's a conflict.
-- 
-- Solution: Ensure the correct policy exists and drop any conflicting policies
-- =====================================================

-- First, let's see what policies currently exist (for debugging)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'INSERT';

-- Drop ALL existing INSERT policies on providers to avoid conflicts
-- Using CASCADE to ensure all dependencies are dropped
DROP POLICY IF EXISTS "Authenticated users can create providers" ON public.providers CASCADE;
DROP POLICY IF EXISTS "Anyone can create providers" ON public.providers CASCADE;
DROP POLICY IF EXISTS "Users can create providers" ON public.providers CASCADE;
DROP POLICY IF EXISTS "Users can insert providers" ON public.providers CASCADE;
DROP POLICY IF EXISTS "Public can insert providers" ON public.providers CASCADE;

-- Create a single, clear INSERT policy that allows both authenticated and anonymous users
-- This policy is permissive and allows:
-- 1. Authenticated users: user_created_id = auth.uid() (owner or recommendation mode)
-- 2. Anonymous users: user_created_id IS NULL AND provider_owner_id IS NULL (recommendation mode only)
CREATE POLICY "Anyone can create providers" ON public.providers
  FOR INSERT WITH CHECK (
    -- Authenticated users: must set user_created_id to their own ID
    (auth.role() = 'authenticated' AND user_created_id = auth.uid())
    OR
    -- Anonymous users (anon role): must have both user_created_id and provider_owner_id as NULL
    -- Explicitly checking for NULL using IS NULL (most reliable for UUID types)
    (auth.role() = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)
  );

-- Verify the policy was created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- VERIFY RLS IS ENABLED
-- =====================================================
-- Check if RLS is enabled on the providers table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'providers'
  AND schemaname = 'public';

-- If RLS is not enabled, enable it:
-- ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TEST THE POLICY (Optional - run as anon role)
-- =====================================================
-- You can test the policy by running this as the anon role:
-- SET ROLE anon;
-- INSERT INTO public.providers (provider_name, user_created_id, provider_owner_id) 
-- VALUES ('Test Provider', NULL, NULL);
-- RESET ROLE;
-- DELETE FROM public.providers WHERE provider_name = 'Test Provider';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- The providers table now has a single, clear INSERT policy that allows:
-- ✅ Authenticated users to create providers (with user_created_id = auth.uid())
-- ✅ Anonymous users to create providers in recommendation mode (both IDs NULL)
-- 
-- IMPORTANT: Make sure RLS is enabled on the providers table!
-- If the above query shows rls_enabled = false, run:
-- ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
-- =====================================================

