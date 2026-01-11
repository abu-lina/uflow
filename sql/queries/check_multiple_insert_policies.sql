-- =====================================================
-- CHECK FOR MULTIPLE INSERT POLICIES
-- =====================================================
-- Multiple INSERT policies can cause conflicts
-- PostgREST uses OR logic, but we want to ensure
-- there's only one policy per table
-- =====================================================

-- Summary: Count INSERT policies per table
SELECT 
  tablename,
  COUNT(*) as insert_policy_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO INSERT POLICY'
    WHEN COUNT(*) = 1 THEN '✅ Single policy (correct)'
    ELSE '⚠️ Multiple policies - might cause conflicts'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND cmd = 'INSERT'
GROUP BY tablename
ORDER BY 
  CASE 
    WHEN COUNT(*) = 0 THEN 1
    WHEN COUNT(*) > 1 THEN 2
    ELSE 3
  END,
  tablename;

-- Detailed: List all INSERT policies for tables with multiple policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND cmd = 'INSERT'
  AND tablename IN (
    -- Find tables with multiple INSERT policies
    SELECT tablename
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND cmd = 'INSERT'
    GROUP BY tablename
    HAVING COUNT(*) > 1
  )
ORDER BY tablename, policyname;

-- Detailed: List all INSERT policies for all tables (full audit)
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;
