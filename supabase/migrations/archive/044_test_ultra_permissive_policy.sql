-- =====================================================
-- TEST ULTRA PERMISSIVE POLICY
-- =====================================================
-- This creates a policy that allows ALL inserts
-- to test if the issue is with policy evaluation
-- or something else entirely
-- =====================================================

-- Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Test simple anon policy" ON public.community_services;

-- Create ULTRA permissive policy (for testing only)
-- This should allow ANY insert
CREATE POLICY "Test ultra permissive" ON public.community_services
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (true);

-- Verify
SELECT 
  'Policy created' as status,
  policyname,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';
