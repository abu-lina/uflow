-- =====================================================
-- COMPREHENSIVE RLS DIAGNOSTIC
-- =====================================================
-- Run this to get a complete picture of what's happening
-- =====================================================

-- 1. Check current INSERT policy on community_services
SELECT 
  'Current INSERT Policy' as check_type,
  policyname,
  cmd,
  with_check as policy_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- 2. Check if the policy handles NULL role
SELECT 
  'Policy NULL Handling Check' as check_type,
  CASE 
    WHEN with_check LIKE '%auth.role() IS NULL%' THEN '✅ Handles NULL role'
    WHEN with_check LIKE '%auth.uid() IS NULL%' THEN '✅ Handles NULL uid'
    ELSE '❌ Does NOT handle NULL - needs migration 037'
  END as null_handling_status,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- 3. Test what auth.role() and auth.uid() return in current context
SELECT 
  'Auth Function Test' as check_type,
  auth.role() as current_role,
  auth.uid() as current_uid,
  CASE 
    WHEN auth.role() IS NULL THEN 'NULL (no JWT)'
    WHEN auth.role() = 'anon' THEN 'anon (anon key JWT)'
    WHEN auth.role() = 'authenticated' THEN 'authenticated (user JWT)'
    ELSE 'Other: ' || auth.role()
  END as role_explanation;

-- 4. Test the policy condition manually with NULL values
SELECT 
  'Policy Condition Test' as check_type,
  (select auth.role()) = 'anon' as condition1_role_equals_anon,
  (select auth.role()) IS NULL as condition2_role_is_null,
  (select auth.uid()) IS NULL as condition3_uid_is_null,
  NULL::uuid IS NULL as condition4_user_created_id_is_null,
  -- Test the full condition from migration 037
  (((select auth.role()) = 'anon' OR (select auth.role()) IS NULL OR (select auth.uid()) IS NULL) 
   AND NULL::uuid IS NULL) as full_condition_result,
  CASE 
    WHEN (((select auth.role()) = 'anon' OR (select auth.role()) IS NULL OR (select auth.uid()) IS NULL) 
          AND NULL::uuid IS NULL) 
    THEN '✅ Policy SHOULD ALLOW'
    ELSE '❌ Policy WILL BLOCK'
  END as expected_result;

-- 5. Check for any other policies that might interfere
SELECT 
  'All Policies Check' as check_type,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
ORDER BY cmd, policyname;

-- 6. Check RLS is enabled
SELECT 
  'RLS Status' as check_type,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is DISABLED - this is the problem!'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'community_services';
