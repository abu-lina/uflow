-- Plan 114 / Phase 0: Schema hygiene quick wins (F-7, F-10)
-- Drops redundant indexes, removes duplicate providers updated_at trigger,
-- and adds two composite indexes with real query value.

-- F-7: Drop 10 redundant indexes (covered by UNIQUE/PK or leftmost prefix).
DROP INDEX IF EXISTS public.idx_providers_provider_id;
DROP INDEX IF EXISTS public.idx_offers_offer_id;
DROP INDEX IF EXISTS public.idx_needs_need_id;
DROP INDEX IF EXISTS public.idx_categories_category_id;
DROP INDEX IF EXISTS public.idx_community_services_service_id;
DROP INDEX IF EXISTS public.idx_provider_community_services_composite;
DROP INDEX IF EXISTS public.idx_badge_types_badge_key;
DROP INDEX IF EXISTS public.idx_badge_confirmations_badge;
DROP INDEX IF EXISTS public.idx_cities_name;
DROP INDEX IF EXISTS public.idx_waitlist_email;

-- F-10: Remove duplicate providers updated_at trigger; keep trigger_providers_updated_at.
DROP TRIGGER IF EXISTS update_providers_updated_at ON public.providers;

-- F-7: Add two composite indexes (bookmarks interim index intentionally omitted per C-4).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'providers'
      AND column_name = 'address_city'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'providers'
      AND column_name = 'listing_type'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_providers_city_listing_type ON public.providers (address_city, listing_type)';
  ELSE
    RAISE NOTICE 'Skipping idx_providers_city_listing_type because providers(address_city, listing_type) is not available in this schema state.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'provider_badges'
      AND column_name IN ('entity_id', 'entity_type', 'badge_type_id', 'trust_level')
    GROUP BY table_schema, table_name
    HAVING COUNT(*) = 4
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_provider_badges_entity_lookup_covering ON public.provider_badges (entity_id, entity_type, badge_type_id) INCLUDE (trust_level)';
  ELSE
    RAISE NOTICE 'Skipping idx_provider_badges_entity_lookup_covering because provider_badges columns are not available in this schema state.';
  END IF;
END
$$;
