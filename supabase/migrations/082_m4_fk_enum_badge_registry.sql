-- =============================================================================
-- Migration 082: M-4 — FK Integrity, task_status Enum, Badge Attribute Registry
-- Plan: PLAN-116  Origin: 118  UUID: e7a3f1c9
-- Findings: FL-4, FL-11, FL-10, FL-23
-- =============================================================================
-- IMPORTANT: Apply atomically. Parts are interdependent:
--   FL-23 trigger rewrite MUST follow badge_types column additions.
--   FL-23 fixes a live regression: sync_provider_badge_to_boolean still
--   references `accepts_donations` (renamed to `makes_donations` in M-3).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- FL-4: Resolve NOT NULL + ON DELETE SET NULL logical contradiction on
--       needs.category_id and offers.category_id.
--
-- Current state:  column is NOT NULL, FK is ON DELETE SET NULL
-- Problem:        if a category is deleted, PG tries to SET NULL on a NOT NULL
--                 column → constraint violation at runtime (silent bug until
--                 a category delete is attempted).
-- Decision:       ON DELETE RESTRICT — categories cannot be deleted while any
--                 need or offer references them.  Data audit: 0 NULL values
--                 in 62 needs / 169 offers; NOT NULL semantics correct.
-- ---------------------------------------------------------------------------

-- needs.category_id
ALTER TABLE public.needs
  DROP CONSTRAINT IF EXISTS needs_category_id_fkey;

ALTER TABLE public.needs
  ADD CONSTRAINT needs_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(category_id)
  ON DELETE RESTRICT;

-- offers.category_id
ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_category_id_fkey;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(category_id)
  ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- FL-11: Change providers.category_id FK to ON DELETE SET NULL.
--
-- Current state:  FK has no explicit ON DELETE clause (defaults to NO ACTION).
-- providers.category_id is already nullable (pre-existing).
-- Fix:            providers may exist without a category; deleting a category
--                 should orphan the provider record safely (set to NULL).
-- ---------------------------------------------------------------------------

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_category_id_fkey;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(category_id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- FL-10: Migrate provider_outreach_tasks.task_status from TEXT + CHECK to enum.
--
-- Current state:  TEXT NOT NULL DEFAULT 'pending' with CHECK
--                 (task_status = ANY (ARRAY['pending','in_progress',
--                  'completed','cancelled']))
-- Table is empty (0 rows) — no data migration needed.
-- Step order:  CREATE TYPE → DROP CHECK → DROP DEFAULT → DROP COLUMN →
--              ADD COLUMN with enum type + default.
-- Note: ALTER COLUMN TYPE ... USING <text>::<enum> fails in some Supabase
-- environments with "operator does not exist: task_status_enum = text"
-- even when the constraint/default are pre-dropped.  For empty tables,
-- DROP/ADD is equivalent and avoids the cast-operator issue.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_enum' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.task_status_enum AS ENUM (
      'pending',
      'in_progress',
      'completed',
      'cancelled'
    );
  END IF;
END;
$$;

ALTER TABLE public.provider_outreach_tasks
  DROP CONSTRAINT IF EXISTS provider_outreach_tasks_task_status_check;

ALTER TABLE public.provider_outreach_tasks
  ALTER COLUMN task_status DROP DEFAULT;

ALTER TABLE public.provider_outreach_tasks
  DROP COLUMN task_status;

ALTER TABLE public.provider_outreach_tasks
  ADD COLUMN task_status public.task_status_enum NOT NULL DEFAULT 'pending'::public.task_status_enum;

-- ---------------------------------------------------------------------------
-- FL-23: Unify badge attribute registry.
--
-- (a) Add 3 metadata columns to badge_types.
-- (b) UPDATE all existing 7 badge_types rows with attribute_category +
--     provider_column_name + is_filterable.
-- (c) INSERT 6 new badge_type rows for boolean provider columns not yet
--     represented (children_friendly, economic_solidarity, has_parking,
--     no_alcohol, no_gambling, no_pork).
-- (d) Rewrite sync_provider_badge_to_boolean() trigger to be data-driven.
--     This ALSO fixes the live regression: old trigger body referenced
--     `accepts_donations` (broken since M-3 rename to `makes_donations`).
--
-- After this migration, adding a new boolean attribute requires only:
--   1 INSERT into badge_types (with provider_column_name set)
--   1 ALTER TABLE providers ADD COLUMN <name> BOOLEAN ...
--   No trigger rewrite needed.
-- ---------------------------------------------------------------------------

-- (a) Add metadata columns to badge_types
ALTER TABLE public.badge_types
  ADD COLUMN IF NOT EXISTS attribute_category TEXT
    CHECK (attribute_category IN ('trust', 'amenity'));

ALTER TABLE public.badge_types
  ADD COLUMN IF NOT EXISTS provider_column_name TEXT;

ALTER TABLE public.badge_types
  ADD COLUMN IF NOT EXISTS is_filterable BOOLEAN NOT NULL DEFAULT false;

-- (b) UPDATE existing badge_types with correct metadata

-- COMMUNITY_ACTIVE: trust signal (community engagement), no direct boolean column
UPDATE public.badge_types SET
  attribute_category    = 'trust',
  provider_column_name  = NULL,
  is_filterable         = false
WHERE badge_key = 'COMMUNITY_ACTIVE';

-- FAMILY_FRIENDLY: amenity → family_friendly boolean
UPDATE public.badge_types SET
  attribute_category    = 'amenity',
  provider_column_name  = 'family_friendly',
  is_filterable         = true
WHERE badge_key = 'FAMILY_FRIENDLY';

-- HALAL: trust signal (halal_level is numeric, not a simple boolean)
UPDATE public.badge_types SET
  attribute_category    = 'trust',
  provider_column_name  = NULL,
  is_filterable         = false
WHERE badge_key = 'HALAL';

-- MUSLIM_OWNED: trust → muslim_owned boolean
UPDATE public.badge_types SET
  attribute_category    = 'trust',
  provider_column_name  = 'muslim_owned',
  is_filterable         = true
WHERE badge_key = 'MUSLIM_OWNED';

-- PRAYER_FRIENDLY: amenity → has_prayer_space boolean
UPDATE public.badge_types SET
  attribute_category    = 'amenity',
  provider_column_name  = 'has_prayer_space',
  is_filterable         = true
WHERE badge_key = 'PRAYER_FRIENDLY';

-- SUPPORTS_SADAQAH: trust → makes_donations boolean (was accepts_donations before M-3)
UPDATE public.badge_types SET
  attribute_category    = 'trust',
  provider_column_name  = 'makes_donations',
  is_filterable         = true
WHERE badge_key = 'SUPPORTS_SADAQAH';

-- WOMEN_FRIENDLY: amenity → women_friendly boolean
UPDATE public.badge_types SET
  attribute_category    = 'amenity',
  provider_column_name  = 'women_friendly',
  is_filterable         = true
WHERE badge_key = 'WOMEN_FRIENDLY';

-- (c) INSERT 6 new badge_types for remaining filterable boolean columns
INSERT INTO public.badge_types (badge_key, labels, icon_name, is_active, attribute_category, provider_column_name, is_filterable)
SELECT badge_key, labels, icon_name, is_active, attribute_category, provider_column_name, is_filterable
FROM (VALUES
  (
    'CHILDREN_FRIENDLY',
    '{"de": "Kinderfreundlich", "en": "Children Friendly"}'::jsonb,
    'children',
    true,
    'amenity',
    'children_friendly',
    true
  ),
  (
    'ECONOMIC_SOLIDARITY',
    '{"de": "Wirtschaftliche Solidarität", "en": "Economic Solidarity"}'::jsonb,
    'solidarity',
    true,
    'trust',
    'economic_solidarity',
    true
  ),
  (
    'HAS_PARKING',
    '{"de": "Parkplatz vorhanden", "en": "Parking Available"}'::jsonb,
    'parking',
    true,
    'amenity',
    'has_parking',
    true
  ),
  (
    'NO_ALCOHOL',
    '{"de": "Alkoholfrei", "en": "No Alcohol"}'::jsonb,
    'no-alcohol',
    true,
    'amenity',
    'no_alcohol',
    true
  ),
  (
    'NO_GAMBLING',
    '{"de": "Kein Glücksspiel", "en": "No Gambling"}'::jsonb,
    'no-gambling',
    true,
    'amenity',
    'no_gambling',
    true
  ),
  (
    'NO_PORK',
    '{"de": "Kein Schweinefleisch", "en": "No Pork"}'::jsonb,
    'no-pork',
    true,
    'amenity',
    'no_pork',
    true
  )
) AS v(badge_key, labels, icon_name, is_active, attribute_category, provider_column_name, is_filterable)
WHERE NOT EXISTS (
  SELECT 1 FROM public.badge_types bt WHERE bt.badge_key = v.badge_key
);

-- (d) Rewrite sync_provider_badge_to_boolean() as data-driven.
--     Replaces hardcoded CASE v_badge_key WHEN 'MUSLIM_OWNED' THEN ... with
--     a generic EXECUTE format('%I', v_col_name) lookup.
--     This eliminates the stale `accepts_donations` reference from the old body.
CREATE OR REPLACE FUNCTION public.sync_provider_badge_to_boolean()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider_id   uuid;
  v_badge_type_id uuid;
  v_col_name      text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_provider_id   := NEW.provider_id;
    v_badge_type_id := NEW.badge_type_id;
  ELSE
    v_provider_id   := OLD.provider_id;
    v_badge_type_id := OLD.badge_type_id;
  END IF;

  -- Provider booleans only exist on public.providers
  IF v_provider_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Look up mapped boolean column from badge_types registry
  SELECT bt.provider_column_name
  INTO   v_col_name
  FROM   public.badge_types bt
  WHERE  bt.id = v_badge_type_id;

  -- No column mapping → nothing to sync (e.g. COMMUNITY_ACTIVE, HALAL)
  IF v_col_name IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    EXECUTE format(
      'UPDATE public.providers SET %I = TRUE WHERE provider_id = $1',
      v_col_name
    ) USING v_provider_id;

    RETURN NEW;
  END IF;

  -- DELETE path: only flip to FALSE if this was the last badge of this type
  IF NOT EXISTS (
    SELECT 1
    FROM   public.provider_badges pb
    WHERE  pb.provider_id    = v_provider_id
      AND  pb.badge_type_id  = v_badge_type_id
  ) THEN
    EXECUTE format(
      'UPDATE public.providers SET %I = FALSE WHERE provider_id = $1',
      v_col_name
    ) USING v_provider_id;
  END IF;

  RETURN OLD;
END;
$$;

COMMIT;
