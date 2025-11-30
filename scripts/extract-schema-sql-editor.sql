-- =====================================================
-- Extract Complete Schema from Supabase
-- =====================================================
-- Run this in Supabase Dashboard → SQL Editor
-- Copy the results and save to a file
-- =====================================================

-- 1. Get all table names
SELECT 
  '-- Table: ' || table_name as comment,
  'CREATE TABLE IF NOT EXISTS public.' || table_name || ' (' as create_start
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Get complete table definitions with columns
SELECT 
  'CREATE TABLE IF NOT EXISTS public.' || t.table_name || ' (' ||
  string_agg(
    c.column_name || ' ' ||
    CASE 
      WHEN c.data_type = 'character varying' THEN 'VARCHAR(' || c.character_maximum_length || ')'
      WHEN c.data_type = 'character' THEN 'CHAR(' || c.character_maximum_length || ')'
      WHEN c.data_type = 'numeric' THEN 'NUMERIC(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale, 0) || ')'
      WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
      WHEN c.data_type = 'ARRAY' THEN c.udt_name || '[]'
      ELSE UPPER(c.data_type)
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END,
    ', ' ORDER BY c.ordinal_position
  ) || ');' as create_table_statement
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.table_schema = 'public'
GROUP BY t.table_name
ORDER BY t.table_name;

-- 3. Get all indexes
SELECT indexdef || ';' as create_index
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Get all functions
SELECT 
  'CREATE OR REPLACE FUNCTION ' || routine_name || '(...) AS $$' || E'\n' ||
  routine_definition || E'\n' ||
  '$$ LANGUAGE ' || routine_type || ';' as create_function
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 5. Get all triggers
SELECT 
  'CREATE TRIGGER ' || trigger_name || E'\n' ||
  '  BEFORE/AFTER ' || action_timing || ' ' || event_manipulation || E'\n' ||
  '  ON ' || event_object_table || E'\n' ||
  '  FOR EACH ' || action_orientation || E'\n' ||
  '  EXECUTE FUNCTION ' || action_statement || ';' as create_trigger
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. Get all RLS policies
SELECT 
  'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename || E'\n' ||
  '  FOR ' || cmd || E'\n' ||
  '  USING (' || qual || ')' ||
  CASE WHEN with_check IS NOT NULL THEN E'\n' || '  WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';' as create_policy
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Get all enums
SELECT 
  'CREATE TYPE ' || t.typname || ' AS ENUM (' ||
  string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) ||
  ');' as create_enum
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;


