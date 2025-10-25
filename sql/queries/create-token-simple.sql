-- Simple script to create token and show URL for qaasimqayum@gmail.com
-- Run this in Supabase SQL Editor

-- Generate a new token (64 character hex string)
WITH new_token AS (
  SELECT encode(gen_random_bytes(32), 'hex') as token
),
user_info AS (
  SELECT id, email 
  FROM auth.users 
  WHERE email = 'qaasimqayum@gmail.com'
)
INSERT INTO public.email_confirmation_tokens (
  user_id,
  email,
  token,
  type,
  expires_at,
  used,
  created_at,
  updated_at
)
SELECT 
  ui.id,
  ui.email,
  nt.token,
  'signup',
  NOW() + INTERVAL '24 hours',
  false,
  NOW(),
  NOW()
FROM user_info ui, new_token nt
RETURNING 
  token,
  'https://ummahflow.com/auth/confirm?token=' || token || '&email=qaasimqayum%40gmail.com' as confirmation_url;
