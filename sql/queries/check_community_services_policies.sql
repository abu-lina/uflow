-- =====================================================
-- CHECK CURRENT RLS POLICIES FOR community_services
-- =====================================================
-- Run this in Supabase SQL Editor to see what policies
-- are currently active for the community_services table
-- =====================================================

-- 1. Check all policies on community_services table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'community_services';

-- 3. Get detailed policy information from pg_policies view
-- Note: pg_policies view already formats the expressions, so we can use them directly
SELECT 
  p.schemaname,
  p.tablename,
  p.policyname,
  p.cmd as command,
  p.permissive,
  p.roles,
  p.qual as using_expression,
  p.with_check as with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'public' 
  AND p.tablename = 'community_services'
ORDER BY p.cmd, p.policyname;

-- 4. Specifically check INSERT policies with their WITH CHECK expressions
SELECT 
  policyname,
  cmd,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 5. Get the raw policy definition from pg_policy system catalog
-- This shows the actual stored expressions
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_name,
  pol.polpermissive as is_permissive,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
  AND cls.relname = 'community_services'
ORDER BY pol.polcmd, pol.polname;
