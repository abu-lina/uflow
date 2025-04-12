-- Create function to check RLS policies for a given table
CREATE OR REPLACE FUNCTION public.check_rls_policies(table_name text)
RETURNS TABLE (
  schemaname text,
  tablename text,
  policyname text,
  permissive text,
  roles text[],
  cmd text,
  qual text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.permissive::text,
    p.roles::text[],
    p.cmd::text,
    p.qual::text
  FROM
    pg_policies p
  WHERE
    p.tablename = table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 