-- =====================================================
-- VERIFY THE INSERT POLICY WAS APPLIED CORRECTLY
-- =====================================================
-- Run this after applying migration 037 to verify
-- the policy exists and has the correct expression
-- =====================================================

-- Check if the policy exists and get its WITH CHECK expression
SELECT 
  pol.polname as policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_name,
  pol.polpermissive as is_permissive,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
  AND cls.relname = 'community_services'
  AND pol.polcmd = 'a'  -- 'a' = INSERT
ORDER BY pol.polname;

-- Also check via pg_policies view (simpler)
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT'
ORDER BY policyname;
