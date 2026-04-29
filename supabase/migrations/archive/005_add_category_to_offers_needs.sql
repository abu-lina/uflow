-- =====================================================
-- ADD CATEGORY TO OFFERS AND NEEDS
-- =====================================================
-- This migration adds category_id to offers and needs tables
-- to ensure every offer/need is connected to at least one category
--
-- Model: Many-to-One relationship (each offer/need has one primary category)
-- Additional categories can be added via category_suggested_offers/needs tables
-- =====================================================

-- Add category_id to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(category_id) ON DELETE SET NULL;

-- Add category_id to needs table
ALTER TABLE public.needs 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(category_id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_category_id ON public.offers(category_id);
CREATE INDEX IF NOT EXISTS idx_needs_category_id ON public.needs(category_id);

-- Add comments
COMMENT ON COLUMN public.offers.category_id IS 'Primary category for this offer. Used for categorization and filtering.';
COMMENT ON COLUMN public.needs.category_id IS 'Primary category for this need. Used for categorization and filtering.';

-- =====================================================
-- MIGRATE EXISTING DATA
-- =====================================================
-- For existing offers/needs that don't have a category:
-- 1. Try to find a category from category_suggested_offers/needs
-- 2. If no suggestion exists, assign to a default "General" category
--    (or leave NULL for manual assignment)

-- Update offers that appear in category_suggested_offers
UPDATE public.offers o
SET category_id = (
  SELECT cso.category_id 
  FROM public.category_suggested_offers cso
  WHERE cso.offer_id = o.offer_id
  LIMIT 1
)
WHERE o.category_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.category_suggested_offers cso 
  WHERE cso.offer_id = o.offer_id
);

-- Update needs that appear in category_suggested_needs
UPDATE public.needs n
SET category_id = (
  SELECT csn.category_id 
  FROM public.category_suggested_needs csn
  WHERE csn.need_id = n.need_id
  LIMIT 1
)
WHERE n.category_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.category_suggested_needs csn 
  WHERE csn.need_id = n.need_id
);

-- =====================================================
-- NOTE: DO NOT MAKE NOT NULL HERE
-- =====================================================
-- After running this migration, run migration 006_fill_missing_categories.sql
-- to assign categories to all existing rows, then set NOT NULL constraint
-- 
-- Migration 006 will:
-- 1. Assign categories from suggestion tables
-- 2. Create/find a default "General" category
-- 3. Assign default category to remaining NULL values
-- 4. Finally set NOT NULL constraint

-- =====================================================
-- UPDATE RLS POLICIES (if needed)
-- =====================================================
-- Existing RLS policies should still work, but verify they allow
-- authenticated users to set category_id when creating offers/needs

