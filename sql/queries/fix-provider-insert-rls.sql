-- =====================================================
-- FIX PROVIDER INSERT RLS POLICY
-- =====================================================
-- Issue: Current RLS policy prevents users from recommending providers
-- because it requires provider_owner_id = auth.uid()
-- 
-- Solution: Update policy to check user_created_id instead, which is
-- always set regardless of whether it's an owner submission or recommendation
-- =====================================================

-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create providers" ON public.providers;

-- Create new INSERT policy that checks user_created_id instead
-- This allows both:
-- 1. Owner mode: user creates their own business (provider_owner_id = user.id)
-- 2. Recommendation mode: user recommends someone else's business (provider_owner_id = null)
CREATE POLICY "Authenticated users can create providers" ON public.providers
  FOR INSERT WITH CHECK (auth.uid() = user_created_id);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
AND policyname = 'Authenticated users can create providers'
AND schemaname = 'public';

