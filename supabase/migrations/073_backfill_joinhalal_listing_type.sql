-- =====================================================
-- PLAN 098: BACKFILL listing_type FOR JOINHALAL PROVIDERS
-- =====================================================
-- All JoinHalal providers are halal food restaurants.
-- Migration 067 backfilled listing_type from category, but
-- any provider assigned to a category added AFTER that
-- backfill (e.g. categories from migration 071) was left
-- with listing_type = 'business'.
--
-- This migration corrects those rows.
-- =====================================================

UPDATE public.providers
SET
  listing_type = 'food'::listing_type_enum,
  updated_at   = now()
WHERE
  import_source = 'joinhalal'
  AND listing_type = 'business';
