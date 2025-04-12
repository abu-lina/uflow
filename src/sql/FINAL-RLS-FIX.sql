-- FINAL SECURITY FIX - Run immediately
-- Make anonymous blocking policies RESTRICTIVE to ensure they take precedence

-- Drop existing PERMISSIVE policies
DROP POLICY IF EXISTS "Prevent anonymous profile updates" ON profiles;
DROP POLICY IF EXISTS "Block all anon updates" ON profiles;

-- Recreate them as RESTRICTIVE policies
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles 
  AS RESTRICTIVE
  FOR UPDATE
  USING (auth.role() <> 'anon')
  WITH CHECK (auth.role() <> 'anon');

CREATE POLICY "Block all anon updates"
  ON profiles 
  AS RESTRICTIVE
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify policies again to make sure they're now RESTRICTIVE
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'profiles'
  AND cmd = 'UPDATE'; 