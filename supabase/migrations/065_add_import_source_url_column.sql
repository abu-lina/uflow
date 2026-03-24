-- Migration: 065_add_import_source_url_column.sql
-- Plan 058: JoinHalal Legacy Provenance Recovery
--
-- Adds import_source_url column to the providers table to persist the
-- authoritative source listing URL (e.g., JoinHalal detail page URL).
-- This enables repeatable backfills and provenance auditing.
--
-- Previously, import_source_url was computed during import but stripped
-- before DB writes because the column did not exist.
--
-- Also updates the upsert_joinhalal_providers RPC to accept and persist
-- import_source_url on both INSERT and ON CONFLICT UPDATE.
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / safe to re-run.

-- ==============================================================================
-- 1. ADD COLUMN
-- ==============================================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS import_source_url TEXT;

-- ==============================================================================
-- 2. UPDATE upsert_joinhalal_providers RPC to include import_source_url
-- ==============================================================================

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
      barakah_effects,
      import_source,
      import_source_id,
      import_source_url
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
      CASE
        WHEN elem->'barakah_effects' IS NOT NULL
             AND jsonb_typeof(elem->'barakah_effects') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(elem->'barakah_effects'))
        ELSE '{}'::TEXT[]
      END,
      elem->>'import_source',
      elem->>'import_source_id',
      elem->>'import_source_url'
    FROM jsonb_array_elements(p_providers) AS elem
    ON CONFLICT (import_source, import_source_id)
      WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL
    DO UPDATE SET
      -- Source-controlled fields ONLY — admin fields are preserved
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
      import_source_url   = EXCLUDED.import_source_url
      -- updated_at is auto-set by trigger_providers_updated_at (migration 062)
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE was_insert), 0) AS inserted_count,
    COALESCE(COUNT(*) FILTER (WHERE NOT was_insert), 0) AS updated_count
  FROM upserted;
END;
$$;
