-- =====================================================
-- COMPREHENSIVE RLS DIAGNOSTIC
-- =====================================================
-- This checks EVERYTHING that could block inserts
-- =====================================================

-- 1. Check if RLS is enabled (CRITICAL)
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS is ENABLED'
    ELSE '❌ RLS is DISABLED - This is the problem!'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'community_services';

-- 2. Check current INSERT policy
SELECT 
  'Current Policy' as check_type,
  policyname,
  permissive,
  roles,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- 3. Check for triggers that might block
SELECT 
  'Triggers' as check_type,
  tgname as trigger_name,
  tgenabled as is_enabled,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Other'
  END as trigger_status,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.community_services'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- 4. Check for CHECK constraints
SELECT 
  'CHECK Constraints' as check_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.community_services'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 5. Test what auth.role() returns when anon key is used
-- Note: This runs as postgres role, so won't show anon role
-- But helps verify the function works
SELECT 
  'Auth Functions Test' as check_type,
  auth.role() as auth_role,
  auth.uid() as auth_uid,
  CASE 
    WHEN auth.role() IS NULL THEN 'NULL (no JWT in SQL context)'
    ELSE 'Value: ' || auth.role()
  END as role_explanation;

-- 6. Check if there are any other policies that might interfere
SELECT 
  'All Policies' as check_type,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
GROUP BY cmd
ORDER BY cmd;
