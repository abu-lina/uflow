-- Fix user naveed@yaneel.com role and duplicates
-- User ID: e0f70c7c-7532-458c-b591-f23212c777ea

BEGIN;

-- 1. First, check current state
SELECT 
  'BEFORE FIX:' as status,
  id,
  user_id,
  email,
  role,
  created_at
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com';

-- 2. Delete any duplicate rows (keep the oldest one)
-- This removes all but the first row created
DELETE FROM public.users
WHERE (user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
       OR email = 'naveed@yaneel.com')
  AND id NOT IN (
    SELECT id 
    FROM public.users 
    WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
       OR email = 'naveed@yaneel.com'
    ORDER BY created_at ASC
    LIMIT 1
  );

-- 3. Ensure the user exists (if somehow all were deleted)
INSERT INTO public.users (user_id, email, role)
VALUES ('e0f70c7c-7532-458c-b591-f23212c777ea', 'naveed@yaneel.com', 'admin')
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin',
    updated_at = NOW();

-- 4. Also update by email (in case user_id constraint issue)
UPDATE public.users
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'naveed@yaneel.com';

-- 5. Check final state
SELECT 
  'AFTER FIX:' as status,
  id,
  user_id,
  email,
  role,
  created_at,
  updated_at
FROM public.users 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea' 
   OR email = 'naveed@yaneel.com';

-- Uncomment the next line to commit the changes
-- COMMIT;

-- Or uncomment this to rollback and test first
ROLLBACK;

