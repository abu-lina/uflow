-- Add 'magic_link' type to email_confirmation_tokens table
-- This allows the table to store magic link tokens for passwordless authentication

-- Drop existing constraint if it exists
ALTER TABLE public.email_confirmation_tokens 
DROP CONSTRAINT IF EXISTS email_confirmation_tokens_type_check;

-- Add new constraint with 'magic_link' type included
ALTER TABLE public.email_confirmation_tokens 
ADD CONSTRAINT email_confirmation_tokens_type_check 
CHECK (type IN ('signup', 'password_reset', 'magic_link'));

-- Add comment to document the change
COMMENT ON COLUMN public.email_confirmation_tokens.type IS 
'Token type: signup (email confirmation), password_reset (password reset), or magic_link (passwordless login)';
