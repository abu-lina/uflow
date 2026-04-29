-- =====================================================
-- FIX PROVIDER SELECT POLICIES FOR VISITORS
-- =====================================================
-- Issue: Visitors can see all providers, including pending/unapproved ones
-- Root Cause: Migration 026/025/028 created "Allow public read of providers" 
--             with USING (true), which allows all providers to be visible
-- 
-- Solution: Replace permissive policy with proper security policies:
-- 1. Visitors (anon) can only see approved providers
-- 2. Authenticated users can see approved providers + their own providers
-- 3. Admins can see all providers (already exists from migration 030)
-- =====================================================

-- Step 1: Drop the permissive policy that allows all providers
DROP POLICY IF EXISTS "Allow public read of providers" ON public.providers;
DROP POLICY IF EXISTS "Anyone can view all providers" ON public.providers;

-- Step 2: Create proper SELECT policies for visitors
-- Policy 1: Visitors (anon role) can only view approved providers
CREATE POLICY "Anyone can view approved providers" ON public.providers
  FOR SELECT
  TO public
  USING (review_status = 'approved');

-- Policy 2: Authenticated users can view approved providers AND their own providers
-- This allows users to see their own providers even if not approved yet
CREATE POLICY "Users can view their own providers" ON public.providers
  FOR SELECT
  TO public
  USING (
    provider_owner_id = auth.uid()
    OR
    user_created_id = auth.uid()
  );

-- Note: "Admins can view all providers" policy from migration 030 already exists
-- and will allow admins to see all providers regardless of review_status

-- Step 3: Verify the policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- POLICY LOGIC EXPLANATION
-- =====================================================
-- PostgreSQL RLS combines multiple SELECT policies with OR logic.
-- For a visitor (anon role):
--   - "Anyone can view approved providers" applies → sees approved only
--   - "Users can view their own providers" doesn't apply (auth.uid() is NULL)
--   - Result: Only approved providers visible ✓
--
-- For an authenticated user:
--   - "Anyone can view approved providers" applies → sees approved
--   - "Users can view their own providers" applies → sees their own (any status)
--   - Result: Approved providers + their own providers ✓
--
-- For an admin:
--   - All above policies apply
--   - "Admins can view all providers" applies → sees everything
--   - Result: All providers visible ✓
-- =====================================================
