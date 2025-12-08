-- Add missing fields to community_services table to match providers
-- This enables unified creation flow and user tracking

-- Add offers and needs support
ALTER TABLE community_services 
ADD COLUMN IF NOT EXISTS offers_ids uuid[] NULL DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS needs_ids uuid[] NULL DEFAULT '{}'::uuid[];

-- Add address visibility control
ALTER TABLE community_services 
ADD COLUMN IF NOT EXISTS show_address boolean NULL DEFAULT true;

-- Add user creation tracking
ALTER TABLE community_services 
ADD COLUMN IF NOT EXISTS user_created_id uuid NULL;

-- Add foreign key constraint for user_created_id (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_services_user_created_id_fkey'
  ) THEN
    ALTER TABLE community_services 
    ADD CONSTRAINT community_services_user_created_id_fkey 
    FOREIGN KEY (user_created_id) REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for new fields (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_community_services_offers_ids 
ON community_services USING gin (offers_ids);

CREATE INDEX IF NOT EXISTS idx_community_services_needs_ids 
ON community_services USING gin (needs_ids);

CREATE INDEX IF NOT EXISTS idx_community_services_user_created_id 
ON community_services USING btree (user_created_id);

