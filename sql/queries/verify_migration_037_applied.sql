-- =====================================================
-- VERIFY MIGRATION 037 WAS APPLIED
-- =====================================================
-- This is the CRITICAL check - has the migration been applied?
-- =====================================================

-- Check if the policy has NULL handling (from migration 037)
SELECT 
  CASE 
    WHEN with_check LIKE '%auth.role() IS NULL%' 
         OR with_check LIKE '%auth.uid() IS NULL%' 
    THEN '✅ Migration 037 APPLIED - Policy handles NULL'
    ELSE '❌ Migration 037 NOT APPLIED - Policy does NOT handle NULL'
  END as migration_status,
  policyname,
  with_check as current_policy_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- Show the exact policy expression for manual inspection
SELECT 
  'Policy Expression' as info,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as full_policy_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
  AND cls.relname = 'community_services'
  AND pol.polcmd = 'a';  -- 'a' = INSERT
