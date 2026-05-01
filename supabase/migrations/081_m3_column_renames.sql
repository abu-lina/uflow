-- Plan 116 / M-3 (Phase C.1 — Column Renames FL-24, FL-25)
-- Covers: FL-24, FL-25, and DROP of 3 section-scoped CHECK constraints (AF-3)
-- Notes:
-- - DEPLOYMENT ORDER CRITICAL: This migration must deploy atomically with app code
--   changes that rename field references from old to new column names.
--   Applying this schema change before deploying updated app code will break the
--   currently deployed app (queries for old column names will fail).
-- - App code updated in session/118-field-schema-review branch simultaneously.
-- - Check constraints are dropped BEFORE column renames (constraints reference old names).
-- - Section-scoped CHECKs are NOT recreated. Extension tables in M-5 replace them
--   structurally (column placement IS the constraint). Recreating here would reference
--   'business'::listing_type_enum which breaks when M-5 renames it to 'store' (AF-1 CRITICAL).
-- - All drops are guarded with IF EXISTS for idempotency.

BEGIN;

-- ── Step 1: Drop section-scoped CHECK constraints (AF-3 / Decision D-9) ──────
-- Must happen before column renames since business_only_ck references solidarity_pricing
-- and ummah_only_ck references accepts_donations.

ALTER TABLE IF EXISTS public.providers
  DROP CONSTRAINT IF EXISTS providers_listing_type_food_only_ck;

ALTER TABLE IF EXISTS public.providers
  DROP CONSTRAINT IF EXISTS providers_listing_type_business_only_ck;

ALTER TABLE IF EXISTS public.providers
  DROP CONSTRAINT IF EXISTS providers_listing_type_ummah_only_ck;

-- ── Step 2: FL-24 — Rename solidarity_pricing → economic_solidarity ──────────
-- App code updated simultaneously: filterKeys.ts, sectionFilters.ts,
-- sectionBadges.ts, providerService.ts, providers.ts, ProviderCard.tsx,
-- ProviderDetailSections.tsx, and corresponding test files.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'providers'
      AND column_name = 'solidarity_pricing'
  ) THEN
    ALTER TABLE public.providers
      RENAME COLUMN solidarity_pricing TO economic_solidarity;
  END IF;
END $$;

-- ── Step 3: FL-25 — Rename accepts_donations → makes_donations ───────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'providers'
      AND column_name = 'accepts_donations'
  ) THEN
    ALTER TABLE public.providers
      RENAME COLUMN accepts_donations TO makes_donations;
  END IF;
END $$;

COMMIT;
