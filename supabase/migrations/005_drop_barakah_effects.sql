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
DROP FUNCTION IF EXISTS public.get_community_services_for_provider(uuid);
CREATE FUNCTION public.get_community_services_for_provider(provider_uuid uuid)
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

-- ─── 5. Update RPC: upsert_joinhalal_providers ──────────────────────────────
-- Remove barakah_effects from INSERT column list and payload parsing.
CREATE OR REPLACE FUNCTION public.upsert_joinhalal_providers(p_providers jsonb)
RETURNS TABLE(inserted_count bigint, updated_count bigint)
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
      elem->>'import_source',
      elem->>'import_source_id',
      elem->>'import_source_url',
      'food'::listing_type_enum,
      TRUE,
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
