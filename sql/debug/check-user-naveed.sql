-- Check user naveed@yaneel.com in both auth.users and public.users
-- User ID from diagnostic: e0f70c7c-7532-458c-b591-f23212c777ea

-- 1. Check in auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com';

-- 2. Check for duplicates in public.users (this is likely the issue)
SELECT 
  id,
  user_id,
  email,
  role,
  created_at
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com'
ORDER BY created_at;

-- 3. Count how many rows exist (should be 1, but diagnostic suggests multiple)
SELECT 
  COUNT(*) as row_count,
  user_id,
  email
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com'
GROUP BY user_id, email;

