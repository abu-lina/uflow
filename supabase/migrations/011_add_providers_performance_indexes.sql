-- =====================================================
-- PROVIDERS PERFORMANCE INDEXES
-- =====================================================
-- This migration adds indexes to improve query performance
-- for the providers search and filtering functionality
-- =====================================================

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_providers_category_id 
  ON public.providers(category_id)
  WHERE category_id IS NOT NULL;

-- Index for location filtering
CREATE INDEX IF NOT EXISTS idx_providers_address_city 
  ON public.providers(address_city)
  WHERE address_city IS NOT NULL;

-- Composite index for category + date sorting
CREATE INDEX IF NOT EXISTS idx_providers_category_created 
  ON public.providers(category_id, created_at DESC)
  WHERE category_id IS NOT NULL;

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_providers_created_at 
  ON public.providers(created_at DESC);

-- Add comments
COMMENT ON INDEX idx_providers_category_id IS 
  'Index for filtering providers by category. Partial index excludes NULL values.';
COMMENT ON INDEX idx_providers_address_city IS 
  'Index for filtering providers by city. Partial index excludes NULL values.';
COMMENT ON INDEX idx_providers_category_created IS 
  'Composite index for category filtering with date sorting.';
COMMENT ON INDEX idx_providers_created_at IS 
  'Index for sorting providers by creation date (newest first).';

