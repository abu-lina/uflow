-- Step 1: Delete ALL duplicate rows for naveed@yaneel.com
-- This removes all entries first to ensure clean state
DELETE FROM public.users
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com';

-- Step 2: Insert a single clean row with admin role
INSERT INTO public.users (user_id, email, role, created_at, updated_at)
VALUES (
  'e0f70c7c-7532-458c-b591-f23212c777ea',
  'naveed@yaneel.com',
  'admin',
  NOW(),
  NOW()
);

-- Step 3: Verify the fix
SELECT 
  id,
  user_id,
  email,
  role,
  created_at,
  'SUCCESS: Should see exactly 1 row with role=admin' as status
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea';

