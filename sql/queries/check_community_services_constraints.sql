-- =====================================================
-- CHECK CONSTRAINTS AND TRIGGERS ON community_services
-- =====================================================
-- This checks for any constraints or triggers that might
-- be blocking anonymous inserts
-- =====================================================

-- 1. Check for NOT NULL constraints on user_created_id
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.community_services'::regclass
  AND conname LIKE '%user_created_id%'
ORDER BY conname;

-- 2. Check all constraints on the table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'TRIGGER'
    WHEN 'x' THEN 'EXCLUSION'
  END as constraint_type_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.community_services'::regclass
ORDER BY contype, conname;

-- 3. Check for triggers that might interfere
SELECT 
  tgname as trigger_name,
  tgtype::text as trigger_type,
  tgenabled as is_enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.community_services'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- 4. Check column definitions, especially user_created_id
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'community_services'
  AND column_name IN ('user_created_id', 'provider_id', 'community_service_id')
ORDER BY ordinal_position;
