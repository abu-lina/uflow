-- Quick fix for naveed@yaneel.com admin access
-- This will set the role to admin for your user

UPDATE public.users 
SET role = 'admin', updated_at = NOW() 
WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea';

-- Verify the change
SELECT user_id, email, role FROM public.users WHERE user_id = 'e0f70c7c-7532-458c-b591-f23212c777ea';

