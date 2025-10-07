-- Verify that the provider-social project relationships are working
-- Run this in Supabase SQL Editor to check the setup

-- 1. Check if the table exists and has data
SELECT 'provider_community_services table exists' as status, COUNT(*) as relationship_count 
FROM public.provider_community_services;

-- 2. Check what community services exist
SELECT 
  'Available community services' as status,
  community_service_id,
  community_service_name,
  donation_count,
  review_status
FROM public.community_services 
WHERE community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee');

-- 3. Check if relationships were created for your provider
SELECT 
  'Relationships for your provider' as status,
  p.provider_name,
  cs.community_service_name,
  cs.donation_count,
  c.name_de as category
FROM public.provider_community_services pcs
JOIN public.providers p ON pcs.provider_id = p.provider_id
JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
LEFT JOIN public.categories c ON cs.category_id = c.category_id
WHERE p.provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

-- 4. Test the helper function
SELECT 'Helper function test' as status, * 
FROM get_community_services_for_provider('f5cf7a57-74a8-4528-8aac-f4d773567adc');
