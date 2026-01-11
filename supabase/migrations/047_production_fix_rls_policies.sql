-- =====================================================
-- PRODUCTION FIX: RLS POLICIES FOR ANONYMOUS SUBMISSIONS
-- =====================================================
-- This migration:
-- 1. Fixes the SELECT policy that was blocking return=representation
-- 2. Restores proper INSERT policies for anonymous users
-- 3. Uses (select auth.xxx()) for performance optimization
-- 4. Drops debug functions created during debugging
-- =====================================================

-- =====================================================
-- 1. DROP DEBUG FUNCTIONS (created during debugging)
-- =====================================================
DROP FUNCTION IF EXISTS public.debug_auth_context();
DROP FUNCTION IF EXISTS public.test_policy_condition();
DROP FUNCTION IF EXISTS public.test_anon_policy_condition();

-- =====================================================
-- 2. FIX COMMUNITY_SERVICES POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Ultra permissive test" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Test simple anon policy" ON public.community_services;
DROP POLICY IF EXISTS "Users or admins can view community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can view community services" ON public.community_services;

-- CREATE SELECT POLICY (allows viewing approved services + own services + admin view all)
-- Uses (select auth.xxx()) for performance per Supabase recommendations
CREATE POLICY "Anyone can view community services" ON public.community_services
  FOR SELECT
  USING (
    -- Anyone can view approved services (public)
    review_status = 'approved'
    OR
    -- Owners can view their own services (any status)
    ((select auth.uid()) IS NOT NULL AND user_created_id = (select auth.uid()))
    OR
    -- Provider owners can view their services
    ((select auth.uid()) IS NOT NULL AND provider_id IN (
      SELECT provider_id FROM providers WHERE provider_owner_id = (select auth.uid())
    ))
    OR
    -- Admins/moderators can view all
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

-- CREATE INSERT POLICY (allows authenticated users and anonymous recommendations)
-- Uses (select auth.xxx()) for performance per Supabase recommendations
CREATE POLICY "Anyone can create community services" ON public.community_services
  FOR INSERT WITH CHECK (
    -- Authenticated users: must set user_created_id to their own ID OR NULL (recommendation mode)
    ((select auth.role()) = 'authenticated' AND (user_created_id = (select auth.uid()) OR user_created_id IS NULL))
    OR
    -- Anonymous users (anon role): must have user_created_id as NULL
    ((select auth.role()) = 'anon' AND user_created_id IS NULL)
  );

-- =====================================================
-- 3. VERIFY POLICIES CREATED
-- =====================================================
DO $$
BEGIN
  -- Check SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'community_services' 
    AND policyname = 'Anyone can view community services'
    AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'SELECT policy was not created';
  END IF;
  
  -- Check INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'community_services' 
    AND policyname = 'Anyone can create community services'
    AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'INSERT policy was not created';
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- SUMMARY OF CHANGES:
-- =====================================================
-- 1. SELECT policy: Now allows anyone to view 'approved' services
--    This fixes the return=representation issue for anonymous inserts
-- 2. INSERT policy: Allows authenticated users (own ID or NULL) and 
--    anonymous users (NULL only)
-- 3. Dropped debug functions that were triggering security warnings
-- 4. Used (select auth.xxx()) wrapper for performance optimization
-- =====================================================
