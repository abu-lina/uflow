-- =====================================================
-- DIAGNOSE AND FIX PROVIDER INSERT RLS POLICY
-- =====================================================
-- Issue: Still getting 401/42501 errors even after migration 023
-- This migration will diagnose the issue and apply a more permissive fix
-- =====================================================

-- Step 1: Show ALL policies on providers table (for debugging)
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Step 2: Drop ALL existing INSERT policies (be very thorough)
DROP POLICY IF EXISTS "Authenticated users can create providers" ON public.providers;
DROP POLICY IF EXISTS "Anyone can create providers" ON public.providers;
DROP POLICY IF EXISTS "Users can create providers" ON public.providers;
DROP POLICY IF EXISTS "Users can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Public can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Allow anonymous provider creation" ON public.providers;
DROP POLICY IF EXISTS "Allow provider creation" ON public.providers;

-- Step 3: Create a VERY permissive policy for anonymous users first (for testing)
-- This will help us verify the policy system is working
CREATE POLICY "Allow anonymous provider inserts" ON public.providers
  FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Step 4: Create policy for authenticated users
CREATE POLICY "Allow authenticated provider inserts" ON public.providers
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Allow if user_created_id matches their auth.uid()
    user_created_id = auth.uid()
  );

-- Step 5: Verify the policies were created
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- TEST QUERY (Run this manually to test)
-- =====================================================
-- Test as anon role:
-- SET ROLE anon;
-- INSERT INTO public.providers (provider_name, user_created_id, provider_owner_id, review_status) 
-- VALUES ('Test Anonymous Provider', NULL, NULL, 'pending')
-- RETURNING provider_id, provider_name;
-- RESET ROLE;
-- DELETE FROM public.providers WHERE provider_name = 'Test Anonymous Provider';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Created two separate policies:
-- 1. "Allow anonymous provider inserts" - Allows anon role to insert anything (WITH CHECK (true))
-- 2. "Allow authenticated provider inserts" - Allows authenticated users if user_created_id = auth.uid()
-- 
-- The anonymous policy is very permissive for now. Once confirmed working,
-- you can tighten it to require user_created_id IS NULL AND provider_owner_id IS NULL
-- =====================================================

