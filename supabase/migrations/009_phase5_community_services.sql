-- Migration 009: Phase 5 — Dual-PK Consolidation, Table 3: community_services
-- Plan 114 F-1 · Table order: 3 of 4 (moderate FK surface)
--
-- Pre-condition verification:
--   All FKs referencing `community_services` already target `community_service_id`:
--     community_projects.community_service_id → community_services(community_service_id)
--     provider_community_services.community_service_id → community_services(community_service_id)
--     bookmarks.community_service_id → community_services(community_service_id) [Phase 3 typed FK]
--     community_service_offers.community_service_id → community_services(community_service_id) [Phase 3 junction]
--     community_service_needs.community_service_id → community_services(community_service_id) [Phase 3 junction]
--   No RLS policy or RPC references community_services.id directly.
--   search_community_services_enhanced() RPC returns community_service_id column (verified in baseline).
--
-- Steps:
--   1. Drop PK constraint on `id`
--   2. Promote `community_service_id` to PRIMARY KEY while preserving existing UNIQUE
--      (FK-safe cutover: inbound FKs may depend on existing unique constraint)
--   3. Drop explicit btree index on `community_service_id` (redundant with UNIQUE/PK)
--   4. Drop the vestigial `id` column
--
-- Rollback (before step 5):
--   ALTER TABLE public.community_services ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
--   ALTER TABLE public.community_services DROP CONSTRAINT community_services_pkey;
--   ALTER TABLE public.community_services ADD CONSTRAINT community_services_pkey PRIMARY KEY (id);
--   CREATE INDEX IF NOT EXISTS idx_community_services_community_service_id ON public.community_services USING btree (community_service_id);
-- ---------------------------------------------------------------------------

BEGIN;

-- Step 1: Drop PK on vestigial id column
ALTER TABLE public.community_services
  DROP CONSTRAINT IF EXISTS community_services_pkey;

-- Step 2: Promote community_service_id to PRIMARY KEY
--         Keep community_services_community_service_id_key for FK dependency safety.
ALTER TABLE public.community_services
  ADD CONSTRAINT community_services_pkey PRIMARY KEY (community_service_id);

-- Step 3: Drop now-redundant explicit btree index on community_service_id
DROP INDEX IF EXISTS public.idx_community_services_community_service_id;

-- Step 4: Drop vestigial id column (point of no return for this table)
ALTER TABLE public.community_services
  DROP COLUMN IF EXISTS id;

COMMIT;
