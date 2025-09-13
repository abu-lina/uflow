-- Function to permanently delete a user account and all associated data
-- This performs a hard deletion from the database

CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user's providers (providers table uses provider_owner_id)
  DELETE FROM public.providers WHERE provider_owner_id = delete_user_account.user_id;
  
  -- Delete user's bookmarks
  DELETE FROM public.bookmarks WHERE bookmarks.user_id = delete_user_account.user_id;
  
  -- Delete user's profile data from users table
  DELETE FROM public.users WHERE users.user_id = delete_user_account.user_id;
  
  -- Finally, delete the user from auth.users
  -- Note: This requires admin privileges or the user to be the owner
  DELETE FROM auth.users WHERE auth.users.id = delete_user_account.user_id;
  
  -- Log the deletion (optional)
  INSERT INTO public.deletion_logs (user_id, deleted_at, reason)
  VALUES (delete_user_account.user_id, NOW(), 'User requested account deletion');
  
END;
$$;

-- Grant execute permission to authenticated users for their own accounts
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Create a table to log deletions (optional)
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on deletion_logs
ALTER TABLE deletion_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for deletion_logs (only admins can read)
CREATE POLICY "Only admins can read deletion logs" ON deletion_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
