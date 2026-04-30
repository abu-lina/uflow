-- Migration 010: Phase 5 — Dual-PK Consolidation, Table 4: providers
-- Plan 114 F-1 · Table order: 4 of 4 (highest FK surface: 26+ inbound references)
--
-- Pre-condition verification:
--   All FKs referencing `providers` already target `providers.provider_id`:
--     enrichment_candidates.provider_id → providers(provider_id)
--     community_services.provider_id → providers(provider_id)
--     provider_community_services.provider_id → providers(provider_id)
--     provider_menu_items.provider_id → providers(provider_id)
--     provider_outreach_tasks.provider_id → providers(provider_id)
--     provider_owner_action_tokens.provider_id → providers(provider_id)
--     provider_owner_outreach.provider_id → providers(provider_id)
--     provider_service_offers.provider_id → providers(provider_id)
--     bookmarks.provider_id → providers(provider_id) [Phase 3 typed FK]
--     provider_offers.provider_id → providers(provider_id) [Phase 3 junction]
--     provider_needs.provider_id → providers(provider_id) [Phase 3 junction]
--   All search RPCs return provider_id, not id (verified in baseline).
--   No RLS policy references providers.id directly (verified in baseline scan).
--   Phase 3 migration's `u.id` reference is from auth.users u — not public.providers.id.
--
-- Steps:
--   1. Drop PK constraint on `id`
--   2. Promote `provider_id` to PRIMARY KEY while preserving existing UNIQUE
--      (FK-safe cutover: inbound FKs may depend on existing unique constraint)
--   3. Drop explicit btree index on `provider_id` (redundant with UNIQUE/PK)
--   4. Drop the vestigial `id` column
--
-- Rollback (before step 5):
--   ALTER TABLE public.providers ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
--   ALTER TABLE public.providers DROP CONSTRAINT providers_pkey;
--   ALTER TABLE public.providers ADD CONSTRAINT providers_pkey PRIMARY KEY (id);
--   CREATE INDEX IF NOT EXISTS idx_providers_provider_id ON public.providers USING btree (provider_id);
-- ---------------------------------------------------------------------------

BEGIN;

-- Step 1: Drop PK on vestigial id column
ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_pkey;

-- Step 2: Promote provider_id to PRIMARY KEY
--         Keep providers_provider_id_key for FK dependency safety.
ALTER TABLE public.providers
  ADD CONSTRAINT providers_pkey PRIMARY KEY (provider_id);

-- Step 3: Drop now-redundant explicit btree index on provider_id
DROP INDEX IF EXISTS public.idx_providers_provider_id;

-- Step 4: Drop vestigial id column (point of no return for providers)
ALTER TABLE public.providers
  DROP COLUMN IF EXISTS id;

COMMIT;
