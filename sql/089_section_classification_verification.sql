-- ============================================================================
-- Plan 089: Section Classification Verification Queries
-- Run AFTER migration 067_three_section_search_schema.sql to validate backfill.
-- ============================================================================

-- 1. Provider count by listing_type.
-- EXPECTED: 'food' and 'business' rows. NULL rows may remain for legacy
-- Gemeinschaft & Spenden providers (D11 — see query 3 below) until they
-- are manually migrated to community_services.
SELECT
  listing_type,
  COUNT(*) AS provider_count
FROM public.providers
GROUP BY listing_type
ORDER BY listing_type;

-- 2. Providers with NULL listing_type.
-- NOTE (D11): NULL is intentional for legacy Gemeinschaft & Spenden providers.
-- These rows are expected until manual migration to community_services completes.
-- Zero NULLs is the target state only after all legacy rows are migrated.
SELECT COUNT(*) AS null_listing_type_count
FROM public.providers
WHERE listing_type IS NULL;

-- 3. Legacy Gemeinschaft & Spenden providers in providers table
-- (these intentionally keep listing_type = NULL per D11 and should be
--  manually migrated to community_services — use this list to track progress)
SELECT
  provider_id,
  provider_name,
  address_city,
  review_status,
  created_at
FROM public.providers
WHERE category_id = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7'
ORDER BY created_at DESC;

-- 4. Food providers without halal_level set (expected initially; admin/enrichment sets later)
SELECT COUNT(*) AS food_without_halal_level
FROM public.providers
WHERE listing_type = 'food'
  AND halal_level IS NULL;

-- 5. Providers with muslim_owned = true cross-checked against MUSLIM_OWNED badge
SELECT
  p.provider_id,
  p.provider_name,
  p.muslim_owned AS column_value,
  CASE WHEN pb.entity_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_badge
FROM public.providers p
LEFT JOIN public.provider_badges pb
  ON pb.entity_id = p.provider_id
  AND pb.entity_type = 'provider'
  AND pb.badge_type_id = (SELECT id FROM public.badge_types WHERE badge_key = 'MUSLIM_OWNED')
WHERE p.muslim_owned = TRUE
   OR pb.entity_id IS NOT NULL
ORDER BY p.provider_name;

-- 6. Index existence check
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename = 'providers'
  AND indexname IN (
    'idx_providers_listing_type',
    'idx_providers_muslim_owned',
    'idx_providers_halal_level'
  );
