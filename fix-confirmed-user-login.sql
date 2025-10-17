-- Fix user who confirmed email but can't log in
-- This manually sets email_confirmed_at for users who went through confirmation
-- Run this in Supabase SQL Editor

-- 1. Check current status of the user
SELECT 
  id,
  email,
  email_confirmed_at,
  user_metadata->>'email_confirmed' as metadata_confirmed,
  created_at
FROM auth.users 
WHERE email = 'localhost.monsoon893@passfwd.com';

-- 2. If email_confirmed_at is NULL but user has confirmed, fix it:
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'localhost.monsoon893@passfwd.com'
  AND email_confirmed_at IS NULL;

-- 3. Verify the fix
SELECT 
  id,
  email,
  email_confirmed_at,
  user_metadata->>'email_confirmed' as metadata_confirmed,
  created_at,
  updated_at
FROM auth.users 
WHERE email = 'localhost.monsoon893@passfwd.com';

-- After running this, the user should be able to log in!

