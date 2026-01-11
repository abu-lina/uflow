-- =====================================================
-- SIMPLIFY POLICY TO MATCH MIGRATION 020 EXACTLY
-- =====================================================
-- Migration 020 works for community services.
-- This simplifies our policy to match that exact pattern.
-- Since auth.role() = 'anon' when anon key is sent,
-- we don't need the NULL handling complexity.
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Test simple anon policy" ON public.community_services;

-- Create policy matching migration 020 EXACTLY
-- This is the pattern that works
CREATE POLICY "Anyone can create community services" ON public.community_services
  FOR INSERT WITH CHECK (
    -- Authenticated users: must set user_created_id to their own ID
    (auth.role() = 'authenticated' AND user_created_id = auth.uid())
    OR
    -- Anonymous users (anon role): must have user_created_id as NULL
    (auth.role() = 'anon' AND user_created_id IS NULL)
  );

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'community_services' 
    AND policyname = 'Anyone can create community services'
    AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Policy was not created successfully';
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
