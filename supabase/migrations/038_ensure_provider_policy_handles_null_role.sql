-- =====================================================
-- ENSURE PROVIDER INSERT POLICY HANDLES NULL ROLE
-- =====================================================
-- This migration ensures the provider INSERT policy handles
-- cases where auth.role() returns NULL (no JWT present),
-- matching the fix we applied to community_services.
-- This ensures consistency across both entity types.
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow provider inserts" ON public.providers;

-- Create updated policy that handles NULL role cases
-- This matches the pattern from migration 037 (community_services)
CREATE POLICY "Allow provider inserts" ON public.providers
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
    -- Admins can insert any provider (only check if user is authenticated)
    ((select auth.role()) = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    ))
    OR
    -- Authenticated users can insert with:
    -- - user_created_id = their own ID (owner mode)
    -- - user_created_id IS NULL AND provider_owner_id IS NULL (recommendation mode)
    ((select auth.role()) = 'authenticated' AND (
      user_created_id = (select auth.uid())
      OR
      (user_created_id IS NULL AND provider_owner_id IS NULL)
    ))
    OR
    -- Anonymous users can insert with user_created_id IS NULL AND provider_owner_id IS NULL
    -- Handle both explicit 'anon' role and when auth.role() is NULL (no JWT present)
    -- Also check if auth.uid() IS NULL as an additional indicator of anonymous access
    (((select auth.role()) = 'anon' OR (select auth.role()) IS NULL OR (select auth.uid()) IS NULL) 
     AND user_created_id IS NULL AND provider_owner_id IS NULL)
  );

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'providers' 
    AND policyname = 'Allow provider inserts'
    AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Policy was not created successfully';
  END IF;
END $$;

-- Reload PostgREST schema cache to pick up the new policy
NOTIFY pgrst, 'reload schema';
