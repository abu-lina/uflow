-- Migration: 063_upsert_joinhalal_provider_rpc.sql
-- Plan 052 (QA re-fix): Safe upsert RPC for JoinHalal imports
--
-- Replaces the generic Supabase .upsert() call with a dedicated PostgreSQL
-- function that uses ON CONFLICT DO UPDATE SET with an explicit allowlist of
-- source-controlled fields. Admin/moderator-controlled fields are preserved
-- on conflict updates.
--
-- Source-controlled (updated on conflict):
--   provider_name, provider_description, category_id,
--   address_street, address_zip, address_city, address_country,
--   contact_email, contact_phone, social_website, social_instagram,
--   offers_ids
--
-- Admin-controlled (preserved on conflict):
--   review_status, review_feedback, provider_owner_id, user_created_id,
--   provider_images, show_address, needs_ids, barakah_effects
--
-- Returns insert/update counts via the xmax = 0 technique.
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.upsert_joinhalal_providers(
  p_providers JSONB
)
RETURNS TABLE(inserted_count BIGINT, updated_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle null or empty input
  IF p_providers IS NULL OR jsonb_array_length(p_providers) = 0 THEN
    inserted_count := 0;
    updated_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH upserted AS (
    INSERT INTO public.providers (
      -- All fields for INSERT (new records get full payload)
      provider_name,
      provider_description,
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
      barakah_effects,
      import_source,
      import_source_id
    )
    SELECT
      elem->>'provider_name',
      elem->>'provider_description',
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
      CASE
        WHEN elem->'barakah_effects' IS NOT NULL
             AND jsonb_typeof(elem->'barakah_effects') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(elem->'barakah_effects'))
        ELSE '{}'::TEXT[]
      END,
      elem->>'import_source',
      elem->>'import_source_id'
    FROM jsonb_array_elements(p_providers) AS elem
    ON CONFLICT (import_source, import_source_id)
      WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL
    DO UPDATE SET
      -- Source-controlled fields ONLY — admin fields are preserved
      provider_name       = EXCLUDED.provider_name,
      provider_description = EXCLUDED.provider_description,
      category_id         = EXCLUDED.category_id,
      address_street      = EXCLUDED.address_street,
      address_zip         = EXCLUDED.address_zip,
      address_city        = EXCLUDED.address_city,
      address_country     = EXCLUDED.address_country,
      contact_email       = EXCLUDED.contact_email,
      contact_phone       = EXCLUDED.contact_phone,
      social_website      = EXCLUDED.social_website,
      social_instagram    = EXCLUDED.social_instagram,
      offers_ids          = EXCLUDED.offers_ids
      -- updated_at is auto-set by trigger_providers_updated_at (migration 062)
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE was_insert), 0) AS inserted_count,
    COALESCE(COUNT(*) FILTER (WHERE NOT was_insert), 0) AS updated_count
  FROM upserted;
END;
$$;
