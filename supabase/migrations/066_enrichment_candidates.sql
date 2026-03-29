-- Migration: 066_enrichment_candidates.sql
-- Plan 065: Automated Provider Enrichment Pipeline — Milestone 1 (Schema Foundation)
--
-- Creates the enrichment_candidates staging table, adds last_enriched_at and
-- enrichment_eligible columns to providers, and creates the enrichment_run_logs table.
--
-- Design notes (ADR-007):
--   All automated enrichment proposals stage in enrichment_candidates as pending
--   records before any write to providers. Admin approval is required for conflicts.
--
-- Idempotent: IF NOT EXISTS / safe to re-run.

-- ==============================================================================
-- 1. ENRICHMENT STATUS ENUM
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrichment_status') THEN
    CREATE TYPE enrichment_status AS ENUM ('pending', 'approved', 'rejected', 'applied');
  END IF;
END $$;

-- ==============================================================================
-- 2. ENRICHMENT CANDIDATES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.enrichment_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  source TEXT NOT NULL,               -- e.g. 'joinhalal', 'lieferando', 'tripadvisor'
  source_url TEXT,                    -- URL that was fetched to produce this candidate
  field_name TEXT NOT NULL,           -- e.g. 'offers_ids', 'contact_phone', 'social_website'
  proposed_value JSONB NOT NULL,      -- the new value being proposed
  current_value JSONB,                -- snapshot of the current value at enrichment time
  status enrichment_status NOT NULL DEFAULT 'pending',
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  run_id UUID,                        -- links to enrichment_run_logs.id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES on enrichment_candidates
-- ==============================================================================

-- Admin review surface: list pending candidates for a provider
CREATE INDEX IF NOT EXISTS idx_enrichment_candidates_provider_status
  ON public.enrichment_candidates (provider_id, status);

-- Filter by source
CREATE INDEX IF NOT EXISTS idx_enrichment_candidates_source
  ON public.enrichment_candidates (source);

-- Dedup: prevent duplicate pending candidates for same provider+field+source
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrichment_candidates_dedup
  ON public.enrichment_candidates (provider_id, field_name, source)
  WHERE status = 'pending';

-- ==============================================================================
-- 4. RLS on enrichment_candidates
-- ==============================================================================

ALTER TABLE public.enrichment_candidates ENABLE ROW LEVEL SECURITY;

-- Admins and moderators can read all candidates
CREATE POLICY "Admins can read enrichment candidates"
  ON public.enrichment_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

-- Admins and moderators can update candidates (approve/reject)
CREATE POLICY "Admins can update enrichment candidates"
  ON public.enrichment_candidates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

-- Service role inserts (bypasses RLS). No INSERT policy for regular users.
-- The enrichment runner uses service-role client.

-- No SELECT/INSERT/UPDATE/DELETE for anon or authenticated (non-admin) users.
-- RLS is enabled with no permissive policies for these roles, so access is denied by default.

-- ==============================================================================
-- 5. ADD COLUMNS TO PROVIDERS
-- ==============================================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS enrichment_eligible BOOLEAN NOT NULL DEFAULT true;

-- ==============================================================================
-- 6. ENRICHMENT RUN LOGS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.enrichment_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  triggered_by TEXT NOT NULL,         -- 'pg_cron', 'admin_manual', 'cli_dry_run', 'cli_write'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  providers_selected INT NOT NULL DEFAULT 0,
  providers_processed INT NOT NULL DEFAULT 0,
  candidates_created INT NOT NULL DEFAULT 0,
  unchanged_count INT NOT NULL DEFAULT 0,
  failure_count INT NOT NULL DEFAULT 0,
  circuit_breaker_triggered BOOLEAN NOT NULL DEFAULT false,
  debug_payload JSONB,                -- opt-in debug telemetry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service role writes to run logs. No RLS needed for regular users (admin read via API).
ALTER TABLE public.enrichment_run_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read run logs
CREATE POLICY "Admins can read enrichment run logs"
  ON public.enrichment_run_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

-- ==============================================================================
-- 7. COMMENTS
-- ==============================================================================

COMMENT ON TABLE public.enrichment_candidates IS
  'Staging inbox for automated provider enrichment proposals. Admin review required before application to providers (ADR-007).';

COMMENT ON TABLE public.enrichment_run_logs IS
  'Telemetry for enrichment pipeline runs. One row per invocation, whether manual or scheduled.';

COMMENT ON COLUMN public.providers.last_enriched_at IS
  'Timestamp of the most recent enrichment run that processed this provider.';

COMMENT ON COLUMN public.providers.enrichment_eligible IS
  'When false, this provider is excluded from automated enrichment runs.';
