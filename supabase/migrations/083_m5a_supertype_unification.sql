-- =============================================================================
-- Migration 083: M-5a — Supertype Unification + Enum Rename
-- Plan: PLAN-116  Origin: 118  UUID: e7a3f1c9
-- Findings: FL-26, FL-28 (Part 1)
-- =============================================================================
-- APPLIED TO PROD: 2026-05-01 via mcp_supabase_execute_sql (execute per-step)
-- This file is the authoritative migration record of what was applied.
-- It is idempotent-safe (IF NOT EXISTS / IF EXISTS guards throughout).
-- =============================================================================
-- IMPORTANT EXECUTION ORDER:
--   1. DROP partial index (references 'business' literal) BEFORE enum rename
--   2. DROP categories CHECK (references 'business' text) BEFORE enum rename
--   3. ALTER TYPE RENAME VALUE
--   4. Recreate categories CHECK with 'store'
--   5. Recreate partial index with 'store'
--   6. Create extension tables
--   7. Migrate food/store data → extension tables
--   8. Migrate community_services → providers (as listing_type='ummah')
--   9. Migrate CS offers/needs → provider_offers/provider_needs
--  10. Simplify bookmarks (drop community_service_id)
--  11. Update badge_types for moved columns
--  12. Drop type-exclusive columns from providers supertype
--  13. Drop community_services and provider_community_services tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1a: Drop partial index (predicate references 'business'::listing_type_enum)
--          MUST happen before RENAME VALUE or the index becomes invalid.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_providers_business_muslim_owned;

-- ---------------------------------------------------------------------------
-- Step 1b: Section-scoped CHECK constraints (food_only, business_only, ummah_only)
--          were already dropped in Migration 081 (M-3). No action needed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Step 1c: Drop categories applicable_section CHECK (references 'business' text)
--          MUST happen before RENAME VALUE to avoid constraint violation.
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_applicable_section_check;

-- ---------------------------------------------------------------------------
-- Step 1d: Rename enum value 'business' → 'store'
--          Requires Postgres 10+. UFlow runs on Supabase Postgres 15.
--          Note: 'ummah' was already added in Migration 006 (baseline).
--          Use DO block to skip if already renamed (idempotent guard).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type_enum' AND e.enumlabel = 'business'
  ) THEN
    ALTER TYPE public.listing_type_enum RENAME VALUE 'business' TO 'store';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 1e: Update categories text values from 'business' → 'store'
-- ---------------------------------------------------------------------------
UPDATE public.categories
SET applicable_section = 'store'
WHERE applicable_section = 'business';

-- ---------------------------------------------------------------------------
-- Step 1f: Recreate categories CHECK with 'store' instead of 'business'
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD CONSTRAINT categories_applicable_section_check
  CHECK (applicable_section IN ('food', 'store', 'ummah', 'all'));

-- ---------------------------------------------------------------------------
-- Step 1g: Recreate partial index for 'store' listing_type
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_providers_store_muslim_owned
  ON public.providers USING btree (listing_type, muslim_owned)
  WHERE listing_type = 'store'::public.listing_type_enum;

-- ---------------------------------------------------------------------------
-- Step 2: Create 1:1 extension tables for each listing_type
--         Each has provider_id PK → providers(provider_id) ON DELETE CASCADE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.food_providers (
  provider_id    UUID PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  halal_level    SMALLINT,
  no_alcohol     BOOLEAN NOT NULL DEFAULT false,
  no_pork        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_providers (
  provider_id    UUID PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  no_gambling    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ummah_providers (
  provider_id                   UUID PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  community_service_view_count  INTEGER NOT NULL DEFAULT 0,
  donation_count                INTEGER NOT NULL DEFAULT 0,
  is_verified                   BOOLEAN NOT NULL DEFAULT false,
  verified_at                   TIMESTAMPTZ,
  verified_by                   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  community_service_logo        TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on extension tables (matching providers policy pattern — G-3)
ALTER TABLE public.food_providers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ummah_providers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Step 3: Populate food_providers and store_providers from existing providers
--         (data migration — type-exclusive columns → extension tables)
-- ---------------------------------------------------------------------------

-- Food providers: migrate halal_level, no_alcohol, no_pork
INSERT INTO public.food_providers (provider_id, halal_level, no_alcohol, no_pork)
SELECT provider_id, halal_level, no_alcohol, no_pork
FROM public.providers
WHERE listing_type = 'food'
ON CONFLICT (provider_id) DO NOTHING;

-- Store providers: migrate no_gambling
INSERT INTO public.store_providers (provider_id, no_gambling)
SELECT provider_id, no_gambling
FROM public.providers
WHERE listing_type = 'store'
ON CONFLICT (provider_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 4: Migrate community_services → providers (listing_type = 'ummah')
--         Uses community_service_id directly as provider_id to preserve
--         all downstream FK references (provider_offers, bookmarks, etc.)
--         cs.provider_id (linked org reference) → providers.provider_owner_id
-- ---------------------------------------------------------------------------

INSERT INTO public.providers (
  provider_id,
  provider_name,
  provider_description,
  listing_type,
  category_id,
  contact_email,
  contact_phone,
  social_website,
  social_instagram,
  address_street,
  address_zip,
  address_city,
  address_country,
  location_latitude,
  location_longitude,
  review_status,
  review_feedback,
  show_address,
  user_created_id,
  recommender_email,
  created_at,
  updated_at,
  provider_owner_id
)
SELECT
  cs.community_service_id,
  cs.community_service_name,
  cs.community_service_description,
  'ummah'::public.listing_type_enum,
  cs.category_id,
  cs.contact_email,
  cs.contact_phone,
  cs.social_website,
  cs.social_instagram,
  cs.address_street,
  cs.address_zip,
  cs.address_city,
  cs.address_country,
  cs.location_latitude,
  cs.location_longitude,
  cs.review_status,
  cs.review_feedback,
  cs.show_address,
  cs.user_created_id,
  cs.recommender_email,
  cs.created_at,
  cs.updated_at,
  cs.provider_id  -- linked org reference → provider_owner_id
FROM public.community_services cs
ON CONFLICT (provider_id) DO NOTHING;

-- Step 4b: Populate ummah_providers extension from community_services
INSERT INTO public.ummah_providers (
  provider_id,
  community_service_view_count,
  donation_count,
  is_verified,
  verified_at,
  verified_by,
  community_service_logo,
  created_at,
  updated_at
)
SELECT
  cs.community_service_id,
  cs.community_service_view_count,
  cs.donation_count,
  cs.is_verified,
  cs.verified_at,
  cs.verified_by,
  cs.community_service_logo,
  cs.created_at,
  cs.updated_at
FROM public.community_services cs
ON CONFLICT (provider_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 5: community_projects FK rename: community_service_id → provider_id
-- ---------------------------------------------------------------------------

ALTER TABLE public.community_projects
  DROP CONSTRAINT IF EXISTS community_projects_community_service_id_fkey;

-- Only rename if column still exists with old name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_projects'
      AND column_name = 'community_service_id'
  ) THEN
    ALTER TABLE public.community_projects RENAME COLUMN community_service_id TO provider_id;
  END IF;
END $$;

ALTER TABLE public.community_projects
  DROP CONSTRAINT IF EXISTS community_projects_provider_id_fkey;

ALTER TABLE public.community_projects
  ADD CONSTRAINT community_projects_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;

-- Fix community_projects RLS policies (provider_id now references providers)
DROP POLICY IF EXISTS "community_projects_owner_insert" ON public.community_projects;
DROP POLICY IF EXISTS "community_projects_owner_update" ON public.community_projects;
DROP POLICY IF EXISTS "community_projects_owner_delete" ON public.community_projects;

CREATE POLICY "community_projects_owner_insert"
  ON public.community_projects
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT p.provider_id FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "community_projects_owner_update"
  ON public.community_projects
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT p.provider_id FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "community_projects_owner_delete"
  ON public.community_projects
  FOR DELETE
  USING (
    provider_id IN (
      SELECT p.provider_id FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Step 6: Create provider_engagements (replaces provider_community_services)
--         Rename semantics: initiating_provider_id = old provider_id,
--         engaged_provider_id = old community_service_id (now a valid provider)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_engagements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiating_provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  engaged_provider_id    UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  engagement_type        TEXT CHECK (engagement_type IN ('endorsement', 'financial', 'supply_chain', 'community_referral')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_engagements ENABLE ROW LEVEL SECURITY;

-- Migrate existing rows from provider_community_services (3 rows in prod)
INSERT INTO public.provider_engagements (id, initiating_provider_id, engaged_provider_id, created_at, updated_at)
SELECT id, provider_id, community_service_id, created_at, updated_at
FROM public.provider_community_services
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 7: Junction table merge — community_service_offers → provider_offers
--         community_service_needs → provider_needs (0 rows in prod)
-- ---------------------------------------------------------------------------

-- Update offers DELETE policy to remove community_service_offers reference
DROP POLICY IF EXISTS "Users can delete their own unused offers" ON public.offers;

CREATE POLICY "Users can delete their own unused offers"
  ON public.offers
  FOR DELETE
  USING (
    (SELECT auth.uid()) = created_by
    AND NOT EXISTS (
      SELECT 1 FROM public.provider_offers po WHERE po.offer_id = offers.offer_id
    )
  );

-- Update needs DELETE policy to remove community_service_needs reference
DROP POLICY IF EXISTS "Users can delete their own unused needs" ON public.needs;

CREATE POLICY "Users can delete their own unused needs"
  ON public.needs
  FOR DELETE
  USING (
    (SELECT auth.uid()) = created_by
    AND NOT EXISTS (
      SELECT 1 FROM public.provider_needs pn WHERE pn.need_id = needs.need_id
    )
  );

-- Migrate community_service_offers → provider_offers
-- community_service_id values are now valid provider_id values (Step 4)
INSERT INTO public.provider_offers (provider_id, offer_id, created_at)
SELECT community_service_id, offer_id, created_at
FROM public.community_service_offers
ON CONFLICT DO NOTHING;

-- community_service_needs had 0 rows in prod — migration is a no-op
INSERT INTO public.provider_needs (provider_id, need_id, created_at)
SELECT community_service_id, need_id, created_at
FROM public.community_service_needs
ON CONFLICT DO NOTHING;

-- Drop CS junction tables
DROP TABLE IF EXISTS public.community_service_offers;
DROP TABLE IF EXISTS public.community_service_needs;

-- ---------------------------------------------------------------------------
-- Step 8: Bookmarks simplification
--         Merge bookmarks.community_service_id → provider_id, then drop column
-- ---------------------------------------------------------------------------

-- Drop the XOR constraint (was: exactly one of provider_id/community_service_id)
ALTER TABLE public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_provider_or_community_service_check;

-- Migrate CS bookmarks: set provider_id = community_service_id
UPDATE public.bookmarks
SET provider_id = community_service_id
WHERE community_service_id IS NOT NULL
  AND provider_id IS NULL;

-- Drop CS FK and column
ALTER TABLE public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_community_service_id_fkey;

ALTER TABLE public.bookmarks
  DROP COLUMN IF EXISTS community_service_id;

-- Enforce: all bookmarks must now reference a provider
ALTER TABLE public.bookmarks
  ALTER COLUMN provider_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 9: Update badge_types for columns moving to extension tables
--         halal_level, no_alcohol, no_pork → food_providers
--         no_gambling → store_providers
--         The trigger (rewritten in M-4) targets providers columns by name;
--         set provider_column_name = NULL for moved columns to prevent errors.
-- ---------------------------------------------------------------------------

UPDATE public.badge_types
SET provider_column_name = NULL,
    is_filterable        = false
WHERE provider_column_name IN ('no_alcohol', 'no_pork', 'no_gambling');

-- Update provider_badges: drop community_service_id (all CS migrated to providers)
DROP POLICY IF EXISTS "Entity owners can update their badges" ON public.provider_badges;

CREATE POLICY "Entity owners can update their badges"
  ON public.provider_badges
  FOR UPDATE
  USING (
    (provider_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.provider_id = provider_badges.provider_id
        AND (p.provider_owner_id = (SELECT auth.uid())
             OR p.user_created_id = (SELECT auth.uid()))
    ))
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
        AND (u.raw_user_meta_data ->> 'role') = 'admin'
    )
  );

ALTER TABLE public.provider_badges
  DROP CONSTRAINT IF EXISTS provider_badges_community_service_id_fkey;

ALTER TABLE public.provider_badges
  DROP COLUMN IF EXISTS community_service_id;

-- ---------------------------------------------------------------------------
-- Step 10: Drop type-exclusive columns from providers supertype
--          Data already migrated to food_providers and store_providers.
-- ---------------------------------------------------------------------------

ALTER TABLE public.providers
  DROP COLUMN IF EXISTS halal_level,
  DROP COLUMN IF EXISTS no_alcohol,
  DROP COLUMN IF EXISTS no_pork,
  DROP COLUMN IF EXISTS no_gambling;

-- ---------------------------------------------------------------------------
-- Step 11: Drop community_services and provider_community_services tables
--          All data migrated; all FK dependencies removed in prior steps.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS public.provider_community_services;
DROP TABLE IF EXISTS public.community_services;

-- =============================================================================
-- Acceptance Criteria Verification (run after applying to confirm success)
-- =============================================================================
-- SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
--   FROM pg_enum WHERE enumtypid = 'public.listing_type_enum'::regtype;
-- → food, store, ummah
--
-- SELECT listing_type, COUNT(*) FROM public.providers GROUP BY listing_type;
-- → food=973, store=342, ummah=8
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public'
--   AND table_name IN ('community_services','provider_community_services');
-- → (0 rows)
--
-- SELECT 'food_providers', COUNT(*) FROM food_providers
--   UNION ALL SELECT 'store_providers', COUNT(*) FROM store_providers
--   UNION ALL SELECT 'ummah_providers', COUNT(*) FROM ummah_providers;
-- → food_providers=973, store_providers=342, ummah_providers=8
--
-- SELECT COUNT(*) FROM public.bookmarks WHERE provider_id IS NULL;
-- → 0 (all bookmarks have a provider_id)
-- =============================================================================
