-- Plan 116 / M-1 (Phase A quick wins)
-- Covers: FL-15, FL-14, FL-17, FL-22, FL-18, FL-3
-- Notes:
-- - Uses drift-safe guards (`IF EXISTS` + catalog checks) for cross-environment safety.
-- - FL-17 range set to 0..100 based on baseline semantics and live data audit.
-- - FL-15: Migrations 007/008/010 intentionally preserved UNIQUE constraints for "FK dependency
--   safety" because inbound FKs were created before category_id/provider_id/user_id became PKs.
--   Those FKs still resolve against the UNIQUE index backing the _key constraint, not the PK.
--   Fix: drop each dependent FK, drop the UNIQUE constraint, recreate FKs (resolve to PK now).
--   All drops/recreates are guarded with IF EXISTS / IF NOT EXISTS for idempotency.

BEGIN;

-- FL-15: Drop redundant UNIQUE constraints on PK-equivalent columns.
-- Each requires dropping FK dependents first, then recreating them against the PK.

-- ── categories_category_id_key ──────────────────────────────────────────────
-- Dependent FKs (6): category_suggested_needs, category_suggested_offers,
--   community_services, needs, offers, providers

ALTER TABLE IF EXISTS public.category_suggested_needs
  DROP CONSTRAINT IF EXISTS category_suggested_needs_category_id_fkey;
ALTER TABLE IF EXISTS public.category_suggested_offers
  DROP CONSTRAINT IF EXISTS category_suggested_offers_category_id_fkey;
ALTER TABLE IF EXISTS public.community_services
  DROP CONSTRAINT IF EXISTS community_services_category_id_fkey;
ALTER TABLE IF EXISTS public.needs
  DROP CONSTRAINT IF EXISTS needs_category_id_fkey;
ALTER TABLE IF EXISTS public.offers
  DROP CONSTRAINT IF EXISTS offers_category_id_fkey;
ALTER TABLE IF EXISTS public.providers
  DROP CONSTRAINT IF EXISTS providers_category_id_fkey;

ALTER TABLE IF EXISTS public.categories
  DROP CONSTRAINT IF EXISTS categories_category_id_key;

-- Recreate FKs — now resolve to categories_pkey (PK on category_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_suggested_needs_category_id_fkey') THEN
    ALTER TABLE public.category_suggested_needs
      ADD CONSTRAINT category_suggested_needs_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_suggested_offers_category_id_fkey') THEN
    ALTER TABLE public.category_suggested_offers
      ADD CONSTRAINT category_suggested_offers_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_services_category_id_fkey') THEN
    ALTER TABLE public.community_services
      ADD CONSTRAINT community_services_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'needs_category_id_fkey') THEN
    ALTER TABLE public.needs
      ADD CONSTRAINT needs_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_category_id_fkey') THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'providers_category_id_fkey') THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id);
  END IF;
END $$;

-- ── providers_provider_id_key ────────────────────────────────────────────────
-- Dependent FKs (12): bookmarks, community_services, enrichment_candidates,
--   provider_badges, provider_community_services, provider_menu_items,
--   provider_needs, provider_offers, provider_outreach_tasks,
--   provider_owner_action_tokens, provider_owner_outreach, provider_service_offers

ALTER TABLE IF EXISTS public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_provider_id_fkey;
ALTER TABLE IF EXISTS public.community_services
  DROP CONSTRAINT IF EXISTS community_services_provider_id_fkey;
ALTER TABLE IF EXISTS public.enrichment_candidates
  DROP CONSTRAINT IF EXISTS enrichment_candidates_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_badges
  DROP CONSTRAINT IF EXISTS provider_badges_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_community_services
  DROP CONSTRAINT IF EXISTS provider_community_services_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_menu_items
  DROP CONSTRAINT IF EXISTS provider_menu_items_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_needs
  DROP CONSTRAINT IF EXISTS provider_needs_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_offers
  DROP CONSTRAINT IF EXISTS provider_offers_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_outreach_tasks
  DROP CONSTRAINT IF EXISTS provider_outreach_tasks_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_owner_action_tokens
  DROP CONSTRAINT IF EXISTS provider_owner_action_tokens_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_owner_outreach
  DROP CONSTRAINT IF EXISTS provider_owner_outreach_provider_id_fkey;
ALTER TABLE IF EXISTS public.provider_service_offers
  DROP CONSTRAINT IF EXISTS provider_service_offers_provider_id_fkey;

ALTER TABLE IF EXISTS public.providers
  DROP CONSTRAINT IF EXISTS providers_provider_id_key;

-- Recreate FKs — now resolve to providers_pkey (PK on provider_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_provider_id_fkey') THEN
    ALTER TABLE public.bookmarks
      ADD CONSTRAINT bookmarks_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_services_provider_id_fkey') THEN
    ALTER TABLE public.community_services
      ADD CONSTRAINT community_services_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrichment_candidates_provider_id_fkey') THEN
    ALTER TABLE public.enrichment_candidates
      ADD CONSTRAINT enrichment_candidates_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_badges_provider_id_fkey') THEN
    ALTER TABLE public.provider_badges
      ADD CONSTRAINT provider_badges_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_community_services_provider_id_fkey') THEN
    ALTER TABLE public.provider_community_services
      ADD CONSTRAINT provider_community_services_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_menu_items_provider_id_fkey') THEN
    ALTER TABLE public.provider_menu_items
      ADD CONSTRAINT provider_menu_items_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_needs_provider_id_fkey') THEN
    ALTER TABLE public.provider_needs
      ADD CONSTRAINT provider_needs_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_offers_provider_id_fkey') THEN
    ALTER TABLE public.provider_offers
      ADD CONSTRAINT provider_offers_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_outreach_tasks_provider_id_fkey') THEN
    ALTER TABLE public.provider_outreach_tasks
      ADD CONSTRAINT provider_outreach_tasks_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_owner_action_tokens_provider_id_fkey') THEN
    ALTER TABLE public.provider_owner_action_tokens
      ADD CONSTRAINT provider_owner_action_tokens_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_owner_outreach_provider_id_fkey') THEN
    ALTER TABLE public.provider_owner_outreach
      ADD CONSTRAINT provider_owner_outreach_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_service_offers_provider_id_fkey') THEN
    ALTER TABLE public.provider_service_offers
      ADD CONSTRAINT provider_service_offers_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── users_user_id_key ────────────────────────────────────────────────────────
-- Dependent FKs (1): admin_audit_logs.admin_user_id → public.users(user_id)

ALTER TABLE IF EXISTS public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS fk_admin_audit_logs_admin_user_id;

ALTER TABLE IF EXISTS public.users
  DROP CONSTRAINT IF EXISTS users_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_audit_logs_admin_user_id') THEN
    ALTER TABLE public.admin_audit_logs
      ADD CONSTRAINT fk_admin_audit_logs_admin_user_id
      FOREIGN KEY (admin_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- FL-14: Add missing FK enrichment_candidates.run_id -> enrichment_run_logs.id ON DELETE SET NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'enrichment_candidates_run_id_fkey'
      AND conrelid = 'public.enrichment_candidates'::regclass
  ) THEN
    ALTER TABLE public.enrichment_candidates
      ADD CONSTRAINT enrichment_candidates_run_id_fkey
      FOREIGN KEY (run_id)
      REFERENCES public.enrichment_run_logs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- FL-17: Enforce cities.trust_level numeric bounds (0..100).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cities_trust_level_range_check'
      AND conrelid = 'public.cities'::regclass
  ) THEN
    ALTER TABLE public.cities
      ADD CONSTRAINT cities_trust_level_range_check
      CHECK (trust_level >= 0 AND trust_level <= 100);
  END IF;
END $$;

-- FL-22: Standardize currency fields to EUR.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_menu_items_price_currency_eur_check'
      AND conrelid = 'public.provider_menu_items'::regclass
  ) THEN
    ALTER TABLE public.provider_menu_items
      ADD CONSTRAINT provider_menu_items_price_currency_eur_check
      CHECK (price_currency = 'EUR');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_service_offers_price_currency_eur_check'
      AND conrelid = 'public.provider_service_offers'::regclass
  ) THEN
    ALTER TABLE public.provider_service_offers
      ADD CONSTRAINT provider_service_offers_price_currency_eur_check
      CHECK (price_currency = 'EUR');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_projects_price_currency_eur_check'
      AND conrelid = 'public.community_projects'::regclass
  ) THEN
    ALTER TABLE public.community_projects
      ADD CONSTRAINT community_projects_price_currency_eur_check
      CHECK (price_currency = 'EUR');
  END IF;
END $$;

-- FL-18: Remove nullable boolean ambiguity from waitlist.is_provider.
UPDATE public.waitlist
SET is_provider = FALSE
WHERE is_provider IS NULL;

ALTER TABLE public.waitlist
  ALTER COLUMN is_provider SET DEFAULT FALSE;

ALTER TABLE public.waitlist
  ALTER COLUMN is_provider SET NOT NULL;

-- FL-3 (schema side): remove deprecated categories.applicable_to + legacy index.
DROP INDEX IF EXISTS public.idx_categories_applicable_to;

ALTER TABLE IF EXISTS public.categories
  DROP COLUMN IF EXISTS applicable_to;

COMMIT;
