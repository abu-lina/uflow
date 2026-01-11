-- =====================================================
-- ALL DIAGNOSTIC RESULTS IN ONE QUERY
-- =====================================================
-- This returns all diagnostic info as a single result set
-- =====================================================

SELECT 
  'RLS Status' as diagnostic_check,
  tablename as value1,
  CASE 
    WHEN rowsecurity THEN 'ENABLED ✅'
    ELSE 'DISABLED ❌ - THIS IS THE PROBLEM!'
  END as value2,
  NULL::text as value3,
  NULL::text as value4
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'

UNION ALL

SELECT 
  'Current INSERT Policy' as diagnostic_check,
  policyname as value1,
  permissive as value2,
  array_to_string(roles, ', ') as value3,
  LEFT(with_check, 200) as value4  -- First 200 chars of policy
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT'

UNION ALL

SELECT 
  'Triggers' as diagnostic_check,
  tgname as value1,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Other: ' || tgenabled::text
  END as value2,
  LEFT(pg_get_triggerdef(oid), 150) as value3,
  NULL::text as value4
FROM pg_trigger
WHERE tgrelid = 'public.community_services'::regclass
  AND NOT tgisinternal

UNION ALL

SELECT 
  'CHECK Constraints' as diagnostic_check,
  conname as value1,
  LEFT(pg_get_constraintdef(oid), 200) as value2,
  NULL::text as value3,
  NULL::text as value4
FROM pg_constraint
WHERE conrelid = 'public.community_services'::regclass
  AND contype = 'c'

UNION ALL

SELECT 
  'Auth Functions' as diagnostic_check,
  COALESCE(auth.role()::text, 'NULL') as value1,
  COALESCE(auth.uid()::text, 'NULL') as value2,
  CASE 
    WHEN auth.role() IS NULL THEN 'No JWT in SQL context (expected)'
    ELSE 'Has role: ' || auth.role()
  END as value3,
  NULL::text as value4

ORDER BY diagnostic_check, value1;
