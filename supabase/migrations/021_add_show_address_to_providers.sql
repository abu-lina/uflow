-- =====================================================
-- ADD SHOW_ADDRESS COLUMN TO PROVIDERS TABLE
-- =====================================================
-- Issue: Code tries to insert show_address for providers, but column doesn't exist
-- This column already exists for community_services (migration 013)
-- 
-- Solution: Add show_address column to providers table to match community_services
-- =====================================================

-- Add address visibility control to providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS show_address boolean NULL DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN public.providers.show_address IS 'Whether to show the provider address publicly or as "Online"';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Providers table now has show_address column matching community_services
-- =====================================================




