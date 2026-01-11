-- =====================================================
-- DEFINITIVE TEST: ULTRA PERMISSIVE POLICY
-- =====================================================
-- If WITH CHECK (true) still fails, the issue is NOT 
-- the policy logic - it's something else entirely.
-- =====================================================

-- Step 1: Drop ALL INSERT policies
DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Test simple anon policy" ON public.community_services;
DROP POLICY IF EXISTS "Test ultra permissive" ON public.community_services;

-- Step 2: Create ultra-permissive policy
CREATE POLICY "Ultra permissive test" ON public.community_services
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (true);

-- Step 3: Verify it was created
SELECT 
  'Policy created' as status,
  policyname,
  permissive,
  roles::text,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- Step 4: Reload PostgREST cache
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- NOW TEST: If ./test-direct-postgrest.sh STILL fails
-- with this policy, the issue is NOT RLS logic
-- =====================================================
