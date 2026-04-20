-- =====================================================
-- PLAN 095: COMMUNITY PROJECTS + CATEGORY SECTION SCOPING
-- =====================================================
-- Adds ummah item-level catalog table (`community_projects`), section
-- scoping on `categories`, project-level search RPC, and extends
-- provider_stats with community_project_count.
--
-- Design authority: ADR-095
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
-- =====================================================

-- -----------------------------------------------------
-- 0) PRE-QA OWNERSHIP DIAGNOSTIC (M-2 MITIGATION)
-- -----------------------------------------------------
DO $$
DECLARE
  unlinked_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unlinked_count
  FROM public.community_services
  WHERE provider_id IS NULL;

  IF unlinked_count > 0 THEN
    RAISE NOTICE 'PLAN 095 diagnostic: % community_services rows have provider_id IS NULL. Link ownership before QA write-policy signoff.', unlinked_count;
  ELSE
    RAISE NOTICE 'PLAN 095 diagnostic: all community_services rows are linked to providers.';
  END IF;
END $$;

-- -----------------------------------------------------
-- 1) CATEGORIES SECTION SCOPING
-- -----------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS applicable_section TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_applicable_section_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_applicable_section_check
      CHECK (applicable_section IN ('food', 'business', 'ummah', 'all'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_applicable_section
  ON public.categories(applicable_section)
  WHERE applicable_section IS NOT NULL;

COMMENT ON COLUMN public.categories.applicable_section IS
  'Section scoping for category usage: food, business, ummah, all. NULL means legacy/unscoped.';

-- -----------------------------------------------------
-- 2) COMMUNITY PROJECTS TABLE
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_service_id UUID NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE,

  project_type TEXT NOT NULL,

  name_de TEXT NOT NULL,
  name_en TEXT,
  description_de TEXT,

  ticket_price_cents INTEGER,
  donation_goal_cents INTEGER,
  raised_cents INTEGER NOT NULL DEFAULT 0,
  max_attendees INTEGER,
  price_currency TEXT NOT NULL DEFAULT 'EUR',

  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,

  image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'german',
      COALESCE(name_de, '') || ' ' || COALESCE(name_en, '') || ' ' || COALESCE(description_de, '')
    )
  ) STORED,

  CONSTRAINT community_projects_project_type_check
    CHECK (project_type IN ('event', 'donation', 'class', 'volunteer')),
  CONSTRAINT community_projects_ticket_price_non_negative
    CHECK (ticket_price_cents IS NULL OR ticket_price_cents >= 0),
  CONSTRAINT community_projects_donation_goal_non_negative
    CHECK (donation_goal_cents IS NULL OR donation_goal_cents >= 0),
  CONSTRAINT community_projects_raised_non_negative
    CHECK (raised_cents >= 0),
  CONSTRAINT community_projects_max_attendees_positive
    CHECK (max_attendees IS NULL OR max_attendees > 0),
  CONSTRAINT community_projects_date_order_check
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE public.community_projects IS
  'Ummah item-level projects/events/campaigns under community services. Ordering-ready typed fields with full-text search support.';

-- -----------------------------------------------------
-- 3) INDEXES + TRIGGER
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_community_projects_service_id
  ON public.community_projects(community_service_id);
CREATE INDEX IF NOT EXISTS idx_community_projects_search_vector
  ON public.community_projects USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_community_projects_active_by_service
  ON public.community_projects(community_service_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_community_projects_project_type
  ON public.community_projects(project_type);

-- Supports the RLS two-hop join (community_services -> providers).
CREATE INDEX IF NOT EXISTS idx_community_services_provider_id
  ON public.community_services(provider_id)
  WHERE provider_id IS NOT NULL;

DROP TRIGGER IF EXISTS trigger_community_projects_updated_at ON public.community_projects;
CREATE TRIGGER trigger_community_projects_updated_at
  BEFORE UPDATE ON public.community_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- 4) RLS POLICIES
-- -----------------------------------------------------
ALTER TABLE public.community_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_projects_public_select" ON public.community_projects;
DROP POLICY IF EXISTS "community_projects_owner_insert" ON public.community_projects;
DROP POLICY IF EXISTS "community_projects_owner_update" ON public.community_projects;
DROP POLICY IF EXISTS "community_projects_owner_delete" ON public.community_projects;

CREATE POLICY "community_projects_public_select"
  ON public.community_projects
  FOR SELECT
  USING (true);

CREATE POLICY "community_projects_owner_insert"
  ON public.community_projects
  FOR INSERT
  WITH CHECK (
    community_service_id IN (
      SELECT cs.community_service_id
      FROM public.community_services cs
      JOIN public.providers p ON p.provider_id = cs.provider_id
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "community_projects_owner_update"
  ON public.community_projects
  FOR UPDATE
  USING (
    community_service_id IN (
      SELECT cs.community_service_id
      FROM public.community_services cs
      JOIN public.providers p ON p.provider_id = cs.provider_id
      WHERE p.provider_owner_id = auth.uid()
    )
  )
  WITH CHECK (
    community_service_id IN (
      SELECT cs.community_service_id
      FROM public.community_services cs
      JOIN public.providers p ON p.provider_id = cs.provider_id
      WHERE p.provider_owner_id = auth.uid()
    )
  );

CREATE POLICY "community_projects_owner_delete"
  ON public.community_projects
  FOR DELETE
  USING (
    community_service_id IN (
      SELECT cs.community_service_id
      FROM public.community_services cs
      JOIN public.providers p ON p.provider_id = cs.provider_id
      WHERE p.provider_owner_id = auth.uid()
    )
  );

-- -----------------------------------------------------
-- 5) SEARCH RPC
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_community_projects(
  search_query TEXT DEFAULT '',
  community_service_id_filter UUID DEFAULT NULL,
  project_type_filter TEXT DEFAULT NULL,
  active_only BOOLEAN DEFAULT true,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  project_id UUID,
  community_service_id UUID,
  project_type TEXT,
  name_de TEXT,
  name_en TEXT,
  ticket_price_cents INTEGER,
  donation_goal_cents INTEGER,
  is_active BOOLEAN,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  image_path TEXT,
  rank REAL
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT
    cp.id AS project_id,
    cp.community_service_id,
    cp.project_type,
    cp.name_de,
    cp.name_en,
    cp.ticket_price_cents,
    cp.donation_goal_cents,
    cp.is_active,
    cp.start_date,
    cp.end_date,
    cp.image_path,
    CASE
      WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
      ELSE ts_rank(cp.search_vector, plainto_tsquery('german', search_query))
    END AS rank
  FROM public.community_projects cp
  WHERE
    (
      active_only = false
      OR cp.is_active = true
    )
    AND (
      community_service_id_filter IS NULL
      OR cp.community_service_id = community_service_id_filter
    )
    AND (
      project_type_filter IS NULL
      OR cp.project_type = project_type_filter
    )
    AND (
      btrim(COALESCE(search_query, '')) = ''
      OR cp.search_vector @@ plainto_tsquery('german', search_query)
    )
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN cp.sort_order END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN cp.name_de END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN ts_rank(cp.search_vector, plainto_tsquery('german', search_query)) END DESC,
    cp.name_de ASC
  LIMIT GREATEST(limit_count, 0)
  OFFSET GREATEST(offset_count, 0);
$$;

COMMENT ON FUNCTION public.search_community_projects(TEXT, UUID, TEXT, BOOLEAN, INTEGER, INTEGER) IS
  'Full-text search across community projects with service, type, and active filters.';

-- -----------------------------------------------------
-- 6) PROVIDER_STATS MV EXTENSION (D8 OPTION A)
-- -----------------------------------------------------
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
  (SELECT COALESCE(COUNT(*), 0)::bigint FROM public.provider_service_offers WHERE is_available = true) AS service_offer_count,
  (SELECT COALESCE(COUNT(*), 0)::bigint FROM public.community_projects WHERE is_active = true) AS community_project_count
FROM public.providers;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_stats_singleton
  ON public.provider_stats ((true));

COMMENT ON MATERIALIZED VIEW public.provider_stats IS
  'Cached platform/provider aggregations; includes available menu, service, and community project totals.';
