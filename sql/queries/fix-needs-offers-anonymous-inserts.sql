-- =====================================================
-- FIX NEEDS AND OFFERS ANONYMOUS INSERTS
-- =====================================================
-- Issue: RLS policies prevent anonymous users from creating needs/offers
-- in recommendation mode (early access / suggest provider flow)
-- 
-- Solution: Update INSERT policies to allow both authenticated and anonymous users
-- Application code ensures created_by is null for anonymous users
-- =====================================================

-- Drop the old restrictive INSERT policies
DROP POLICY IF EXISTS "Authenticated users can insert needs" ON public.needs;
DROP POLICY IF EXISTS "Authenticated users can insert offers" ON public.offers;

-- Drop the new policies if they already exist (idempotent)
DROP POLICY IF EXISTS "Anyone can insert needs" ON public.needs;
DROP POLICY IF EXISTS "Anyone can insert offers" ON public.offers;

-- Create new INSERT policies that allow both authenticated and anonymous users
-- For authenticated users: created_by = auth.uid() (enforced by app code)
-- For anonymous users: created_by = null (enforced by app code)
CREATE POLICY "Anyone can insert needs" ON public.needs 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert offers" ON public.offers 
  FOR INSERT WITH CHECK (true);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename IN ('needs', 'offers')
AND cmd = 'INSERT'
AND schemaname = 'public'
ORDER BY tablename, policyname;

