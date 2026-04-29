-- Migration: 062_add_import_source_columns.sql
-- Plan 052: JoinHalal Import Upsert with Unique ID
--
-- Adds import_source and import_source_id columns to the providers table
-- to enable upsert (update-or-create) during re-imports. The partial unique
-- index ensures that only rows with both columns populated participate in
-- conflict resolution — organically created providers (NULL) are unaffected.
--
-- No backfill is performed. Pre-existing imported rows retain NULL values
-- and continue to be deduplicated by the existing name+city client-side logic.
--
-- Idempotent: IF NOT EXISTS / safe to re-run.

-- ==============================================================================
-- 1. ADD COLUMNS
-- ==============================================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_source_id TEXT;

-- ==============================================================================
-- 2. PARTIAL UNIQUE INDEX (only for rows with both columns set)
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_import_source_unique
  ON public.providers (import_source, import_source_id)
  WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL;

-- ==============================================================================
-- 3. updated_at TRIGGER FOR UPDATE (providers table has no such trigger yet)
-- ==============================================================================
-- Task 4.6: Verified that no updated_at trigger exists for the providers table.
-- Adding one so that any UPDATE (including upsert) auto-refreshes updated_at.

CREATE OR REPLACE FUNCTION public.set_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_providers_updated_at ON public.providers;

CREATE TRIGGER trigger_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_providers_updated_at();
