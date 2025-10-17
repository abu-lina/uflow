-- Setup script for provider-social project relationships
-- This script creates the many-to-many relationship and adds sample data

-- =====================================================
-- 1. APPLY THE MIGRATION
-- =====================================================

-- Run the migration file
\i supabase/migrations/002_create_provider_community_services_relationship.sql

-- =====================================================
-- 2. CREATE SAMPLE RELATIONSHIPS
-- =====================================================

-- First, let's get some existing providers and community services
-- and create relationships between them

-- Create relationships for the specific provider mentioned in the URL
-- (assuming it exists in the database)
INSERT INTO public.provider_community_services (provider_id, community_service_id)
SELECT 
  'f5cf7a57-74a8-4528-8aac-f4d773567adc'::UUID as provider_id,
  cs.community_service_id
FROM public.community_services cs
WHERE cs.community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee')
ON CONFLICT (provider_id, community_service_id) DO NOTHING;

-- =====================================================
-- 3. VERIFY THE SETUP
-- =====================================================

-- Check if the relationships were created
SELECT 
  p.provider_name,
  cs.community_service_name,
  cs.donation_count,
  c.name_de as category
FROM public.provider_community_services pcs
JOIN public.providers p ON pcs.provider_id = p.provider_id
JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
LEFT JOIN public.categories c ON cs.category_id = c.category_id
WHERE p.provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

-- =====================================================
-- 4. ADDITIONAL SAMPLE DATA (Optional)
-- =====================================================

-- Create more sample relationships if needed
-- You can uncomment and modify these as needed

/*
-- Add more providers to support the same community services
INSERT INTO public.provider_community_services (provider_id, community_service_id)
SELECT 
  p.provider_id,
  cs.community_service_id
FROM public.providers p
CROSS JOIN public.community_services cs
WHERE p.review_status = 'approved'
AND cs.review_status = 'approved'
AND p.provider_id != 'f5cf7a57-74a8-4528-8aac-f4d773567adc'
LIMIT 5
ON CONFLICT (provider_id, community_service_id) DO NOTHING;
*/

-- =====================================================
-- 5. CLEANUP (Optional)
-- =====================================================

-- Remove the old provider_id column from community_services if you want
-- (This is optional and should only be done after confirming everything works)
-- ALTER TABLE public.community_services DROP COLUMN IF EXISTS provider_id;
