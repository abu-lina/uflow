-- =====================================================
-- TEST SIMPLE ANON POLICY
-- =====================================================
-- This creates a very simple policy to test if the
-- issue is with policy complexity or evaluation
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;

-- Create a VERY simple policy that should definitely work
-- This allows ANY insert where user_created_id IS NULL
-- (for testing purposes only)
CREATE POLICY "Test simple anon policy" ON public.community_services
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
    -- Super simple: just check if user_created_id IS NULL
    user_created_id IS NULL
  );

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
