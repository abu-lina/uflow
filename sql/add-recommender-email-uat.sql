-- Run this in UAT Supabase SQL Editor if providers/community_services
-- are missing recommender_email (PGRST204). Same as migration 052.

-- Add recommender_email column to providers table
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS recommender_email TEXT;

-- Add recommender_email column to community_services table
ALTER TABLE public.community_services
ADD COLUMN IF NOT EXISTS recommender_email TEXT;

-- Indexes (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_providers_recommender_email
  ON public.providers(recommender_email)
  WHERE recommender_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_services_recommender_email
  ON public.community_services(recommender_email)
  WHERE recommender_email IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.providers.recommender_email IS
  'Email address of the person who recommended this provider (for anonymous recommendations). Stored with user consent for GDPR compliance.';

COMMENT ON COLUMN public.community_services.recommender_email IS
  'Email address of the person who recommended this service (for anonymous recommendations). Stored with user consent for GDPR compliance.';
