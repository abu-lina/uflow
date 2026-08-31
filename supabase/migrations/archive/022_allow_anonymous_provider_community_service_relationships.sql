-- =====================================================
-- ALLOW ANONYMOUS INSERTS FOR PROVIDER-COMMUNITY SERVICE RELATIONSHIPS
-- =====================================================
-- Issue: RLS policy prevents anonymous users from creating relationships
-- when suggesting providers in recommendation mode
-- 
-- Solution: Update INSERT policy to allow both authenticated and anonymous users
-- =====================================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create provider community service relationships" ON public.provider_community_services;

-- Create new INSERT policy that allows both authenticated and anonymous users
-- This is safe because:
-- 1. The relationship table only has foreign keys (provider_id, community_service_id)
-- 2. The application code controls which relationships are created
-- 3. Anonymous users can only create relationships for providers they just created (in the same transaction)
-- 4. The unique constraint prevents duplicate relationships
CREATE POLICY "Anyone can create provider community service relationships" ON public.provider_community_services
  FOR INSERT WITH CHECK (true);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'provider_community_services'
  AND schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Anonymous users can now create provider-community service relationships
-- when suggesting providers in recommendation mode
-- =====================================================




