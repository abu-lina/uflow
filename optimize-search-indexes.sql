-- Optimize search indexes for offers and needs tables
-- Run this in your Supabase SQL Editor to improve search performance

-- Add full-text search indexes for offers table
CREATE INDEX IF NOT EXISTS idx_offers_name_de_gin ON offers USING gin(to_tsvector('german', name_de));
CREATE INDEX IF NOT EXISTS idx_offers_name_en_gin ON offers USING gin(to_tsvector('english', name_en));

-- Add full-text search indexes for needs table  
CREATE INDEX IF NOT EXISTS idx_needs_name_de_gin ON needs USING gin(to_tsvector('german', name_de));
CREATE INDEX IF NOT EXISTS idx_needs_name_en_gin ON needs USING gin(to_tsvector('english', name_en));

-- Add regular B-tree indexes for ILIKE searches (fallback)
CREATE INDEX IF NOT EXISTS idx_offers_name_de_ilike ON offers USING btree (name_de text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_offers_name_en_ilike ON offers USING btree (name_en text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_needs_name_de_ilike ON needs USING btree (name_de text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_needs_name_en_ilike ON needs USING btree (name_en text_pattern_ops);

-- Add composite indexes for providers table to optimize array searches
CREATE INDEX IF NOT EXISTS idx_providers_offers_needs_composite ON providers USING gin (offers_ids, needs_ids);

-- Add index for provider name searches
CREATE INDEX IF NOT EXISTS idx_providers_name_ilike ON providers USING btree (provider_name text_pattern_ops);

-- Add composite index for category + location + name searches
CREATE INDEX IF NOT EXISTS idx_providers_search_composite ON providers (category_id, address_city, provider_name);

COMMENT ON INDEX idx_offers_name_de_gin IS 'Full-text search index for German offer names';
COMMENT ON INDEX idx_offers_name_en_gin IS 'Full-text search index for English offer names';
COMMENT ON INDEX idx_needs_name_de_gin IS 'Full-text search index for German need names';
COMMENT ON INDEX idx_needs_name_en_gin IS 'Full-text search index for English need names';
COMMENT ON INDEX idx_providers_offers_needs_composite IS 'Composite GIN index for efficient array searches on offers and needs';
