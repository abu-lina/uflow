-- Migration script to move "Annur Moschee" from providers to community_services table
-- Provider ID: c5ebcc19-4f60-4e47-a791-57e307f515e7

BEGIN;

-- Step 1: Insert the provider data into community_services table
INSERT INTO community_services (
    community_service_id,
    community_service_name,
    community_service_description,
    community_service_images,
    category_id,
    contact_email,
    contact_phone,
    social_website,
    social_instagram,
    address_street,
    address_zip,
    address_city,
    address_country,
    location_latitude,
    location_longitude,
    barakah_effects,
    review_status,
    review_feedback,
    provider_id,
    created_at,
    updated_at
)
SELECT 
    provider_id as community_service_id,  -- Use provider_id as community_service_id
    provider_name as community_service_name,
    NULL as community_service_description,  -- No description in original data
    CASE 
        WHEN provider_images IS NOT NULL THEN 
            ARRAY(
                SELECT jsonb_array_elements_text(
                    provider_images::jsonb->'urls'
                )
            )
        ELSE NULL 
    END as community_service_images,  -- Convert provider_images JSONB to text array
    category_id,
    contact_email,
    contact_phone,
    social_website,
    social_instagram,
    address_street,
    address_zip,
    address_city,
    address_country,
    location_latitude,
    location_longitude,
    barakah_effects,
    'approved' as review_status,  -- Set as approved since it was a provider
    NULL as review_feedback,
    provider_id as provider_id,  -- Keep reference to original provider
    created_at,
    updated_at
FROM providers 
WHERE provider_id = 'c5ebcc19-4f60-4e47-a791-57e307f515e7';

-- Step 2: Create relationship in provider_community_services table (if it exists)
-- This links the community service back to the original provider
INSERT INTO provider_community_services (
    provider_id,
    community_service_id
)
VALUES (
    'c5ebcc19-4f60-4e47-a791-57e307f515e7',
    'c5ebcc19-4f60-4e47-a791-57e307f515e7'
);

-- Step 3: Delete from providers table
DELETE FROM providers 
WHERE provider_id = 'c5ebcc19-4f60-4e47-a791-57e307f515e7';

COMMIT;

-- Verification queries (run these after the migration to confirm success)
-- SELECT * FROM community_services WHERE community_service_id = 'c5ebcc19-4f60-4e47-a791-57e307f515e7';
-- SELECT * FROM provider_community_services WHERE provider_id = 'c5ebcc19-4f60-4e47-a791-57e307f515e7';
-- SELECT * FROM providers WHERE provider_id = 'c5ebcc19-4f60-4e47-a791-57e307f515e7'; -- Should return no rows
