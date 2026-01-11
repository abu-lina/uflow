-- =====================================================
-- TEST ANONYMOUS INSERT DIRECTLY
-- =====================================================
-- This tests if the policy works when we simulate
-- an anonymous request directly in SQL
-- =====================================================

-- First, check what auth.role() and auth.uid() return
SELECT 
  'Current auth state' as test,
  auth.role() as current_role,
  auth.uid() as current_uid,
  CASE 
    WHEN auth.role() = 'anon' THEN 'Role is anon'
    WHEN auth.role() IS NULL THEN 'Role is NULL'
    ELSE 'Role is: ' || auth.role()
  END as role_status;

-- Test the policy condition manually
SELECT 
  'Policy condition test' as test,
  (select auth.role()) = 'anon' as role_equals_anon,
  (select auth.role()) IS NULL as role_is_null,
  (select auth.uid()) IS NULL as uid_is_null,
  NULL::uuid IS NULL as user_created_id_is_null,
  CASE 
    WHEN ((select auth.role()) = 'anon' OR (select auth.role()) IS NULL OR (select auth.uid()) IS NULL) 
         AND NULL::uuid IS NULL 
    THEN 'POLICY SHOULD ALLOW'
    ELSE 'POLICY SHOULD BLOCK'
  END as expected_result;

-- Try to actually insert (this will test the real policy)
-- Note: This will only work if we're actually running as anon role
-- In Supabase SQL Editor, you're running as postgres role, so this will fail
-- But it helps verify the policy syntax is correct
DO $$
BEGIN
  -- This block will execute but we can't actually test the insert
  -- without being in the anon role context
  RAISE NOTICE 'To test anonymous insert, you need to use PostgREST API with anon key';
  RAISE NOTICE 'The policy expression is: ((select auth.role()) = ''anon'' OR (select auth.role()) IS NULL OR (select auth.uid()) IS NULL) AND user_created_id IS NULL';
END $$;
