-- Plan 051: Seed missing food offers from JoinHalal Speisen vocabulary.
--
-- Analysis 051 identified 24 unique Speisen values across 13 sampled pages.
-- Only 3/24 (Burger, Döner, Pommes) already exist in the offers catalog.
-- This migration inserts the remaining 21 food terms under the
-- "Essen & Trinken" category to enable high-coverage deterministic matching.
--
-- Idempotent behavior:
-- 1) Resolves category by fixed UUID or common localized names.
-- 2) Creates the category if it still doesn't exist.
-- 3) Uses ON CONFLICT (name_de) DO NOTHING for offers.

WITH resolved_category AS (
  SELECT c.category_id
  FROM public.categories c
  WHERE c.category_id = '20c10efe-404b-4a39-bb81-5089a0332d78'
  UNION ALL
  SELECT c.category_id
  FROM public.categories c
  WHERE lower(coalesce(c.name_de, '')) IN ('essen & trinken', 'essen und trinken')
     OR lower(coalesce(c.name_en, '')) IN ('food & drink', 'food and drink')
  LIMIT 1
),
ensured_category AS (
  INSERT INTO public.categories (category_id, name, name_de, name_en, created_at, updated_at)
  SELECT
    '20c10efe-404b-4a39-bb81-5089a0332d78'::uuid,
    'Essen & Trinken',
    'Essen & Trinken',
    'Food & Drink',
    now(),
    now()
  WHERE NOT EXISTS (SELECT 1 FROM resolved_category)
  ON CONFLICT (category_id) DO NOTHING
  RETURNING category_id
),
target_category AS (
  SELECT category_id FROM resolved_category
  UNION ALL
  SELECT category_id FROM ensured_category
  LIMIT 1
)
INSERT INTO public.offers (name_de, category_id)
SELECT v.name_de, tc.category_id
FROM (
  VALUES
    ('Adana'),
    ('Bowl'),
    ('Chicken'),
    ('Dessert'),
    ('Falafel'),
    ('Fisch'),
    ('Grill'),
    ('Hot Dog'),
    ('Köfte'),
    ('Lamm'),
    ('Lokma'),
    ('Manti'),
    ('Pasta'),
    ('Reis'),
    ('Salat'),
    ('Sandwich'),
    ('Steak'),
    ('Sucuk'),
    ('Suppe'),
    ('Waffel'),
    ('Wraps')
) AS v(name_de)
CROSS JOIN target_category tc
ON CONFLICT (name_de) DO NOTHING;
