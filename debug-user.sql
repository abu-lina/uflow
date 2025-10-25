-- Debug script for qaasimqayum@gmail.com
-- Run this in Supabase SQL Editor

-- 1. Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'qaasimqayum@gmail.com';

-- 2. Check if any tokens exist for this email
SELECT 
  id,
  user_id,
  email,
  LEFT(token, 20) || '...' as token_preview,
  type,
  expires_at,
  expires_at > NOW() as is_valid,
  used,
  created_at
FROM public.email_confirmation_tokens 
WHERE email = 'qaasimqayum@gmail.com'
ORDER BY created_at DESC;

-- 3. Check recent signup activity (last 24 hours)
SELECT 
  id,
  user_id,
  email,
  LEFT(token, 20) || '...' as token_preview,
  type,
  expires_at,
  expires_at > NOW() as is_valid,
  used,
  created_at,
  (NOW() - created_at) as age
FROM public.email_confirmation_tokens 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Count total tokens in table
SELECT COUNT(*) as total_tokens FROM public.email_confirmation_tokens;
