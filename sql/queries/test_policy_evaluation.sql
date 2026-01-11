-- =====================================================
-- TEST POLICY EVALUATION WITH ACTUAL VALUES
-- =====================================================
-- This tests if the policy would actually allow the insert
-- by evaluating the exact condition with the values we know
-- =====================================================

-- Test 1: What does the policy expression evaluate to?
-- We know from logs: auth.role() = NULL, auth.uid() = NULL, user_created_id = NULL
SELECT 
  'Policy Evaluation Test' as test_name,
  -- Condition 1: auth.role() = 'anon'
  (SELECT auth.role()) = 'anon' as cond1_role_equals_anon,
  -- Condition 2: auth.role() IS NULL  
  (SELECT auth.role()) IS NULL as cond2_role_is_null,
  -- Condition 3: auth.uid() IS NULL
  (SELECT auth.uid()) IS NULL as cond3_uid_is_null,
  -- Condition 4: user_created_id IS NULL (simulating the insert)
  NULL::uuid IS NULL as cond4_user_created_id_is_null,
  -- Full OR condition
  ((SELECT auth.role()) = 'anon' OR (SELECT auth.role()) IS NULL OR (SELECT auth.uid()) IS NULL) as or_condition_result,
  -- Full policy condition (OR condition AND user_created_id IS NULL)
  (((SELECT auth.role()) = 'anon' OR (SELECT auth.role()) IS NULL OR (SELECT auth.uid()) IS NULL) 
   AND NULL::uuid IS NULL) as full_policy_result,
  CASE 
    WHEN (((SELECT auth.role()) = 'anon' OR (SELECT auth.role()) IS NULL OR (SELECT auth.uid()) IS NULL) 
          AND NULL::uuid IS NULL)
    THEN '✅ Policy SHOULD ALLOW'
    ELSE '❌ Policy WILL BLOCK'
  END as verdict;

-- Test 2: Check if there's a difference between how we test vs how PostgREST evaluates
-- PostgREST might evaluate this differently when there's no JWT
SELECT 
  'PostgREST Context Test' as test_name,
  current_setting('request.jwt.claim.role', true) as jwt_role_claim,
  current_setting('request.jwt.claim.sub', true) as jwt_sub_claim,
  CASE 
    WHEN current_setting('request.jwt.claim.role', true) IS NULL THEN 'No JWT role claim (anon key not sent?)'
    ELSE 'JWT role claim: ' || current_setting('request.jwt.claim.role', true)
  END as jwt_status;

-- Test 3: Try to simulate what happens during an actual insert
-- This will fail in SQL editor (we're not anon role), but shows the logic
DO $$
DECLARE
  test_role text;
  test_uid uuid;
  test_user_created_id uuid := NULL;
  policy_result boolean;
BEGIN
  -- Simulate the values we know from logs
  test_role := NULL;  -- auth.role() returns NULL
  test_uid := NULL;   -- auth.uid() returns NULL
  
  -- Evaluate the policy condition
  policy_result := (
    (test_role = 'anon' OR test_role IS NULL OR test_uid IS NULL) 
    AND test_user_created_id IS NULL
  );
  
  RAISE NOTICE 'Policy evaluation result: %', policy_result;
  RAISE NOTICE '  - role = anon: %', (test_role = 'anon');
  RAISE NOTICE '  - role IS NULL: %', (test_role IS NULL);
  RAISE NOTICE '  - uid IS NULL: %', (test_uid IS NULL);
  RAISE NOTICE '  - user_created_id IS NULL: %', (test_user_created_id IS NULL);
  
  IF policy_result THEN
    RAISE NOTICE '✅ Policy SHOULD ALLOW the insert';
  ELSE
    RAISE NOTICE '❌ Policy WILL BLOCK the insert';
  END IF;
END $$;
