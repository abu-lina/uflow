-- Plan 119 — M3 image enrichment schema extension
-- Adds image-enrichment metadata columns to enrichment_candidates.

BEGIN;

ALTER TABLE IF EXISTS public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS enrichment_type TEXT NOT NULL DEFAULT 'data';

ALTER TABLE IF EXISTS public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE IF EXISTS public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS source_service TEXT;

ALTER TABLE IF EXISTS public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS source_category TEXT;

ALTER TABLE IF EXISTS public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS attribution JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'enrichment_candidates_enrichment_type_check'
  ) THEN
    ALTER TABLE public.enrichment_candidates
      ADD CONSTRAINT enrichment_candidates_enrichment_type_check
      CHECK (enrichment_type IN ('data', 'image'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enrichment_candidates_type_status
  ON public.enrichment_candidates (enrichment_type, status);

COMMENT ON COLUMN public.enrichment_candidates.enrichment_type
  IS 'Type of enrichment candidate: data (Plan 065) or image (Plan 119).';

COMMENT ON COLUMN public.enrichment_candidates.image_url
  IS 'Supabase Storage URL for staged image candidates.';

COMMENT ON COLUMN public.enrichment_candidates.source_service
  IS 'Image source service (e.g., unsplash, pixabay).';

COMMENT ON COLUMN public.enrichment_candidates.source_category
  IS 'Category used for image pool lookup in Plan 119.';

COMMENT ON COLUMN public.enrichment_candidates.attribution
  IS 'Source attribution metadata (e.g., Unsplash photographer/profile/photo URL).';

COMMIT;
