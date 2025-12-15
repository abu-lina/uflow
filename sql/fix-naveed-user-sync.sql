-- Fix data inconsistency for naveed@yaneel.com
-- This script syncs public.users with auth.users and sets role to admin

-- First, check the current state
SELECT 
  'BEFORE FIX' as status,
  u.id,
  u.user_id as public_user_id,
  u.email,
  u.role,
  a.id as auth_user_id,
  CASE 
    WHEN u.user_id = a.id THEN '✅ SYNCED'
    ELSE '❌ MISMATCH'
  END as sync_status
FROM public.users u
LEFT JOIN auth.users a ON u.email = a.email
WHERE u.email = 'naveed@yaneel.com';

-- Fix: Update public.users to match auth.users and set role to admin
-- This handles the case where user_id in public.users doesn't match auth.users
UPDATE public.users
SET 
  user_id = (SELECT id FROM auth.users WHERE email = 'naveed@yaneel.com' LIMIT 1),
  role = 'admin',
  updated_at = NOW()
WHERE email = 'naveed@yaneel.com'
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'naveed@yaneel.com');

-- Remove any duplicate entries (keep only the one that matches auth.users)
DELETE FROM public.users
WHERE email = 'naveed@yaneel.com'
  AND user_id != (SELECT id FROM auth.users WHERE email = 'naveed@yaneel.com' LIMIT 1);

-- If no entry exists in public.users, create one
INSERT INTO public.users (user_id, email, role, created_at, updated_at)
SELECT 
  id,
  email,
  'admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'naveed@yaneel.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'naveed@yaneel.com'
  );

-- Verify the fix
SELECT 
  'AFTER FIX' as status,
  u.id,
  u.user_id as public_user_id,
  u.email,
  u.role,
  a.id as auth_user_id,
  a.email_confirmed_at,
  CASE 
    WHEN u.user_id = a.id THEN '✅ SYNCED'
    ELSE '❌ MISMATCH'
  END as sync_status
FROM public.users u
LEFT JOIN auth.users a ON u.user_id = a.id
WHERE u.email = 'naveed@yaneel.com';

