-- =====================================================
-- TEST POSTGREST REQUEST SIMULATION
-- =====================================================
-- This helps understand what PostgREST sees
-- Note: This runs as postgres role, not anon role
-- =====================================================

-- Check what JWT claims PostgREST would see
SELECT 
  'JWT Claims' as check_type,
  current_setting('request.jwt.claim.role', true) as jwt_role_claim,
  current_setting('request.jwt.claim.sub', true) as jwt_sub_claim,
  current_setting('request.jwt.claim.aud', true) as jwt_aud_claim,
  CASE 
    WHEN current_setting('request.jwt.claim.role', true) IS NULL 
    THEN 'No JWT role claim - PostgREST sees this as NULL'
    ELSE 'JWT role claim: ' || current_setting('request.jwt.claim.role', true)
  END as jwt_status;

-- Test what auth.role() and auth.uid() return in this context
SELECT 
  'Auth Functions' as check_type,
  auth.role() as auth_role_result,
  auth.uid() as auth_uid_result,
  CASE 
    WHEN auth.role() IS NULL THEN 'NULL (no JWT or anon key not sent as JWT)'
    WHEN auth.role() = 'anon' THEN 'anon (anon key sent as JWT)'
    WHEN auth.role() = 'authenticated' THEN 'authenticated (user JWT)'
    ELSE 'Other: ' || auth.role()
  END as role_explanation;
