-- Debug script to check if relationships exist
-- Run this in Supabase SQL Editor

-- 1. Check if the provider exists
SELECT 'Provider exists' as check_type, provider_name, provider_id 
FROM public.providers 
WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

-- 2. Check if community services exist
SELECT 'Community services exist' as check_type, community_service_name, community_service_id, review_status
FROM public.community_services 
WHERE community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee');

-- 3. Check if relationships exist
SELECT 'Relationships exist' as check_type, COUNT(*) as relationship_count
FROM public.provider_community_services 
WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

-- 4. If no relationships exist, create them
INSERT INTO public.provider_community_services (provider_id, community_service_id)
SELECT 
  'f5cf7a57-74a8-4528-8aac-f4d773567adc'::UUID as provider_id,
  cs.community_service_id
FROM public.community_services cs
WHERE cs.community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee')
AND cs.review_status = 'approved'
ON CONFLICT (provider_id, community_service_id) DO NOTHING;

-- 5. Verify relationships were created
SELECT 
  'Final verification' as check_type,
  p.provider_name,
  cs.community_service_name,
  cs.donation_count,
  cs.review_status
FROM public.provider_community_services pcs
JOIN public.providers p ON pcs.provider_id = p.provider_id
JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
WHERE p.provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';
