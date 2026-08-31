-- Plan 156: Auto-Enrichment Schema Updates
-- Creates pending_enrichments queue table for on-creation trigger,
-- adds food_menu.image_url for menu item images,
-- and adds auto_applied_fields + source_stats to enrichment_run_logs.

-- 1. Create pending_enrichments table for on-creation trigger queue
CREATE TABLE IF NOT EXISTS public.pending_enrichments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  source TEXT,  -- specific source or null for all sources
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  run_log_id UUID REFERENCES public.enrichment_run_logs(id) ON DELETE SET NULL
);

-- Partial index for efficient queue polling
CREATE INDEX IF NOT EXISTS idx_pending_enrichments_status
  ON public.pending_enrichments(status, created_at)
  WHERE status IN ('pending', 'processing');

-- RLS: service-role only (no public access)
ALTER TABLE public.pending_enrichments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.pending_enrichments TO service_role;

COMMENT ON TABLE public.pending_enrichments IS 'Queue of provider IDs awaiting enrichment (Plan 156)';

-- 2. Add image_url to food_menu for menu item images from delivery platforms
ALTER TABLE public.food_menu
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.food_menu.image_url IS 'URL to menu item image from delivery platforms (Plan 156)';

-- 3. Add tracking columns to enrichment_run_logs for auto-apply auditing
ALTER TABLE public.enrichment_run_logs
ADD COLUMN IF NOT EXISTS auto_applied_fields JSONB;

ALTER TABLE public.enrichment_run_logs
ADD COLUMN IF NOT EXISTS source_stats JSONB;

COMMENT ON COLUMN public.enrichment_run_logs.auto_applied_fields IS 'JSON array of field names that were auto-applied (Plan 156)';
COMMENT ON COLUMN public.enrichment_run_logs.source_stats IS 'JSON object with per-source enrichment stats (Plan 156)';
