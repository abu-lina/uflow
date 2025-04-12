-- First check existing users
SELECT * FROM users LIMIT 10;

-- Use this command to update a specific user's role (replace the email)
-- For example: UPDATE users SET role = 'service_owner' WHERE email = 'your@email.com';

-- If you know the user_id (from auth.users), you can use this instead:
-- UPDATE users SET role = 'service_owner' WHERE user_id = 'user-id-here';

-- If the user doesn't exist in the users table yet, but does exist in auth.users, 
-- you can create a new entry:
/*
INSERT INTO users (user_id, email, role) 
VALUES (
  'user-id-from-auth-users', 
  'your@email.com', 
  'service_owner'
);
*/

-- To list all available roles:
-- SELECT enum_range(NULL::user_role);

-- To make all existing users service owners (be careful with this!):
-- UPDATE users SET role = 'service_owner';
