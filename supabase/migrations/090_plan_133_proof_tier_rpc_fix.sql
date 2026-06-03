BEGIN;

-- Plan 133: rename unused halal_level to proof_tier and fix stale JoinHalal upsert RPC.

ALTER TABLE public.food_providers
  RENAME COLUMN halal_level TO proof_tier;

ALTER TABLE public.store_providers
  ADD COLUMN IF NOT EXISTS proof_tier SMALLINT;

ALTER TABLE public.food_providers
  DROP CONSTRAINT IF EXISTS chk_food_proof_tier;
ALTER TABLE public.food_providers
  ADD CONSTRAINT chk_food_proof_tier
  CHECK (proof_tier IS NULL OR proof_tier BETWEEN 1 AND 3);

ALTER TABLE public.store_providers
  DROP CONSTRAINT IF EXISTS chk_store_proof_tier;
ALTER TABLE public.store_providers
  ADD CONSTRAINT chk_store_proof_tier
  CHECK (proof_tier IS NULL OR proof_tier BETWEEN 1 AND 3);

COMMENT ON COLUMN public.food_providers.proof_tier IS
  'Verification depth: 1=online, 2=personal visit, 3=certified. NULL=pending.';
COMMENT ON COLUMN public.store_providers.proof_tier IS
  'Verification depth: 1=online, 2=personal visit, 3=certified. NULL=pending.';

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
    INSERT INTO public.food_providers (provider_id, proof_tier, no_alcohol, no_pork)
    SELECT
      u.provider_id,
      COALESCE((p.elem->>'proof_tier')::SMALLINT, 1),
      COALESCE((p.elem->>'no_alcohol')::BOOLEAN, true),
      COALESCE((p.elem->>'no_pork')::BOOLEAN, false)
    FROM upserted u
    JOIN payload p
      ON p.import_source = u.import_source
     AND p.import_source_id = u.import_source_id
    ON CONFLICT (provider_id)
    DO UPDATE SET
      proof_tier = EXCLUDED.proof_tier,
      no_alcohol = EXCLUDED.no_alcohol,
      no_pork = EXCLUDED.no_pork,
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
  'Upserts JoinHalal providers into providers + food_providers, then syncs provider_offers junction rows (Plan 133).';

COMMIT;
