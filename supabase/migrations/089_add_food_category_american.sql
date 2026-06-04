-- Migration 089: Add American cuisine category for food section.
-- Requested usage: categorize burger-focused providers under American.

BEGIN;

-- Keep this idempotent across environments: insert when missing, then normalize.
INSERT INTO public.categories (
  category_id,
  name_de,
  name_en,
  description_de,
  description_en,
  applicable_section
)
SELECT
  'a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e'::uuid,
  'Amerikanisch',
  'American',
  'Burger, BBQ und klassische US-Kueche',
  'Burgers, BBQ and classic American cuisine',
  'food'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.category_id = 'a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e'::uuid
     OR lower(coalesce(c.name_en, '')) = 'american'
     OR lower(coalesce(c.name_de, '')) = 'amerikanisch'
);

UPDATE public.categories
SET
  name_de = 'Amerikanisch',
  name_en = 'American',
  description_de = 'Burger, BBQ und klassische US-Kueche',
  description_en = 'Burgers, BBQ and classic American cuisine',
  applicable_section = 'food',
  updated_at = now()
WHERE category_id = 'a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e'::uuid
   OR lower(coalesce(name_en, '')) = 'american'
   OR lower(coalesce(name_de, '')) = 'amerikanisch';

COMMIT;
