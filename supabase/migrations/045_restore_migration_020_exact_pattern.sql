-- =====================================================
-- RESTORE MIGRATION 020 EXACT PATTERN
-- =====================================================
-- Migration 034 changed the policy structure and broke anonymous inserts.
-- This restores the EXACT working pattern from migration 020.
-- Migration 020 uses auth.role() directly (no select wrapper).
-- =====================================================

-- Drop ALL existing INSERT policies to ensure clean state
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Admins can insert community services" ON public.community_services;
DROP POLICY IF EXISTS "Authenticated users can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create or admins can insert community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create or admins can insert community servi" ON public.community_services;
DROP POLICY IF EXISTS "Test simple anon policy" ON public.community_services;
DROP POLICY IF EXISTS "Test ultra permissive" ON public.community_services;

-- Restore EXACT pattern from migration 020 (which works)
-- Uses auth.role() DIRECTLY (no select wrapper)
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
