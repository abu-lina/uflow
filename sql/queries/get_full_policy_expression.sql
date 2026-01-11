-- =====================================================
-- GET FULL POLICY EXPRESSION
-- =====================================================
-- Get the complete WITH CHECK expression for the INSERT policy
-- =====================================================

-- Get full policy expression from pg_policy system catalog
SELECT 
  pol.polname as policy_name,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as full_with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
  AND cls.relname = 'community_services'
  AND pol.polcmd = 'a';  -- 'a' = INSERT

-- Also check for CHECK constraints
SELECT 
  'CHECK Constraints' as check_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as full_constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.community_services'::regclass
  AND contype = 'c'
ORDER BY conname;
