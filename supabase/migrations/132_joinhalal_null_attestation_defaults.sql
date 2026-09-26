-- ============================================================
-- Migration: upsert_joinhalal_providers — NULL tri-state defaults
-- Date: 2026-09-08
-- Problem: Migration 091's version of upsert_joinhalal_providers
--   writes no_alcohol with COALESCE(..., true) and no_pork with
--   COALESCE(..., false) when the payload omits them, and never
--   writes no_gambling at all. Under the tri-state semantics from
--   migration 129, false means "submitter declared non-compliant"
--   and true means "submitter attested compliant". An import with
--   no information must write NULL (unknown) instead of minting
--   either claim. A free bronze tier / a spurious denial derived
--   from an import default is an unearned halal signal (#415).
-- Change: verbatim copy of the 091 function except the
--   upsert_food CTE casts the payload values directly (NULL when
--   absent) and also writes no_gambling (column exists since
--   migration 092).
-- Note: this changes defaults for FUTURE imports only. Existing
--   rows keep whatever the old defaults wrote; any backfill is a
--   separate, deliberate operation.
-- ============================================================

BEGIN;
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
  WITH payload AS (
    SELECT
      elem,
      elem->>'import_source' AS import_source,
      elem->>'import_source_id' AS import_source_id
    FROM jsonb_array_elements(p_providers) AS elem
  ),
  upserted AS (
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
      review_status,
      user_created_id,
      provider_owner_id,
      show_address,
      import_source,
      import_source_id,
      import_source_url,
      listing_type
    )
    SELECT
      p.elem->>'provider_name',
      (p.elem->>'category_id')::UUID,
      p.elem->>'address_street',
      p.elem->>'address_zip',
      p.elem->>'address_city',
      p.elem->>'address_country',
      p.elem->>'contact_email',
      p.elem->>'contact_phone',
      p.elem->>'social_website',
      p.elem->>'social_instagram',
      COALESCE((p.elem->>'review_status')::review_status, 'pending'),
      (p.elem->>'user_created_id')::UUID,
      (p.elem->>'provider_owner_id')::UUID,
      COALESCE((p.elem->>'show_address')::BOOLEAN, true),
      p.import_source,
      p.import_source_id,
      p.elem->>'import_source_url',
      'food'::listing_type_enum
    FROM payload p
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
      import_source_url   = EXCLUDED.import_source_url,
      listing_type        = EXCLUDED.listing_type
    RETURNING provider_id, import_source, import_source_id, (xmax = 0) AS was_insert
  ),
  upsert_food AS (
    INSERT INTO public.food_providers (
      provider_id,
      verification_method,
      has_certificate,
      no_alcohol,
      no_pork,
      no_gambling
    )
    SELECT
      u.provider_id,
      CASE
        WHEN COALESCE(p.elem->>'verification_method', 'online') = 'onsite' THEN 'onsite'
        ELSE 'online'
      END,
      COALESCE((p.elem->>'has_certificate')::BOOLEAN, false),
      -- Tri-state (#415): NULL when the import has no information.
      -- No COALESCE defaults: true would mint an unearned attestation,
      -- false would record a denial nobody made.
      (p.elem->>'no_alcohol')::BOOLEAN,
      (p.elem->>'no_pork')::BOOLEAN,
      (p.elem->>'no_gambling')::BOOLEAN
    FROM upserted u
    JOIN payload p
      ON p.import_source = u.import_source
     AND p.import_source_id = u.import_source_id
    ON CONFLICT (provider_id)
    DO UPDATE SET
      verification_method = EXCLUDED.verification_method,
      has_certificate = EXCLUDED.has_certificate,
      no_alcohol = EXCLUDED.no_alcohol,
      no_pork = EXCLUDED.no_pork,
      no_gambling = EXCLUDED.no_gambling,
      updated_at = now()
  ),
  replace_offers AS (
    DELETE FROM public.provider_offers po
    USING upserted u
    WHERE po.provider_id = u.provider_id
    RETURNING po.provider_id
  ),
  insert_offers AS (
    INSERT INTO public.provider_offers (provider_id, offer_id)
    SELECT DISTINCT
      u.provider_id,
      (jsonb_array_elements_text(p.elem->'offer_ids'))::UUID
    FROM upserted u
    JOIN payload p
      ON p.import_source = u.import_source
     AND p.import_source_id = u.import_source_id
    WHERE p.elem->'offer_ids' IS NOT NULL
      AND jsonb_typeof(p.elem->'offer_ids') = 'array'
    ON CONFLICT (provider_id, offer_id) DO NOTHING
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE u.was_insert), 0) AS inserted_count,
    COALESCE(COUNT(*) FILTER (WHERE NOT u.was_insert), 0) AS updated_count
  FROM upserted u;
END;
$$;

COMMENT ON FUNCTION public.upsert_joinhalal_providers(jsonb) IS
  'Upserts JoinHalal providers using verification_method + has_certificate (Plan 135). Attestation columns default to NULL (unknown) when the import has no information (Plan 255).';

COMMIT;
