-- =====================================================
-- CONSOLIDATE PROVIDER UPDATE POLICIES
-- =====================================================
-- Issue: Multiple permissive policies for UPDATE action
-- - "Admins can manage all providers" (FOR ALL includes UPDATE)
-- - "Users can update their own providers" (FOR UPDATE)
-- 
-- Solution: Consolidate into single UPDATE policy and split
-- admin policy into separate policies for SELECT, INSERT, DELETE
-- =====================================================

-- Step 1: Drop the existing policies that need to be replaced
DROP POLICY IF EXISTS "Admins can manage all providers" ON public.providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;

-- Step 2: Create separate admin policies for SELECT, INSERT, DELETE
-- (This avoids the multiple permissive policy issue for UPDATE)

-- Admins can view all providers
CREATE POLICY "Admins can view all providers" ON public.providers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Admins can insert providers
CREATE POLICY "Admins can insert providers" ON public.providers
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Admins can delete providers
CREATE POLICY "Admins can delete providers" ON public.providers
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Step 3: Create consolidated UPDATE policy
-- This single policy handles both admin and owner updates
CREATE POLICY "Users can update their own providers or admins can update any" ON public.providers
  FOR UPDATE
  TO public
  USING (
    -- Owner check (uses indexed column)
    provider_owner_id = auth.uid()
    OR
    -- Admin check (uses indexed columns)
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Step 4: Verify the policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================
-- The consolidated UPDATE policy uses:
-- 1. Indexed column check: provider_owner_id = auth.uid() 
--    (uses idx_providers_owner_id)
-- 2. Indexed subquery: users.user_id and users.role
--    (uses idx_users_user_id and idx_users_role)
--
-- For optimal performance, consider creating a composite index:
-- CREATE INDEX IF NOT EXISTS idx_users_user_id_role 
--   ON public.users(user_id, role) 
--   WHERE role IN ('admin', 'moderator');
-- =====================================================
