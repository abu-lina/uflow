-- Migration 007: Phase 5 — Dual-PK Consolidation, Table 1: categories
-- Plan 114 F-1 · Table order: 1 of 4 (fewest inbound FKs among remaining)
--
-- Pre-condition verification:
--   All FKs referencing `categories` already target `categories.category_id`:
--     category_suggested_needs.category_id → categories(category_id)
--     category_suggested_offers.category_id → categories(category_id)
--     community_services.category_id       → categories(category_id)
--     needs.category_id                    → categories(category_id)
--     offers.category_id                   → categories(category_id)
--     providers.category_id                → categories(category_id)
--   No RLS policy or RPC references categories.id directly.
--
-- Steps:
--   1. Drop PK constraint on `id` (implicit index dropped automatically)
--   2. Promote `category_id` to PRIMARY KEY while preserving existing UNIQUE
--      (FK-safe cutover: inbound FKs may depend on existing unique constraint)
--   3. Drop explicit btree index on `category_id` (now redundant with UNIQUE/PK)
--   4. Drop the vestigial `id` column
--
-- Rollback (before step 5 executes):
--   ALTER TABLE public.categories ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
--   ALTER TABLE public.categories DROP CONSTRAINT categories_pkey;
--   ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
--   CREATE INDEX IF NOT EXISTS idx_categories_category_id ON public.categories USING btree (category_id);
-- ---------------------------------------------------------------------------

BEGIN;

-- Step 1: Drop PK on vestigial id column
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_pkey;

-- Step 2: Promote category_id to PRIMARY KEY
--         Keep categories_category_id_key for FK dependency safety.
ALTER TABLE public.categories
  ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);

-- Step 3: Drop now-redundant explicit btree index on category_id
DROP INDEX IF EXISTS public.idx_categories_category_id;

-- Step 4: Drop vestigial id column (point of no return for this table)
ALTER TABLE public.categories
  DROP COLUMN IF EXISTS id;

COMMIT;
