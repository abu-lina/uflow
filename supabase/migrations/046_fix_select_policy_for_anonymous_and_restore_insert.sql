-- =====================================================
-- FIX SELECT POLICY FOR ANONYMOUS USERS
-- =====================================================
-- ROOT CAUSE: The SELECT policy blocks anonymous users from
-- seeing inserted rows, causing return=representation to fail.
-- 
-- The INSERT policy was fine all along!
-- =====================================================

-- =====================================================
-- 1. FIX THE SELECT POLICY
-- =====================================================
-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users or admins can view community services" ON public.community_services;

-- Create new SELECT policy that allows:
-- 1. Anyone can view approved community services (public visibility)
-- 2. Owners can view their own services (any status)
-- 3. Admins/moderators can view all services
CREATE POLICY "Anyone can view community services" ON public.community_services
  FOR SELECT
  USING (
    -- Anyone can view approved services (public)
    review_status = 'approved'
    OR
    -- Owners can view their own services
    (auth.uid() IS NOT NULL AND user_created_id = auth.uid())
    OR
    -- Provider owners can view their services
    (auth.uid() IS NOT NULL AND provider_id IN (
      SELECT provider_id FROM providers WHERE provider_owner_id = auth.uid()
    ))
    OR
    -- Admins/moderators can view all
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- 2. RESTORE PROPER INSERT POLICY
-- =====================================================
-- Drop the test policy
DROP POLICY IF EXISTS "Ultra permissive test" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;

-- Restore the proper INSERT policy
CREATE POLICY "Anyone can create community services" ON public.community_services
  FOR INSERT WITH CHECK (
    -- Authenticated users: must set user_created_id to their own ID OR NULL (recommendation mode)
    (auth.role() = 'authenticated' AND (user_created_id = auth.uid() OR user_created_id IS NULL))
    OR
    -- Anonymous users (anon role): must have user_created_id as NULL
    (auth.role() = 'anon' AND user_created_id IS NULL)
  );

-- =====================================================
-- 3. VERIFY POLICIES
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
