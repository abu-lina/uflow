-- Migration 006: Phase 4 Semantic Constraints (Plan 114 F-5)
--
-- Goals:
-- 1) Extend listing_type_enum with 'ummah'
-- 2) Backfill providers.listing_type NULL -> 'ummah'
-- 3) Normalize section-scoped booleans so existing rows are constraint-safe
-- 4) Enforce providers.listing_type NOT NULL
-- 5) Add section-scoped CHECK constraints for semantic validity

-- 1) Extend enum with idempotent guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'listing_type_enum'
      AND e.enumlabel = 'ummah'
  ) THEN
    ALTER TYPE public.listing_type_enum ADD VALUE 'ummah';
  END IF;
END
$$;

-- 2) Backfill NULL listing_type values to ummah
UPDATE public.providers
SET listing_type = 'ummah'::public.listing_type_enum
WHERE listing_type IS NULL;

-- 3) Normalize legacy rows so semantic constraints can be added safely
UPDATE public.providers
SET
  no_alcohol = FALSE,
  no_pork = FALSE,
  halal_level = NULL
WHERE listing_type <> 'food'::public.listing_type_enum
  AND (
    no_alcohol = TRUE
    OR no_pork = TRUE
    OR halal_level IS NOT NULL
  );

UPDATE public.providers
SET
  no_gambling = FALSE,
  solidarity_pricing = FALSE
WHERE listing_type <> 'business'::public.listing_type_enum
  AND (
    no_gambling = TRUE
    OR solidarity_pricing = TRUE
  );

UPDATE public.providers
SET accepts_donations = FALSE
WHERE listing_type <> 'ummah'::public.listing_type_enum
  AND accepts_donations = TRUE;

-- 4) Audit violations and fail fast before constraints
CREATE TEMP TABLE phase4_semantic_violations (
  violation_type TEXT NOT NULL,
  row_count BIGINT NOT NULL
);

INSERT INTO phase4_semantic_violations (violation_type, row_count)
SELECT 'listing_type_null', COUNT(*)
FROM public.providers
WHERE listing_type IS NULL
UNION ALL
SELECT 'food_only_violation', COUNT(*)
FROM public.providers
WHERE listing_type <> 'food'::public.listing_type_enum
  AND (no_alcohol = TRUE OR no_pork = TRUE OR halal_level IS NOT NULL)
UNION ALL
SELECT 'business_only_violation', COUNT(*)
FROM public.providers
WHERE listing_type <> 'business'::public.listing_type_enum
  AND (no_gambling = TRUE OR solidarity_pricing = TRUE)
UNION ALL
SELECT 'ummah_only_violation', COUNT(*)
FROM public.providers
WHERE listing_type <> 'ummah'::public.listing_type_enum
  AND accepts_donations = TRUE;

DO $$
DECLARE
  violation_summary JSONB;
BEGIN
  SELECT jsonb_agg(
           jsonb_build_object(
             'violation_type', violation_type,
             'row_count', row_count
           )
         )
  INTO violation_summary
  FROM phase4_semantic_violations
  WHERE row_count > 0;

  IF violation_summary IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Phase 4 semantic constraint precheck failed',
      DETAIL = violation_summary::TEXT;
  END IF;
END
$$;

-- 5) Enforce listing_type required for all providers
ALTER TABLE public.providers
  ALTER COLUMN listing_type SET NOT NULL;

-- 6) Add section-scoped semantic constraints (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'providers_listing_type_food_only_ck'
      AND conrelid = 'public.providers'::regclass
  ) THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_listing_type_food_only_ck
      CHECK (
        listing_type = 'food'::public.listing_type_enum
        OR (
          no_alcohol = FALSE
          AND no_pork = FALSE
          AND halal_level IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'providers_listing_type_business_only_ck'
      AND conrelid = 'public.providers'::regclass
  ) THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_listing_type_business_only_ck
      CHECK (
        listing_type = 'business'::public.listing_type_enum
        OR (
          no_gambling = FALSE
          AND solidarity_pricing = FALSE
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'providers_listing_type_ummah_only_ck'
      AND conrelid = 'public.providers'::regclass
  ) THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_listing_type_ummah_only_ck
      CHECK (
        listing_type = 'ummah'::public.listing_type_enum
        OR accepts_donations = FALSE
      );
  END IF;
END
$$;
