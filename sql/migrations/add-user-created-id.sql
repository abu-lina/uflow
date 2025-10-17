-- Add user_created_id column to providers table
-- This field ALWAYS tracks which user created/submitted the provider database entry

ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS user_created_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments to explain the difference between the two fields
COMMENT ON COLUMN public.providers.provider_owner_id IS 'The actual business owner (only set when user creates their own business)';
COMMENT ON COLUMN public.providers.user_created_id IS 'The user who created this database entry (always set - tracks creator)';

-- Add index for faster lookups by user_created_id
CREATE INDEX IF NOT EXISTS idx_providers_user_created_id ON public.providers(user_created_id);

