-- Create sample relationships between providers and community services
-- This will link the sample social projects to your specific provider

-- First, let's check what community services were created
SELECT 
  community_service_id,
  community_service_name,
  donation_count,
  review_status
FROM public.community_services 
WHERE community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee');

-- Create relationships for the specific provider mentioned in the URL
INSERT INTO public.provider_community_services (provider_id, community_service_id)
SELECT 
  'f5cf7a57-74a8-4528-8aac-f4d773567adc'::UUID as provider_id,
  cs.community_service_id
FROM public.community_services cs
WHERE cs.community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee')
AND cs.review_status = 'approved'
ON CONFLICT (provider_id, community_service_id) DO NOTHING;

-- Verify the relationships were created
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

-- Test the helper function
SELECT * FROM get_community_services_for_provider('f5cf7a57-74a8-4528-8aac-f4d773567adc');
