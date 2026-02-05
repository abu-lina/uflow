-- Add missing fields to community_services table to match providers
-- This enables unified creation flow

-- Add offers and needs support
ALTER TABLE community_services 
ADD COLUMN offers_ids uuid[] NULL DEFAULT '{}'::uuid[],
ADD COLUMN needs_ids uuid[] NULL DEFAULT '{}'::uuid[];

-- Add address visibility control
ALTER TABLE community_services 
ADD COLUMN show_address boolean NULL DEFAULT true;

-- Add user creation tracking
ALTER TABLE community_services 
ADD COLUMN user_created_id uuid NULL;

-- Add foreign key constraint for user_created_id
ALTER TABLE community_services 
ADD CONSTRAINT community_services_user_created_id_fkey 
FOREIGN KEY (user_created_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_community_services_offers_ids 
ON community_services USING gin (offers_ids);

CREATE INDEX IF NOT EXISTS idx_community_services_needs_ids 
ON community_services USING gin (needs_ids);

CREATE INDEX IF NOT EXISTS idx_community_services_user_created_id 
ON community_services USING btree (user_created_id);
