-- Check if service role access might be happening
-- Run this script to verify role permissions in your system

-- Check which version of Supabase is running
SELECT setting as "Postgres Version" FROM pg_settings WHERE name = 'server_version';

-- Show all roles in the system
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcanlogin 
FROM pg_roles 
ORDER BY rolname;

-- Check if the 'service_role' role exists and its permissions
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcanlogin
FROM pg_roles 
WHERE rolname = 'service_role' OR rolname = 'authenticator';

-- Check for any role with superuser privilege
SELECT rolname, rolsuper
FROM pg_roles
WHERE rolsuper = true;

-- Check RLS status for profiles table
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'profiles';

-- Check all RLS policies for the profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM 
  pg_policies
WHERE 
  tablename = 'profiles';

-- This will tell if there might be a bypass role configuration
SELECT pg_catalog.has_table_privilege('anon', 'profiles', 'UPDATE') as anon_can_update,
       pg_catalog.has_table_privilege('authenticated', 'profiles', 'UPDATE') as authenticated_can_update,
       pg_catalog.has_table_privilege('service_role', 'profiles', 'UPDATE') as service_role_can_update; 