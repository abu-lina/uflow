-- Migration 127: Add proper unique constraint on (import_source, import_source_id)
-- Plan 225: PostgREST's onConflict requires a real unique constraint, not a
-- partial unique index. The existing partial index (idx_providers_import_source_unique)
-- enforces uniqueness where both columns are NOT NULL, but PostgREST can't use it.
--
-- In PostgreSQL, UNIQUE constraints treat NULLs as distinct, so existing
-- providers with import_source=NULL won't conflict with each other.

-- Drop the partial unique index (the constraint replaces it)
DROP INDEX IF EXISTS idx_providers_import_source_unique;

-- Add a proper unique constraint
ALTER TABLE public.providers
ADD CONSTRAINT uq_providers_import_source
UNIQUE (import_source, import_source_id);
