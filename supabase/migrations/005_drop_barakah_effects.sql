-- Migration 005: Drop barakah_effects TEXT[] columns (Plan 114 Phase 2 — F-3)
--
-- The barakah_effects TEXT[] column was a triple-source incoherence (F-3 in the
-- architecture review). Three independent systems encoded overlapping data:
--   1. barakah_effects TEXT[] — free-form tags written at create time
--   2. Boolean columns (muslim_owned, family_friendly, etc.) — backfilled by
--      migration 067 from barakah_effects; now the authoritative search filter source
--   3. provider_badges — trust/endorsement system
--
-- Resolution: Boolean columns are the sole source of truth for filter attributes.
-- barakah_effects is dropped from both providers and community_services tables.
--
-- Affected:  providers.barakah_effects, community_services.barakah_effects,
--            idx_providers_barakah_effects (GIN index),
--            get_community_services_for_provider() RPC signature and body

-- ─── 1. Drop GIN index on providers.barakah_effects ─────────────────────────
DROP INDEX IF EXISTS public.idx_providers_barakah_effects;

-- ─── 2. Drop column from providers ──────────────────────────────────────────
ALTER TABLE public.providers
  DROP COLUMN IF EXISTS barakah_effects;

-- ─── 3. Drop column from community_services ──────────────────────────────────
ALTER TABLE public.community_services
  DROP COLUMN IF EXISTS barakah_effects;

-- ─── 4. Update RPC: get_community_services_for_provider ─────────────────────
-- Remove barakah_effects from RETURNS TABLE and SELECT body.
CREATE OR REPLACE FUNCTION public.get_community_services_for_provider(provider_uuid uuid)
RETURNS TABLE(
  community_service_id uuid,
  community_service_name text,
  community_service_description text,
  community_service_images text[],
  donation_count integer,
  category_name_de text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.community_service_id,
    cs.community_service_name,
    cs.community_service_description,
    cs.community_service_images,
    cs.donation_count,
    c.name_de AS category_name_de
  FROM public.provider_community_services pcs
  JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
  LEFT JOIN public.categories c ON cs.category_id = c.category_id
  WHERE pcs.provider_id = provider_uuid
    AND cs.review_status = 'approved'
  ORDER BY cs.community_service_name;
END;
$$;

COMMENT ON FUNCTION public.get_community_services_for_provider(uuid) IS
  'Returns all community services supported by a specific provider (Plan 114 Phase 2: barakah_effects removed)';
