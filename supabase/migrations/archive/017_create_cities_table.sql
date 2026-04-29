-- =====================================================
-- CITIES TABLE - FUTURE UNLOCK FEATURE
-- =====================================================
-- This migration creates the cities table to track
-- provider counts and unlock status per city
-- =====================================================

-- Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL,
  provider_count INTEGER DEFAULT 0,
  trust_level INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cities_name 
  ON public.cities(city_name);
CREATE INDEX IF NOT EXISTS idx_cities_country 
  ON public.cities(country);
CREATE INDEX IF NOT EXISTS idx_cities_unlocked 
  ON public.cities(is_unlocked) WHERE is_unlocked = true;
CREATE INDEX IF NOT EXISTS idx_cities_provider_count 
  ON public.cities(provider_count DESC);

-- Add comments
COMMENT ON TABLE public.cities IS 
  'Tracks cities and their unlock status for the Early Access feature';
COMMENT ON COLUMN public.cities.city_name IS 
  'Name of the city (unique)';
COMMENT ON COLUMN public.cities.country IS 
  'Country where the city is located';
COMMENT ON COLUMN public.cities.provider_count IS 
  'Number of active providers in this city';
COMMENT ON COLUMN public.cities.trust_level IS 
  'Calculated trust level (0-100) based on reviews and verification';
COMMENT ON COLUMN public.cities.is_unlocked IS 
  'Whether the city has met unlock criteria (min providers, trust level)';
COMMENT ON COLUMN public.cities.unlocked_at IS 
  'Timestamp when the city was unlocked';

-- Enable Row Level Security
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public to read cities (for city selection modal)
CREATE POLICY "Anyone can view cities"
  ON public.cities FOR SELECT
  USING (true);

-- Only service role can update cities (automated unlock process)
-- No INSERT/UPDATE/DELETE policies for anon/authenticated

-- Grant necessary permissions
GRANT SELECT ON public.cities TO anon;
GRANT SELECT ON public.cities TO authenticated;

-- Insert common German cities as starter data
INSERT INTO public.cities (city_name, country, provider_count, trust_level, is_unlocked)
VALUES
  ('Berlin', 'Germany', 0, 0, false),
  ('Hamburg', 'Germany', 0, 0, false),
  ('München', 'Germany', 0, 0, false),
  ('Köln', 'Germany', 0, 0, false),
  ('Frankfurt', 'Germany', 0, 0, false),
  ('Stuttgart', 'Germany', 0, 0, false),
  ('Düsseldorf', 'Germany', 0, 0, false),
  ('Dortmund', 'Germany', 0, 0, false),
  ('Essen', 'Germany', 0, 0, false),
  ('Leipzig', 'Germany', 0, 0, false),
  ('Bremen', 'Germany', 0, 0, false),
  ('Dresden', 'Germany', 0, 0, false),
  ('Hannover', 'Germany', 0, 0, false),
  ('Nürnberg', 'Germany', 0, 0, false),
  ('Duisburg', 'Germany', 0, 0, false),
  ('Bochum', 'Germany', 0, 0, false),
  ('Wuppertal', 'Germany', 0, 0, false),
  ('Bonn', 'Germany', 0, 0, false),
  ('Bielefeld', 'Germany', 0, 0, false),
  ('Mannheim', 'Germany', 0, 0, false)
ON CONFLICT (city_name) DO NOTHING;
