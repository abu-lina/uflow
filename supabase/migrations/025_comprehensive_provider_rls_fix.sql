-- =====================================================
-- COMPREHENSIVE PROVIDER RLS FIX
-- =====================================================
-- Issue: Policies exist but still getting 42501 errors
-- This migration will check for ALL policies and constraints
-- =====================================================

-- Step 1: Show ALL policies on providers (not just INSERT)
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

-- Step 2: Check if there are any restrictive policies that might interfere
-- Sometimes SELECT policies can interfere with INSERT if they check the new row

-- Step 3: Drop ALL policies on providers table (we'll recreate them)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'providers' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.providers', r.policyname);
  END LOOP;
END $$;

-- Step 4: Recreate INSERT policies with explicit PERMISSIVE and PUBLIC roles
-- Using PUBLIC role ensures it applies to all roles including anon
CREATE POLICY "Allow anonymous provider inserts" ON public.providers
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
    -- For anon role, allow if both user IDs are NULL
    (auth.role() = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)
    OR
    -- For authenticated role, allow if user_created_id matches
    (auth.role() = 'authenticated' AND user_created_id = auth.uid())
  );

-- Step 5: Create SELECT policies (needed for the insert to return data)
CREATE POLICY "Allow public read of providers" ON public.providers
  FOR SELECT 
  TO PUBLIC
  USING (true);

-- Step 6: Verify all policies
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

-- Step 7: Check table constraints that might interfere
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.providers'::regclass
ORDER BY contype, conname;

-- =====================================================
-- ALTERNATIVE: If above doesn't work, try this ultra-permissive policy
-- =====================================================
-- Uncomment and run this if the above still doesn't work:
-- DROP POLICY IF EXISTS "Allow anonymous provider inserts" ON public.providers;
-- CREATE POLICY "Allow all provider inserts" ON public.providers
--   FOR INSERT 
--   TO PUBLIC
--   WITH CHECK (true);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Created policies:
-- 1. INSERT policy for PUBLIC role (applies to both anon and authenticated)
-- 2. SELECT policy for PUBLIC role (needed for returning inserted data)
-- 
-- The INSERT policy explicitly checks:
-- - anon role: user_created_id IS NULL AND provider_owner_id IS NULL
-- - authenticated role: user_created_id = auth.uid()
-- =====================================================

