-- Check if the token exists in the database
-- Replace the email with the one you used for signup

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
WHERE email = 'localhost.monsoon893@passfwd.com'
ORDER BY created_at DESC 
LIMIT 5;

-- Also check the full token if you need to compare
-- SELECT token FROM public.email_confirmation_tokens WHERE email = 'localhost.monsoon893@passfwd.com';

