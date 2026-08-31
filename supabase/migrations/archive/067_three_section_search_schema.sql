-- ============================================================================
-- Migration: 067_three_section_search_schema.sql
-- Plan 089: Three-Section Search & Listing Redesign (FOOD / UMMAH / BUSINESS)
--
-- Adds listing_type discriminator, halal_level, muslim_owned, and ten boolean
-- filter-attribute columns to public.providers. Backfills existing rows from
-- category mapping and MUSLIM_OWNED badge data.
--
-- Design Decision Record (from plan 089):
--   D1: FOOD/BUSINESS split on providers.listing_type — not separate tables
--   D5: halal_level is SMALLINT 1-3, not a badge extension
--   D6: muslim_owned is a BOOLEAN column; existing badge remains for display
--   D10: Boolean columns are the authoritative filter source
--   D11: Gemeinschaft & Spenden providers (category 4470c3e0-...) keep
--        listing_type = NULL (excluded from section assignment)
--
-- Data Model Authority (post-migration):
--   Booleans  → filter-time source of truth
--   Badges     → display / trust level (unchanged)
--   barakah_effects → free-form tags only (structured attributes now in booleans)
--
-- JoinHalal upsert RPC updated at bottom to include new source-controlled fields.
--
-- Idempotent: IF NOT EXISTS / safe to re-run.
-- ============================================================================

-- ===========================================================================
-- 1. CREATE listing_type_enum
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_type_enum') THEN
    CREATE TYPE listing_type_enum AS ENUM ('food', 'business');
  END IF;
END $$;

-- ===========================================================================
-- 2. ADD COLUMNS TO providers
-- ===========================================================================

-- Section discriminator
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS listing_type listing_type_enum;

-- Halal quality level (1-3 stars, FOOD only)
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS halal_level SMALLINT
    CONSTRAINT halal_level_range CHECK (halal_level BETWEEN 1 AND 3);

-- Ownership flag (BUSINESS default filter, fast query)
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS muslim_owned BOOLEAN NOT NULL DEFAULT false;

-- Section filter attribute booleans
-- TRUE means "this provider has / complies with this attribute"
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS no_alcohol        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_pork           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_gambling       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_prayer_space  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS family_friendly   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS women_friendly    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS children_friendly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_donations BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_parking       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS solidarity_pricing BOOLEAN NOT NULL DEFAULT false;

-- ===========================================================================
-- 3. BACKFILL listing_type FROM CATEGORY
-- ===========================================================================

-- FOOD: providers in "Essen & Trinken" category (UUID stable in production)
UPDATE public.providers
SET listing_type = 'food'
WHERE category_id = (
  SELECT category_id
  FROM public.categories
  WHERE LOWER(name_de) LIKE '%essen%'
    AND LOWER(name_de) LIKE '%trinken%'
  LIMIT 1
)
AND listing_type IS NULL;

-- UMMAH (excluded): Gemeinschaft & Spenden providers keep listing_type = NULL
-- so they fall outside the FOOD/BUSINESS sections (D11).
-- The verification query (sql/089_section_classification_verification.sql)
-- counts them so operators can manually migrate them to community_services.

-- BUSINESS: all remaining providers (not Essen & Trinken, not Gemeinschaft & Spenden)
UPDATE public.providers
SET listing_type = 'business'
WHERE listing_type IS NULL
  AND (
    category_id IS NULL
    OR category_id != '4470c3e0-458f-40a6-a96e-ca0fbdf145d7'
  );

-- ===========================================================================
-- 4. BACKFILL muslim_owned FROM EXISTING BADGE DATA
-- ===========================================================================

UPDATE public.providers
SET muslim_owned = true
WHERE provider_id IN (
  SELECT pb.entity_id
  FROM public.provider_badges pb
  JOIN public.badge_types bt ON pb.badge_type_id = bt.id
  WHERE bt.badge_key = 'MUSLIM_OWNED'
    AND pb.entity_type = 'provider'
)
AND muslim_owned = false;

-- ===========================================================================
-- 5. BACKFILL BOOLEAN COLUMNS FROM barakah_effects (D10 — Data Model Authority)
-- Scan for known German strings and set corresponding boolean columns.
-- barakah_effects becomes free-form only; structured attributes use booleans.
-- ===========================================================================

UPDATE public.providers
SET
  family_friendly   = TRUE
WHERE 'familienfreundlich' = ANY(ARRAY(
  SELECT LOWER(x) FROM unnest(barakah_effects) AS x
))
AND family_friendly = false;

UPDATE public.providers
SET women_friendly = TRUE
WHERE EXISTS (
  SELECT 1 FROM unnest(barakah_effects) AS t(tag)
  WHERE LOWER(tag) IN ('frauenfreundlich', 'women friendly', 'damenfreundlich')
)
AND women_friendly = false;

UPDATE public.providers
SET has_prayer_space = TRUE
WHERE EXISTS (
  SELECT 1 FROM unnest(barakah_effects) AS t(tag)
  WHERE LOWER(tag) IN ('gebetsfreundlich', 'gebetsraum', 'prayer space', 'prayer friendly')
)
AND has_prayer_space = false;

UPDATE public.providers
SET children_friendly = TRUE
WHERE EXISTS (
  SELECT 1 FROM unnest(barakah_effects) AS t(tag)
  WHERE LOWER(tag) IN ('kinderfreundlich', 'children friendly')
)
AND children_friendly = false;

UPDATE public.providers
SET accepts_donations = TRUE
WHERE EXISTS (
  SELECT 1 FROM unnest(barakah_effects) AS t(tag)
  WHERE LOWER(tag) IN ('spendenbereit', 'accepts donations', 'spenden')
)
AND accepts_donations = false;

UPDATE public.providers
SET has_parking = TRUE
WHERE EXISTS (
  SELECT 1 FROM unnest(barakah_effects) AS t(tag)
  WHERE LOWER(tag) IN ('parkplatz', 'parking', 'has parking')
)
AND has_parking = false;

UPDATE public.providers
SET solidarity_pricing = TRUE
WHERE EXISTS (
  SELECT 1 FROM unnest(barakah_effects) AS t(tag)
  WHERE LOWER(tag) IN ('solidarpreis', 'solidarity pricing', 'solidarisch')
)
AND solidarity_pricing = false;

-- ===========================================================================
-- 6. INDEXES
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_providers_listing_type
  ON public.providers (listing_type);

CREATE INDEX IF NOT EXISTS idx_providers_muslim_owned
  ON public.providers (muslim_owned)
  WHERE muslim_owned = true;

CREATE INDEX IF NOT EXISTS idx_providers_halal_level
  ON public.providers (halal_level)
  WHERE halal_level IS NOT NULL;

-- Composite index for the most common FOOD section query
-- (listing_type + muslim_owned filter default)
CREATE INDEX IF NOT EXISTS idx_providers_food_muslim_owned
  ON public.providers (listing_type, muslim_owned)
  WHERE listing_type = 'food';

CREATE INDEX IF NOT EXISTS idx_providers_business_muslim_owned
  ON public.providers (listing_type, muslim_owned)
  WHERE listing_type = 'business';

-- ===========================================================================
-- 7. UPDATE upsert_joinhalal_providers RPC (F2 — Plan 089)
--
-- Adds listing_type, no_alcohol, halal_level to INSERT and SELECT.
-- listing_type and no_alcohol are source-controlled (updated on conflict).
-- halal_level is source-controlled (default 1 for all JoinHalal imports).
--
-- JoinHalal providers are always food — they are all Essen & Trinken.
-- All JoinHalal records pass the hasAlkoholverkauf() check before reaching
-- the upsert (alcohol records are rejected at the app layer, not imported).
-- Therefore no_alcohol = true is correct for all upserted records.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.upsert_joinhalal_providers(
  p_providers JSONB
)
RETURNS TABLE(inserted_count BIGINT, updated_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_providers IS NULL OR jsonb_array_length(p_providers) = 0 THEN
    inserted_count := 0;
    updated_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH upserted AS (
    INSERT INTO public.providers (
      provider_name,
      category_id,
      address_street,
      address_zip,
      address_city,
      address_country,
      contact_email,
      contact_phone,
      social_website,
      social_instagram,
      offers_ids,
      review_status,
      user_created_id,
      provider_owner_id,
      show_address,
      needs_ids,
      barakah_effects,
      import_source,
      import_source_id,
      import_source_url,
      listing_type,
      no_alcohol,
      halal_level
    )
    SELECT
      elem->>'provider_name',
      (elem->>'category_id')::UUID,
      elem->>'address_street',
      elem->>'address_zip',
      elem->>'address_city',
      elem->>'address_country',
      elem->>'contact_email',
      elem->>'contact_phone',
      elem->>'social_website',
      elem->>'social_instagram',
      CASE
        WHEN elem->'offers_ids' IS NOT NULL
             AND jsonb_typeof(elem->'offers_ids') = 'array'
        THEN ARRAY(SELECT (jsonb_array_elements_text(elem->'offers_ids'))::UUID)
        ELSE '{}'::UUID[]
      END,
      COALESCE((elem->>'review_status')::review_status, 'pending'),
      (elem->>'user_created_id')::UUID,
      (elem->>'provider_owner_id')::UUID,
      COALESCE((elem->>'show_address')::BOOLEAN, true),
      CASE
        WHEN elem->'needs_ids' IS NOT NULL
             AND jsonb_typeof(elem->'needs_ids') = 'array'
        THEN ARRAY(SELECT (jsonb_array_elements_text(elem->'needs_ids'))::UUID)
        ELSE '{}'::UUID[]
      END,
      CASE
        WHEN elem->'barakah_effects' IS NOT NULL
             AND jsonb_typeof(elem->'barakah_effects') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(elem->'barakah_effects'))
        ELSE '{}'::TEXT[]
      END,
      elem->>'import_source',
      elem->>'import_source_id',
      elem->>'import_source_url',
      -- Plan 089: JoinHalal providers are always FOOD
      'food'::listing_type_enum,
      -- Plan 089: JoinHalal records passing this upsert have no alcohol
      -- (hasAlkoholverkauf() rejects alcohol records at app layer)
      TRUE,
      -- Plan 089: default halal_level = 1 (halal meat available)
      -- Higher levels require manual admin assessment
      COALESCE((elem->>'halal_level')::SMALLINT, 1)
    FROM jsonb_array_elements(p_providers) AS elem
    ON CONFLICT (import_source, import_source_id)
      WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL
    DO UPDATE SET
      provider_name       = EXCLUDED.provider_name,
      category_id         = EXCLUDED.category_id,
      address_street      = EXCLUDED.address_street,
      address_zip         = EXCLUDED.address_zip,
      address_city        = EXCLUDED.address_city,
      address_country     = EXCLUDED.address_country,
      contact_email       = EXCLUDED.contact_email,
      contact_phone       = EXCLUDED.contact_phone,
      social_website      = EXCLUDED.social_website,
      social_instagram    = EXCLUDED.social_instagram,
      offers_ids          = EXCLUDED.offers_ids,
      import_source_url   = EXCLUDED.import_source_url,
      -- Plan 089: update section fields on re-import too
      listing_type        = EXCLUDED.listing_type,
      no_alcohol          = EXCLUDED.no_alcohol,
      halal_level         = EXCLUDED.halal_level
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE was_insert), 0)      AS inserted_count,
    COALESCE(COUNT(*) FILTER (WHERE NOT was_insert), 0)  AS updated_count
  FROM upserted;
END;
$$;
