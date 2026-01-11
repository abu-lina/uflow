-- =====================================================
-- CHECK ANON ROLE PRIVILEGES AND POLICY TYPES
-- =====================================================
-- RLS policies only work if the role has base privileges first!
-- This checks if anon role can INSERT at all.
-- =====================================================

-- 1. Check table privileges for anon role
SELECT 
  'Table Privileges' as check_type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name = 'community_services'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 2. Check ALL policies (both PERMISSIVE and RESTRICTIVE)
SELECT 
  'Policy Types' as check_type,
  policyname,
  permissive,  -- 'PERMISSIVE' or 'RESTRICTIVE'
  roles::text,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'community_services'
ORDER BY cmd, policyname;

-- 3. Check if anon role exists and its attributes
SELECT 
  'Role Info' as check_type,
  rolname,
  rolcanlogin,
  rolcreatedb,
  rolcreaterole,
  rolsuper
FROM pg_roles 
WHERE rolname IN ('anon', 'authenticated', 'service_role');

-- 4. Check default privileges
SELECT 
  'Default Privileges' as check_type,
  defaclobjtype,
  defaclacl::text
FROM pg_default_acl 
WHERE defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 10;

-- 5. Directly check ACL on the table
SELECT 
  'Table ACL' as check_type,
  relname,
  relacl::text as access_privileges
FROM pg_class 
WHERE relname = 'community_services' 
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
