-- Plan 147: Add "Lebensmittel" (Groceries) category for store section.
-- YOLLA and other grocery providers will use this to list pantry/daily essentials.

BEGIN;

INSERT INTO public.categories (
  category_id,
  name_de,
  name_en,
  description_de,
  description_en,
  applicable_section
)
SELECT
  '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid,
  'Lebensmittel',
  'Groceries',
  'Halal-Lebensmittel und Vorräte für die wöchentliche Versorgung',
  'Halal groceries and pantry essentials for your weekly needs',
  'store'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid
     OR lower(coalesce(c.name_en, '')) = 'groceries'
     OR lower(coalesce(c.name_de, '')) = 'lebensmittel'
);

UPDATE public.categories
SET
  name_de = 'Lebensmittel',
  name_en = 'Groceries',
  description_de = 'Halal-Lebensmittel und Vorräte für die wöchentliche Versorgung',
  description_en = 'Halal groceries and pantry essentials for your weekly needs',
  applicable_section = 'store',
  updated_at = now()
WHERE category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid
   OR lower(coalesce(name_en, '')) = 'groceries'
   OR lower(coalesce(name_de, '')) = 'lebensmittel';

COMMIT;
