-- =====================================================
-- FIX COMMUNITY SERVICES POLICY - USE DIRECT auth.role()
-- =====================================================
-- The issue might be that (select auth.role()) evaluates
-- differently than auth.role() directly in PostgREST context.
-- This migration uses auth.role() directly like migration 020.
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Test simple anon policy" ON public.community_services;
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;

-- Create policy using auth.role() DIRECTLY (no select wrapper)
-- This matches the pattern from migration 020 which works
CREATE POLICY "Anyone or admins can create community services" ON public.community_services
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
    -- Admins can insert any community service
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    ))
    OR
    -- Authenticated users can insert with:
    -- - user_created_id = their own ID (owner mode)
    -- - user_created_id IS NULL (recommendation mode)
    (auth.role() = 'authenticated' AND (
      user_created_id = auth.uid()
      OR
      user_created_id IS NULL
    ))
    OR
    -- Anonymous users can insert with user_created_id IS NULL
    -- Use auth.role() directly (no select wrapper) like migration 020
    ((auth.role() = 'anon' OR auth.role() IS NULL OR auth.uid() IS NULL) 
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

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
