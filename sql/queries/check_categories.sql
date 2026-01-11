-- =====================================================
-- CHECK CATEGORIES AND THEIR POLICIES
-- =====================================================

-- 1. List all categories
SELECT category_id, category_name, category_type
FROM categories
ORDER BY category_name;

-- 2. Check RLS policies on categories
SELECT policyname, cmd, permissive, 
       CASE WHEN cmd = 'SELECT' THEN qual ELSE with_check END as policy_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'categories'
ORDER BY cmd;

-- 3. Check if categories table has RLS enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class 
WHERE relname = 'categories';

-- 4. Check foreign key constraint on community_services.category_id
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'community_services' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'category_id';
