-- =====================================================
-- VERIFY PROVIDER CREATION FIX
-- =====================================================
-- Run this script to verify all necessary components are in place
-- for provider creation to work properly
-- =====================================================

-- 1. Check if user_created_id column exists
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'providers'
  AND column_name IN ('user_created_id', 'provider_owner_id')
ORDER BY column_name;

-- Expected Result:
-- provider_owner_id | uuid | YES | NULL
-- user_created_id   | uuid | YES | NULL

-- =====================================================
-- 2. Check RLS is enabled on providers table
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'providers'
AND schemaname = 'public';

-- Expected Result:
-- rls_enabled = true

-- =====================================================
-- 3. Check INSERT policy for providers
-- =====================================================
SELECT 
  policyname,
  cmd,
  permissive,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
AND cmd = 'INSERT'
AND schemaname = 'public';

-- Expected Result (AFTER FIX):
-- policyname: "Authenticated users can create providers"
-- cmd: INSERT
-- with_check: (auth.uid() = user_created_id)

-- If you see:
-- with_check: (auth.uid() = provider_owner_id)
-- Then you need to run: fix-provider-insert-rls.sql

-- =====================================================
-- 4. Check all RLS policies on providers
-- =====================================================
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual as "using_condition",
  with_check as "with_check_condition"
FROM pg_policies 
WHERE tablename = 'providers'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Expected policies:
-- - "Anyone can view all providers" (SELECT)
-- - "Users can view their own providers" (SELECT)
-- - "Authenticated users can create providers" (INSERT) <- CHECK THIS ONE
-- - "Users can update their own providers" (UPDATE)
-- - "Users can delete their own providers" (DELETE)
-- - "Admins can manage all providers" (ALL)

-- =====================================================
-- 5. Test query: Check if you can see providers table structure
-- =====================================================
\d providers;

-- This should show all columns including:
-- - user_created_id
-- - provider_owner_id
-- - offers_ids
-- - needs_ids

-- =====================================================
-- 6. Check offers and needs tables exist
-- =====================================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('offers', 'needs')
ORDER BY table_name;

-- Expected Result:
-- needs  | BASE TABLE
-- offers | BASE TABLE

-- =====================================================
-- 7. Check RLS policies on offers and needs
-- =====================================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('offers', 'needs')
AND schemaname = 'public'
ORDER BY tablename, cmd;

-- Expected: Policies allowing authenticated users to insert

-- =====================================================
-- 8. Summary Check
-- =====================================================
SELECT 
  'user_created_id column exists' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'providers' 
      AND column_name = 'user_created_id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Run add-user-created-id.sql'
  END as status
UNION ALL
SELECT 
  'RLS enabled on providers',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables
      WHERE tablename = 'providers' 
      AND rowsecurity = true
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Enable RLS'
  END
UNION ALL
SELECT 
  'INSERT policy uses user_created_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'providers'
      AND cmd = 'INSERT'
      AND with_check::text LIKE '%user_created_id%'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Run fix-provider-insert-rls.sql'
  END
UNION ALL
SELECT 
  'offers table exists',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'offers'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Run migration'
  END
UNION ALL
SELECT 
  'needs table exists',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'needs'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL - Run migration'
  END;

-- =====================================================
-- EXPECTED OUTPUT AFTER ALL FIXES APPLIED:
-- =====================================================
-- check_item                           | status
-- -------------------------------------|----------
-- user_created_id column exists        | ✅ PASS
-- RLS enabled on providers             | ✅ PASS
-- INSERT policy uses user_created_id   | ✅ PASS
-- offers table exists                  | ✅ PASS
-- needs table exists                   | ✅ PASS

-- If any checks show ❌ FAIL, run the corresponding SQL file mentioned

