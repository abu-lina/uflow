-- Add missing columns to providers table
-- Run this in your Supabase SQL Editor

-- Add the missing columns to the providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS offers_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS needs_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS show_address BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS barakah_effects TEXT[] DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_providers_offers_ids ON public.providers USING gin(offers_ids);
CREATE INDEX IF NOT EXISTS idx_providers_needs_ids ON public.providers USING gin(needs_ids);
CREATE INDEX IF NOT EXISTS idx_providers_barakah_effects ON public.providers USING gin(barakah_effects);

-- Add comments to document the new columns
COMMENT ON COLUMN public.providers.offers_ids IS 'Array of offer IDs that this provider offers';
COMMENT ON COLUMN public.providers.needs_ids IS 'Array of need IDs that this provider can fulfill';
COMMENT ON COLUMN public.providers.show_address IS 'Whether to show the provider address publicly or as "Online"';
COMMENT ON COLUMN public.providers.barakah_effects IS 'Array of tags/effects that this provider creates';
