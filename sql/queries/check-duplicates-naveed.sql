-- Check for duplicate entries for naveed@yaneel.com
SELECT 
  id,
  user_id,
  email,
  role,
  created_at,
  updated_at
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com'
ORDER BY created_at ASC;

-- Count duplicates
SELECT 
  COUNT(*) as total_rows,
  'Expected: 1, If more than 1 = duplicates found' as note
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com';

