-- =====================================================
-- FILL MISSING CATEGORIES FOR OFFERS AND NEEDS
-- =====================================================
-- This migration ensures ALL existing offers/needs have a category_id
-- before making the column NOT NULL
-- =====================================================

-- Step 1: Update offers that appear in category_suggested_offers
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

-- Step 2: Update needs that appear in category_suggested_needs
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

-- Step 3: Ensure default "Sonstiges" category exists, then assign remaining NULL values
-- We keep the well-known UUID so other environments/scripts can rely on it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8'
  ) THEN
    INSERT INTO public.categories (category_id, name, name_de, name_en)
    VALUES (
      '5e5d910d-d790-4184-a061-9cd74d0950e8',
      'Sonstiges',
      'Sonstiges',
      'Other'
    );
  END IF;
END $$;

UPDATE public.offers
SET category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8'
WHERE category_id IS NULL;

UPDATE public.needs
SET category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8'
WHERE category_id IS NULL;

-- Step 4: Verify all rows have a category_id (should return 0)
-- Uncomment to check:
-- SELECT COUNT(*) FROM public.offers WHERE category_id IS NULL;
-- SELECT COUNT(*) FROM public.needs WHERE category_id IS NULL;

-- Step 5: Now make the column NOT NULL (safe to do after all data is migrated)
ALTER TABLE public.offers ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE public.needs ALTER COLUMN category_id SET NOT NULL;

