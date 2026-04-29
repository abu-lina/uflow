-- =====================================================
-- ENSURE COMMUNITY SERVICES ANONYMOUS INSERT POLICY
-- =====================================================
-- This migration ensures anonymous users can insert community services
-- with user_created_id IS NULL. This is a fix for the 401 error when
-- anonymous users try to create community services in recommendation mode.
-- =====================================================

-- Drop ALL existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Admins can insert community services" ON public.community_services;
DROP POLICY IF EXISTS "Authenticated users can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create or admins can insert community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create or admins can insert community servi" ON public.community_services;

-- Create a single, explicit INSERT policy that allows:
-- 1. Admins can insert any community service
-- 2. Authenticated users can insert with user_created_id = auth.uid() (owner mode) OR user_created_id IS NULL (recommendation mode)
-- 3. Anonymous users can insert with user_created_id IS NULL
-- Note: Using exact same pattern as migration 035 (providers) which works
CREATE POLICY "Anyone or admins can create community services" ON public.community_services
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
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
    -- Anonymous users can insert with user_created_id IS NULL
    -- Handle both explicit 'anon' role and when auth.role() is NULL (no JWT present)
    -- Also check if auth.uid() IS NULL as an additional indicator of anonymous access
    (((select auth.role()) = 'anon' OR (select auth.role()) IS NULL OR (select auth.uid()) IS NULL) 
     AND user_created_id IS NULL)
  );

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'community_services' 
    AND policyname = 'Anyone or admins can create community services'
    AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Policy was not created successfully';
  END IF;
END $$;

-- Reload PostgREST schema cache to pick up the new policy
NOTIFY pgrst, 'reload schema';
