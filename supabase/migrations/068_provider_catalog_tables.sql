-- =====================================================
-- PLAN 094: PROVIDER CATALOG TABLES + SEARCH RPC
-- =====================================================
-- Introduces provider-specific catalog tables for food menu items
-- and business service offers, plus unified item search RPC.
--
-- Design authority: ADR-094 (Pattern C)
-- - Keep global offers vocabulary table unchanged
-- - Add typed instance tables (no JSONB for price/availability)
-- - Add STORED tsvector columns + GIN indexes
-- - Add RLS owner policies
-- - Add search_provider_items RPC (UNION ALL)
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
-- =====================================================

-- -----------------------------------------------------
-- 1) TABLES
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  offer_tag_id UUID REFERENCES public.offers(offer_id) ON DELETE SET NULL,

  name_de TEXT NOT NULL,
  name_en TEXT,
  description_de TEXT,

  price_cents INTEGER,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  is_available BOOLEAN NOT NULL DEFAULT true,

  image_path TEXT,
  allergens TEXT[] DEFAULT '{}',
  is_halal BOOLEAN NOT NULL DEFAULT false,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'german',
      COALESCE(name_de, '') || ' ' || COALESCE(name_en, '') || ' ' || COALESCE(description_de, '')
    )
  ) STORED,

  CONSTRAINT provider_menu_items_price_non_negative CHECK (price_cents IS NULL OR price_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.provider_service_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  offer_tag_id UUID REFERENCES public.offers(offer_id) ON DELETE SET NULL,

  name_de TEXT NOT NULL,
  name_en TEXT,
  description_de TEXT,

  price_cents INTEGER,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  duration_minutes INTEGER,
  booking_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'german',
      COALESCE(name_de, '') || ' ' || COALESCE(name_en, '') || ' ' || COALESCE(description_de, '')
    )
  ) STORED,

  CONSTRAINT provider_service_offers_price_non_negative CHECK (price_cents IS NULL OR price_cents >= 0),
  CONSTRAINT provider_service_offers_duration_non_negative CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);

COMMENT ON TABLE public.provider_menu_items IS
  'Provider-owned food menu items. Typed ordering-ready fields (price_cents, is_available).';
COMMENT ON TABLE public.provider_service_offers IS
  'Provider-owned business service offers. Typed booking-ready fields (duration_minutes, booking_url).';

COMMENT ON COLUMN public.provider_menu_items.offer_tag_id IS
  'Optional bridge to global offers vocabulary entry (public.offers.offer_id).';
COMMENT ON COLUMN public.provider_service_offers.offer_tag_id IS
  'Optional bridge to global offers vocabulary entry (public.offers.offer_id).';

-- -----------------------------------------------------
-- 2) INDEXES
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_provider_menu_items_provider_id
  ON public.provider_menu_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_menu_items_search_vector
  ON public.provider_menu_items USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_provider_menu_items_available_by_provider
  ON public.provider_menu_items(provider_id)
  WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_provider_service_offers_provider_id
  ON public.provider_service_offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_offers_search_vector
  ON public.provider_service_offers USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_provider_service_offers_available_by_provider
  ON public.provider_service_offers(provider_id)
  WHERE is_available = true;

-- RLS owner checks depend on provider_owner_id lookup.
CREATE INDEX IF NOT EXISTS idx_providers_owner_lookup
  ON public.providers(provider_owner_id)
  WHERE provider_owner_id IS NOT NULL;

-- -----------------------------------------------------
-- 2b) AUTO-UPDATE TRIGGERS
-- Keeps updated_at accurate on UPDATE, consistent with providers (migration 062)
-- and badge tables (migration 016). update_updated_at_column() is already defined.
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS trigger_provider_menu_items_updated_at ON public.provider_menu_items;
CREATE TRIGGER trigger_provider_menu_items_updated_at
  BEFORE UPDATE ON public.provider_menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_provider_service_offers_updated_at ON public.provider_service_offers;
CREATE TRIGGER trigger_provider_service_offers_updated_at
  BEFORE UPDATE ON public.provider_service_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- 3) RLS POLICIES
-- -----------------------------------------------------

ALTER TABLE public.provider_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_service_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_menu_items_public_select" ON public.provider_menu_items;
DROP POLICY IF EXISTS "provider_menu_items_owner_insert" ON public.provider_menu_items;
DROP POLICY IF EXISTS "provider_menu_items_owner_update" ON public.provider_menu_items;
DROP POLICY IF EXISTS "provider_menu_items_owner_delete" ON public.provider_menu_items;

CREATE POLICY "provider_menu_items_public_select"
  ON public.provider_menu_items
  FOR SELECT
  USING (true);

CREATE POLICY "provider_menu_items_owner_insert"
  ON public.provider_menu_items
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "provider_menu_items_owner_update"
  ON public.provider_menu_items
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "provider_menu_items_owner_delete"
  ON public.provider_menu_items
  FOR DELETE
  USING (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "provider_service_offers_public_select" ON public.provider_service_offers;
DROP POLICY IF EXISTS "provider_service_offers_owner_insert" ON public.provider_service_offers;
DROP POLICY IF EXISTS "provider_service_offers_owner_update" ON public.provider_service_offers;
DROP POLICY IF EXISTS "provider_service_offers_owner_delete" ON public.provider_service_offers;

CREATE POLICY "provider_service_offers_public_select"
  ON public.provider_service_offers
  FOR SELECT
  USING (true);

CREATE POLICY "provider_service_offers_owner_insert"
  ON public.provider_service_offers
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "provider_service_offers_owner_update"
  ON public.provider_service_offers
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "provider_service_offers_owner_delete"
  ON public.provider_service_offers
  FOR DELETE
  USING (
    provider_id IN (
      SELECT p.provider_id
      FROM public.providers p
      WHERE p.provider_owner_id = auth.uid()
    )
  );

-- -----------------------------------------------------
-- 4) SEARCH RPC
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_provider_items(
  search_query TEXT DEFAULT '',
  listing_type_filter TEXT DEFAULT NULL,
  provider_id_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  item_id UUID,
  provider_id UUID,
  item_type TEXT,
  name_de TEXT,
  name_en TEXT,
  price_cents INTEGER,
  is_available BOOLEAN,
  rank REAL
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH menu_rows AS (
    SELECT
      m.id AS item_id,
      m.provider_id,
      'menu_item'::TEXT AS item_type,
      m.name_de,
      m.name_en,
      m.price_cents,
      m.is_available,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE ts_rank(m.search_vector, plainto_tsquery('german', search_query))
      END AS rank,
      m.sort_order,
      p.listing_type::TEXT AS listing_type
    FROM public.provider_menu_items m
    JOIN public.providers p ON p.provider_id = m.provider_id
    WHERE
      m.is_available = true
      AND (
        provider_id_filter IS NULL
        OR m.provider_id = provider_id_filter
      )
      AND (
        listing_type_filter IS NULL
        OR p.listing_type::TEXT = listing_type_filter
      )
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR m.search_vector @@ plainto_tsquery('german', search_query)
      )
  ),
  service_rows AS (
    SELECT
      s.id AS item_id,
      s.provider_id,
      'service_offer'::TEXT AS item_type,
      s.name_de,
      s.name_en,
      s.price_cents,
      s.is_available,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE ts_rank(s.search_vector, plainto_tsquery('german', search_query))
      END AS rank,
      s.sort_order,
      p.listing_type::TEXT AS listing_type
    FROM public.provider_service_offers s
    JOIN public.providers p ON p.provider_id = s.provider_id
    WHERE
      s.is_available = true
      AND (
        provider_id_filter IS NULL
        OR s.provider_id = provider_id_filter
      )
      AND (
        listing_type_filter IS NULL
        OR p.listing_type::TEXT = listing_type_filter
      )
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR s.search_vector @@ plainto_tsquery('german', search_query)
      )
  )
  SELECT
    u.item_id,
    u.provider_id,
    u.item_type,
    u.name_de,
    u.name_en,
    u.price_cents,
    u.is_available,
    u.rank
  FROM (
    SELECT * FROM menu_rows
    UNION ALL
    SELECT * FROM service_rows
  ) u
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN u.sort_order END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN u.name_de END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN u.rank END DESC,
    u.name_de ASC
  LIMIT GREATEST(limit_count, 0)
  OFFSET GREATEST(offset_count, 0);
$$;

COMMENT ON FUNCTION public.search_provider_items(TEXT, TEXT, UUID, INTEGER, INTEGER) IS
  'Unified item search across provider_menu_items and provider_service_offers with listing_type/provider filters.';

-- -----------------------------------------------------
-- 5) MATERIALIZED VIEW EXTENSION
-- -----------------------------------------------------
-- Keep the existing singleton provider_stats contract and extend it
-- with total available catalog item counts.

DROP MATERIALIZED VIEW IF EXISTS public.provider_stats;

CREATE MATERIALIZED VIEW public.provider_stats AS
SELECT
  COUNT(*)::bigint AS total_providers,
  COUNT(*) FILTER (WHERE review_status = 'approved')::bigint AS approved_count,
  COUNT(*) FILTER (WHERE review_status = 'pending')::bigint AS pending_count,
  COUNT(*) FILTER (WHERE review_status = 'needs_revision')::bigint AS needs_revision_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::bigint AS new_this_month,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))), 0)::double precision AS avg_age_seconds,
  (SELECT COALESCE(COUNT(*), 0)::bigint FROM public.provider_menu_items WHERE is_available = true) AS menu_item_count,
  (SELECT COALESCE(COUNT(*), 0)::bigint FROM public.provider_service_offers WHERE is_available = true) AS service_offer_count
FROM public.providers;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_stats_singleton
  ON public.provider_stats ((true));

COMMENT ON MATERIALIZED VIEW public.provider_stats IS
  'Cached provider aggregations for dashboard; includes available menu/service item totals from provider catalog tables.';
