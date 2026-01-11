-- =====================================================
-- CHECK PROVIDERS TABLE POLICIES
-- =====================================================

-- Check ALL policies on providers table
SELECT policyname, cmd, permissive, 
       CASE WHEN cmd = 'SELECT' THEN qual ELSE with_check END as policy_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'providers'
ORDER BY cmd;
