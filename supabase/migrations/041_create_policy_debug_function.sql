-- =====================================================
-- CREATE POLICY DEBUG FUNCTION
-- =====================================================
-- This function helps debug what auth.role() returns
-- during actual PostgREST requests
-- =====================================================

-- Create a function that returns auth context info
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TABLE (
  auth_role text,
  auth_uid uuid,
  role_is_anon boolean,
  role_is_null boolean,
  uid_is_null boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.role()::text,
    auth.uid(),
    (auth.role() = 'anon')::boolean,
    (auth.role() IS NULL)::boolean,
    (auth.uid() IS NULL)::boolean;
END;
$$;

-- Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.debug_auth_context() TO anon;
GRANT EXECUTE ON FUNCTION public.debug_auth_context() TO authenticated;
