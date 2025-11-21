-- This is the EXACT query that getUserRole() runs
-- Let's see what it returns

SELECT role
FROM public.users
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea';

-- Also check if there are rows with EITHER user_id OR email (but not both matching)
SELECT 
  id,
  user_id,
  email,
  role,
  'Row with user_id match' as match_type
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea'

UNION ALL

SELECT 
  id,
  user_id,
  email,
  role,
  'Row with email match' as match_type
FROM public.users 
WHERE email = 'naveed@yaneel.com';

-- Check ALL rows in users table to see if there's something unexpected
SELECT 
  id,
  user_id,
  email,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 20;

-- Check for NULL user_id or email
SELECT 
  COUNT(*) as count_with_nulls,
  'Rows with NULL user_id or email' as description
FROM public.users
WHERE user_id IS NULL OR email IS NULL;

