-- Plan 116 / M-2 (Phase B — Nullable Boolean Backfills)
-- Covers: FL-7, FL-8, FL-13, FL-5, FL-9
-- Notes:
-- - Pre-flight live audit (2026-05-02T17:10Z on PROD) confirmed all target columns
--   have null_count = 0. No UPDATE backfills are needed. Migration only adds NOT NULL
--   constraints and one CHECK constraint.
-- - FL-5 (categories.applicable_section): ALREADY NOT NULL + DEFAULT 'all' on PROD.
--   Guarded DO block is a no-op but included for idempotency and documentation.
-- - FL-9 (admin_audit_logs.action): ALREADY NOT NULL. Only CHECK constraint needed.
--   Confirmed live values: provider_review_approved, provider_edit, provider_review_rejected.
-- - CS conditionals (FL-7/FL-8/FL-13 on community_services): M-5 is NOT shipping
--   in the same release, so all CS backfills are included per plan note.
-- - All SET NOT NULL operations are idempotent (no-op if already NOT NULL).
-- - Uses drift-safe guards for CHECK constraint additions.

BEGIN;

-- FL-7: Enforce NOT NULL on review_status (providers + community_services).
-- Default 'pending'::review_status already exists on both columns.
-- No NULLs exist in live data (audit 2026-05-02T17:10Z).

UPDATE public.providers
  SET review_status = 'pending'
  WHERE review_status IS NULL;

ALTER TABLE public.providers
  ALTER COLUMN review_status SET NOT NULL;

UPDATE public.community_services
  SET review_status = 'pending'
  WHERE review_status IS NULL;

ALTER TABLE public.community_services
  ALTER COLUMN review_status SET NOT NULL;

-- FL-8: Enforce NOT NULL on community_services.is_verified.
-- Default false already exists. No NULLs in live data.

UPDATE public.community_services
  SET is_verified = FALSE
  WHERE is_verified IS NULL;

ALTER TABLE public.community_services
  ALTER COLUMN is_verified SET NOT NULL;

-- FL-13: Enforce NOT NULL on show_address (providers + community_services).
-- Default true already exists on both columns. No NULLs in live data.

UPDATE public.providers
  SET show_address = TRUE
  WHERE show_address IS NULL;

ALTER TABLE public.providers
  ALTER COLUMN show_address SET NOT NULL;

UPDATE public.community_services
  SET show_address = TRUE
  WHERE show_address IS NULL;

ALTER TABLE public.community_services
  ALTER COLUMN show_address SET NOT NULL;

-- FL-5: categories.applicable_section NOT NULL + DEFAULT 'all'.
-- ALREADY enforced on PROD. This block is a no-op but kept for documentation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'applicable_section'
      AND is_nullable = 'YES'
  ) THEN
    UPDATE public.categories
      SET applicable_section = 'all'
      WHERE applicable_section IS NULL;

    ALTER TABLE public.categories
      ALTER COLUMN applicable_section SET DEFAULT 'all';

    ALTER TABLE public.categories
      ALTER COLUMN applicable_section SET NOT NULL;
  END IF;
END $$;

-- FL-9: Add CHECK constraint on admin_audit_logs.action.
-- Column is already NOT NULL. Confirmed live value set (77 rows):
--   provider_review_approved (37), provider_edit (28), provider_review_rejected (12).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_audit_logs_action_check'
      AND conrelid = 'public.admin_audit_logs'::regclass
  ) THEN
    ALTER TABLE public.admin_audit_logs
      ADD CONSTRAINT admin_audit_logs_action_check
      CHECK (action IN (
        'provider_review_approved',
        'provider_review_rejected',
        'provider_edit'
      ));
  END IF;
END $$;

COMMIT;
