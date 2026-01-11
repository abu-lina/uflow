-- =====================================================
-- TEST COMMUNITY SERVICES INSERT POLICY
-- =====================================================
-- This query tests if the policy would allow an anonymous insert
-- Run this as the anon role to simulate what happens during the actual request
-- =====================================================

-- First, check what auth.role() returns for anonymous users
SELECT 
  auth.role() as current_role,
  auth.uid() as current_uid;

-- Test the policy condition manually
-- This simulates what the policy checks
SELECT 
  'Policy test' as test_name,
  auth.role() = 'anon' as role_is_anon,
  NULL::uuid IS NULL as user_created_id_is_null,
  (auth.role() = 'anon' AND NULL::uuid IS NULL) as anonymous_condition_passes,
  CASE 
    WHEN auth.role() = 'anon' AND NULL::uuid IS NULL THEN 'ALLOWED'
    ELSE 'BLOCKED'
  END as result;

-- Try to actually insert (this will test the real policy)
-- Note: This will fail if the policy blocks it, or succeed if it allows it
BEGIN;
SET LOCAL role TO 'anon';
SET LOCAL request.jwt.claim.role TO 'anon';

-- Try inserting with user_created_id = NULL (what the app sends)
INSERT INTO public.community_services (
  community_service_name,
  user_created_id,
  provider_id,
  review_status
) VALUES (
  'Test Service - DELETE ME',
  NULL,
  NULL,
  'approved'
) RETURNING community_service_id, community_service_name, user_created_id;

-- If we get here, the insert succeeded - clean up
DELETE FROM public.community_services WHERE community_service_name = 'Test Service - DELETE ME';

ROLLBACK;
