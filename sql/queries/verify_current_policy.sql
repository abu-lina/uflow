-- =====================================================
-- VERIFY CURRENT POLICY STATE
-- =====================================================
-- Check what policy is currently active
-- =====================================================

-- Check current INSERT policy
SELECT 
  policyname,
  with_check,
  LEFT(with_check, 300) as policy_preview
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
  AND cmd = 'INSERT';

-- Get full policy expression
SELECT 
  pg_get_expr(pol.polwithcheck, pol.polrelid) as full_policy_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
  AND cls.relname = 'community_services'
  AND pol.polcmd = 'a';
