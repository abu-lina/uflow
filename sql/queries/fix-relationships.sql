-- Fix relationships between provider and community services
-- Run this in Supabase SQL Editor

-- 1. First, let's see what we have
SELECT 'Current state check' as step, 'providers' as table_name, COUNT(*) as count FROM public.providers WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc'
UNION ALL
SELECT 'Current state check' as step, 'community_services' as table_name, COUNT(*) as count FROM public.community_services WHERE community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee')
UNION ALL
SELECT 'Current state check' as step, 'provider_community_services' as table_name, COUNT(*) as count FROM public.provider_community_services WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

-- 2. Create the relationships if they don't exist
INSERT INTO public.provider_community_services (provider_id, community_service_id)
SELECT 
  'f5cf7a57-74a8-4528-8aac-f4d773567adc'::UUID as provider_id,
  cs.community_service_id
FROM public.community_services cs
WHERE cs.community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee')
AND cs.review_status = 'approved'
ON CONFLICT (provider_id, community_service_id) DO NOTHING;

-- 3. Verify the relationships were created
SELECT 
  'Verification' as step,
  p.provider_name,
  cs.community_service_name,
  cs.donation_count,
  cs.review_status,
  c.name_de as category
FROM public.provider_community_services pcs
JOIN public.providers p ON pcs.provider_id = p.provider_id
JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
LEFT JOIN public.categories c ON cs.category_id = c.category_id
WHERE p.provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';
