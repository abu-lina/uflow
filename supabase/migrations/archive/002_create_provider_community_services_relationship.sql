-- Migration: Create many-to-many relationship between providers and community services
-- This allows providers to support multiple social projects and social projects to be supported by multiple providers

-- =====================================================
-- 1. CREATE JUNCTION TABLE
-- =====================================================

-- Junction table for many-to-many relationship between providers and community services
CREATE TABLE public.provider_community_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  community_service_id UUID NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure unique combinations
  UNIQUE(provider_id, community_service_id)
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for querying by provider
CREATE INDEX idx_provider_community_services_provider_id ON public.provider_community_services(provider_id);

-- Index for querying by community service
CREATE INDEX idx_provider_community_services_community_service_id ON public.provider_community_services(community_service_id);

-- Composite index for efficient lookups
CREATE INDEX idx_provider_community_services_composite ON public.provider_community_services(provider_id, community_service_id);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.provider_community_services ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read provider-community service relationships
CREATE POLICY "Provider community services are viewable by everyone" ON public.provider_community_services
  FOR SELECT USING (true);

-- Policy: Authenticated users can create relationships
CREATE POLICY "Authenticated users can create provider community service relationships" ON public.provider_community_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can only update/delete their own provider's relationships
CREATE POLICY "Users can manage their own provider's community service relationships" ON public.provider_community_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.providers 
      WHERE providers.provider_id = provider_community_services.provider_id 
      AND providers.provider_owner_id = auth.uid()
    )
  );

-- =====================================================
-- 4. MIGRATE EXISTING DATA (if any)
-- =====================================================

-- If there are existing community services with provider_id, migrate them to the new relationship table
INSERT INTO public.provider_community_services (provider_id, community_service_id)
SELECT provider_id, community_service_id 
FROM public.community_services 
WHERE provider_id IS NOT NULL
ON CONFLICT (provider_id, community_service_id) DO NOTHING;

-- =====================================================
-- 5. ADD HELPFUL FUNCTIONS
-- =====================================================

-- Function to get community services for a provider
CREATE OR REPLACE FUNCTION get_community_services_for_provider(provider_uuid UUID)
RETURNS TABLE (
  community_service_id UUID,
  community_service_name TEXT,
  community_service_description TEXT,
  community_service_images TEXT[],
  donation_count INTEGER,
  category_name_de TEXT,
  barakah_effects TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.community_service_id,
    cs.community_service_name,
    cs.community_service_description,
    cs.community_service_images,
    cs.donation_count,
    c.name_de as category_name_de,
    cs.barakah_effects
  FROM public.provider_community_services pcs
  JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
  LEFT JOIN public.categories c ON cs.category_id = c.category_id
  WHERE pcs.provider_id = provider_uuid
  AND cs.review_status = 'approved'
  ORDER BY cs.community_service_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get providers supporting a community service
CREATE OR REPLACE FUNCTION get_providers_for_community_service(service_uuid UUID)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  address_city TEXT,
  category_name_de TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.address_city,
    c.name_de as category_name_de
  FROM public.provider_community_services pcs
  JOIN public.providers p ON pcs.provider_id = p.provider_id
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE pcs.community_service_id = service_uuid
  AND p.review_status = 'approved'
  ORDER BY p.provider_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert some sample community services if they don't exist
INSERT INTO public.community_services (
  community_service_name,
  community_service_description,
  community_service_images,
  donation_count,
  category_id,
  barakah_effects,
  review_status
) VALUES 
(
  'Wüstenkind e.V.',
  'Unterstützung für Kinder in der Wüste',
  ARRAY['/images/placeholder.jpg'],
  10,
  (SELECT category_id FROM public.categories WHERE name_de = 'Spenden' LIMIT 1),
  ARRAY['Zakat', 'Iman'],
  'approved'
),
(
  'Umma Moschee',
  'Gemeindezentrum und Moschee',
  ARRAY['/images/placeholder.jpg'],
  10,
  (SELECT category_id FROM public.categories WHERE name_de = 'Moschee' LIMIT 1),
  ARRAY['Sunnah', 'Iman'],
  'approved'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.provider_community_services IS 'Many-to-many relationship between providers and community services (social projects)';
COMMENT ON COLUMN public.provider_community_services.provider_id IS 'Reference to the provider supporting the community service';
COMMENT ON COLUMN public.provider_community_services.community_service_id IS 'Reference to the community service being supported';
COMMENT ON FUNCTION get_community_services_for_provider IS 'Returns all community services supported by a specific provider';
COMMENT ON FUNCTION get_providers_for_community_service IS 'Returns all providers supporting a specific community service';
