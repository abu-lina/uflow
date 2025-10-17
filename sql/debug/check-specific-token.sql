-- Check if this specific token exists in the database
-- Run this in Supabase SQL Editor

-- 1. Check for the exact token
SELECT 
  id,
  user_id,
  email,
  LEFT(token, 30) || '...' as token_preview,
  expires_at,
  expires_at > NOW() as is_valid,
  used,
  created_at,
  (NOW() - created_at) as age
FROM public.email_confirmation_tokens 
WHERE token = '95497e84638cc8bb1215253d214a224ead1590a0b4eff3af9bc4cdf313b22ee2';

-- 2. Check all tokens for this email
SELECT 
  id,
  user_id,
  email,
  LEFT(token, 30) || '...' as token_preview,
  expires_at,
  expires_at > NOW() as is_valid,
  used,
  created_at,
  (NOW() - created_at) as age
FROM public.email_confirmation_tokens 
WHERE email = 'localhost.monsoon893@passfwd.com'
ORDER BY created_at DESC;

-- 3. Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  user_metadata
FROM auth.users 
WHERE email = 'localhost.monsoon893@passfwd.com';

-- 4. Count total tokens in table
SELECT COUNT(*) as total_tokens FROM public.email_confirmation_tokens;

