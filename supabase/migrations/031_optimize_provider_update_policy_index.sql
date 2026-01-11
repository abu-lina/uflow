-- =====================================================
-- OPTIMIZE PROVIDER UPDATE POLICY INDEX
-- =====================================================
-- Optional performance optimization: Create composite index
-- for the admin check in the consolidated UPDATE policy
-- =====================================================

-- Create composite index for faster admin role checks
-- This index covers the exact query pattern used in the UPDATE policy
CREATE INDEX IF NOT EXISTS idx_users_user_id_role 
  ON public.users(user_id, role) 
  WHERE role IN ('admin', 'moderator');

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_users_user_id_role IS 
  'Optimizes admin/moderator role checks in RLS policies, particularly for provider UPDATE operations';

-- Verify index was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'users' 
  AND schemaname = 'public'
  AND indexname = 'idx_users_user_id_role';
