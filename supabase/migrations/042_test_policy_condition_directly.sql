-- =====================================================
-- TEST POLICY CONDITION DIRECTLY
-- =====================================================
-- This creates a test function that evaluates the exact
-- policy condition to see if it returns TRUE
-- =====================================================

-- Create a function that tests the policy condition
CREATE OR REPLACE FUNCTION public.test_policy_condition(
  test_user_created_id uuid
)
RETURNS TABLE (
  condition_result boolean,
  role_equals_anon boolean,
  role_is_null boolean,
  uid_is_null boolean,
  user_created_id_is_null boolean,
  final_result boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_uid uuid;
  v_role_equals_anon boolean;
  v_role_is_null boolean;
  v_uid_is_null boolean;
  v_user_created_id_is_null boolean;
  v_final_result boolean;
BEGIN
  -- Get current auth context
  v_role := auth.role();
  v_uid := auth.uid();
  
  -- Evaluate each part of the condition
  v_role_equals_anon := (v_role = 'anon');
  v_role_is_null := (v_role IS NULL);
  v_uid_is_null := (v_uid IS NULL);
  v_user_created_id_is_null := (test_user_created_id IS NULL);
  
  -- Evaluate the full anonymous condition from the policy
  -- ((auth.role() = 'anon' OR auth.role() IS NULL OR auth.uid() IS NULL) AND user_created_id IS NULL)
  v_final_result := (
    (v_role_equals_anon OR v_role_is_null OR v_uid_is_null) 
    AND v_user_created_id_is_null
  );
  
  RETURN QUERY
  SELECT 
    v_final_result,
    v_role_equals_anon,
    v_role_is_null,
    v_uid_is_null,
    v_user_created_id_is_null,
    v_final_result;
END;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.test_policy_condition(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.test_policy_condition(uuid) TO authenticated;
