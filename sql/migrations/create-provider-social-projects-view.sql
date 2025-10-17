-- Create a database view for efficient querying
-- This is the most performant approach

CREATE OR REPLACE VIEW provider_social_projects AS
SELECT 
  p.provider_id,
  p.provider_name,
  cs.community_service_id,
  cs.community_service_name,
  cs.community_service_description,
  cs.community_service_images,
  cs.donation_count,
  cs.barakah_effects,
  c.name_de as category_name_de,
  c.name_en as category_name_en,
  pcs.created_at as relationship_created_at
FROM public.providers p
JOIN public.provider_community_services pcs ON p.provider_id = pcs.provider_id
JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
LEFT JOIN public.categories c ON cs.category_id = c.category_id
WHERE cs.review_status = 'approved'
AND p.review_status = 'approved';

-- Grant access to the view
GRANT SELECT ON provider_social_projects TO authenticated;
GRANT SELECT ON provider_social_projects TO anon;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_provider_social_projects_provider_id 
ON public.provider_community_services(provider_id);

-- Example usage:
-- SELECT * FROM provider_social_projects WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';
