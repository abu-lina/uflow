-- Standardize image storage across both tables
-- Option 1: Convert community_services to use jsonb like providers

-- Step 1: Add new column to community_services
ALTER TABLE community_services 
ADD COLUMN community_service_images_jsonb jsonb NULL;

-- Step 2: Migrate existing data from text[] to jsonb
UPDATE community_services 
SET community_service_images_jsonb = 
    CASE 
        WHEN community_service_images IS NOT NULL AND array_length(community_service_images, 1) > 0 THEN
            jsonb_build_object('urls', to_jsonb(community_service_images))
        ELSE NULL
    END;

-- Step 3: Drop old column and rename new one
ALTER TABLE community_services DROP COLUMN community_service_images;
ALTER TABLE community_services RENAME COLUMN community_service_images_jsonb TO community_service_images;

-- Step 4: Update the CommunityService interface in TypeScript to match
-- Change from: community_service_images?: string[];
-- To: community_service_images?: Record<string, unknown>;
