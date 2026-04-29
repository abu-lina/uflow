-- =====================================================
-- FIX COMMUNITY SERVICES INSERT POLICY FOR RECOMMENDATIONS
-- =====================================================
-- The current policy requires user_created_id = auth.uid() for authenticated users,
-- but recommendation mode sets user_created_id to NULL.
-- This migration fixes the policy to allow both owner mode and recommendation mode,
-- matching the fix we did for providers.
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;

-- Create updated policy that allows:
-- 1. Admins can insert any community service
-- 2. Authenticated users can insert with user_created_id = auth.uid() (owner mode) OR user_created_id IS NULL (recommendation mode)
-- 3. Anonymous users can insert with user_created_id IS NULL
CREATE POLICY "Anyone or admins can create community services" ON public.community_services
  FOR INSERT WITH CHECK (
    -- Admins can insert any community service (only check if user is authenticated)
    ((select auth.role()) = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    ))
    OR
    -- Authenticated users can insert with:
    -- - user_created_id = their own ID (owner mode)
    -- - user_created_id IS NULL (recommendation mode)
    ((select auth.role()) = 'authenticated' AND (
      user_created_id = (select auth.uid())
      OR
      user_created_id IS NULL
    ))
    OR
    -- Anonymous users can insert without user_created_id
    ((select auth.role()) = 'anon' AND user_created_id IS NULL)
  );
