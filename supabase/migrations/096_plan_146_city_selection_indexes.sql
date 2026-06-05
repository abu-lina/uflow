-- =============================================================================
-- Migration 096: City Selection Performance — Expression Indexes
-- =============================================================================
-- Adds expression indexes matching the LOWER(TRIM(...)) patterns used in the
-- get_cities_with_counts() RPC function (defined in 001_baseline.sql:328-361).
-- The existing indexes on plain columns (idx_providers_city, idx_cities_name)
-- cannot be used for these expression-based queries, causing sequential scans
-- as provider/city tables grow.
--
-- Note: CONCURRENTLY is omitted for Supabase CLI compatibility (migrations
-- run inside transactions). For large production tables, apply these via
-- the Supabase Dashboard SQL editor with CONCURRENTLY to avoid locking.
--
-- Indexes added:
--   1. idx_providers_city_lower_trim_approved — covers the providers subquery
--      GROUP BY and JOIN on LOWER(TRIM(address_city)) with review_status = 'approved'
--   2. idx_cities_name_lower_trim — covers the cities side of the JOIN on
--      LOWER(TRIM(city_name))
-- =============================================================================

-- Enables index-only scan for the providers subquery in get_cities_with_counts()
-- This matches the LOWER(TRIM(address_city)) pattern used in the RPC's GROUP BY and JOIN
CREATE INDEX IF NOT EXISTS idx_providers_city_lower_trim_approved
ON providers(LOWER(TRIM(address_city)))
WHERE review_status = 'approved' AND address_city IS NOT NULL;

-- Enables index for the cities side of the JOIN (LOWER(TRIM(city_name)))
CREATE INDEX IF NOT EXISTS idx_cities_name_lower_trim
ON cities(LOWER(TRIM(city_name)));
