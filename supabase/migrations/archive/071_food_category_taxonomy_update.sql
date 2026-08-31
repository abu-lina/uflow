-- =====================================================
-- PLAN: FOOD CATEGORY TAXONOMY UPDATE
-- =====================================================
-- Cleans up dish-type categories (granular dishes belong in
-- offers/needs vocabulary, not provider categories), refines
-- existing cuisine region labels, and adds missing cuisine
-- regions to the food category taxonomy.
--
-- FK safety: providers.category_id references categories(category_id)
-- with ON DELETE RESTRICT (default). Affected providers are
-- re-categorised to NULL before deletion so the DELETE succeeds.
-- Operators should reclassify those providers via the admin UI.
--
-- community_services.category_id → ON DELETE SET NULL (safe)
-- offers.category_id             → ON DELETE SET NULL (safe)
-- needs.category_id              → ON DELETE SET NULL (safe)
-- category_suggestions.*         → ON DELETE CASCADE  (safe)
-- =====================================================

BEGIN;

-- Ensure category metadata columns exist before this migration writes/reads them.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description_de TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS category_images JSONB,
  ADD COLUMN IF NOT EXISTS applicable_to TEXT[];

-- ─────────────────────────────────────────────────────────────
-- 0. NULL-OUT providers referencing the categories to be deleted
--    so the FK RESTRICT constraint does not block the DELETE.
-- ─────────────────────────────────────────────────────────────
UPDATE public.providers
SET category_id = NULL,
    updated_at  = now()
WHERE category_id IN (
  '8399d525-2263-4a22-bad6-8bb43a4a1a36',
  '8dd4774d-b97f-416f-bcb5-6104fd6734c3',
  '8a1a1410-363f-4063-81cb-f324e2064038',
  'd47cdbd9-dbe6-421c-b7cb-8e1ab8468de5',
  '0d5e2e77-bd48-4aa1-acd3-c1fc6ab8d61a',
  '448729a5-021b-4c4a-9632-fc2e2faf5d16',
  '8968e2d1-191c-4a1c-a02d-d62d33d744cb',
  'e719517b-c75a-4aa1-935a-21913543acdd',
  '0bc5c3c7-6da9-4d92-a4e8-68a1f63e8f2c',
  '9713c277-5c71-4ad9-9356-615ccc68ae03',
  '1431d4ed-f4aa-462a-a303-3367b6a58273',
  'b3861b62-4717-457c-8b01-d006fc879bcb',
  'b4129393-89dd-466d-ae0b-667cf04cdbad',
  'a2598af1-841b-47e2-bcf8-b5bd785d5517',
  '15d79015-9779-4b3f-8421-ab59f242c5e7',
  '73087a33-6251-4fed-869c-2b59a09b0c29',
  'e0239342-6c01-4d09-853d-626c734b075d',
  'd3fe2f2a-aa91-4d31-9e34-5216f9c0043f',
  '8791b4f1-8401-4c45-a5bd-4490da6bc874',
  'a611933c-ae38-44b8-a9ca-8613eb1b1d08',
  '93a4aab1-4143-4424-9616-8b3002a6b43e'
);

-- ─────────────────────────────────────────────────────────────
-- 1. DELETE dish-type food categories
--    (granular dish concepts belong in offers vocabulary)
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.categories
WHERE category_id IN (
  '8399d525-2263-4a22-bad6-8bb43a4a1a36',
  '8dd4774d-b97f-416f-bcb5-6104fd6734c3',
  '8a1a1410-363f-4063-81cb-f324e2064038',
  'd47cdbd9-dbe6-421c-b7cb-8e1ab8468de5',
  '0d5e2e77-bd48-4aa1-acd3-c1fc6ab8d61a',
  '448729a5-021b-4c4a-9632-fc2e2faf5d16',
  '8968e2d1-191c-4a1c-a02d-d62d33d744cb',
  'e719517b-c75a-4aa1-935a-21913543acdd',
  '0bc5c3c7-6da9-4d92-a4e8-68a1f63e8f2c',
  '9713c277-5c71-4ad9-9356-615ccc68ae03',
  '1431d4ed-f4aa-462a-a303-3367b6a58273',
  'b3861b62-4717-457c-8b01-d006fc879bcb',
  'b4129393-89dd-466d-ae0b-667cf04cdbad',
  'a2598af1-841b-47e2-bcf8-b5bd785d5517',
  '15d79015-9779-4b3f-8421-ab59f242c5e7',
  '73087a33-6251-4fed-869c-2b59a09b0c29',
  'e0239342-6c01-4d09-853d-626c734b075d',
  'd3fe2f2a-aa91-4d31-9e34-5216f9c0043f',
  '8791b4f1-8401-4c45-a5bd-4490da6bc874',
  'a611933c-ae38-44b8-a9ca-8613eb1b1d08',
  '93a4aab1-4143-4424-9616-8b3002a6b43e'
);

-- ─────────────────────────────────────────────────────────────
-- 2. UPDATE existing cuisine categories (descriptions + names)
-- ─────────────────────────────────────────────────────────────

-- Levantine / Oriental
UPDATE public.categories
SET description_de = 'Levantinische und orientalische Aromen',
    description_en = 'Levantine and oriental flavours',
    updated_at     = now()
WHERE category_id = 'a8d3cf09-b606-4de9-8744-b8c584c5e172';

-- Indian-Pakistani
UPDATE public.categories
SET name_de        = 'Indisch-Pakistanische Küche',
    name_en        = 'Indian-Pakistani Cuisine',
    description_de = 'Curry, Biryani und reiche Gewürzvielfalt',
    description_en = 'Curry, biryani and rich spice diversity',
    updated_at     = now()
WHERE category_id = 'f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae';

-- East African
UPDATE public.categories
SET name_de        = 'Ostafrikanische Küche',
    name_en        = 'East African Cuisine',
    description_de = 'Somalische, eritreische und äthiopische Aromen',
    description_en = 'Somali, Eritrean and Ethiopian flavours',
    updated_at     = now()
WHERE category_id = '611dd280-59d7-4996-a4e1-046c0ddfe6b6';

-- Southeast Asian
UPDATE public.categories
SET name_de        = 'Südostasiatische Küche',
    name_en        = 'Southeast Asian Cuisine',
    description_de = 'Halal-Aromen aus Indonesien, Malaysia und mehr',
    description_en = 'Halal flavours from Indonesia, Malaysia and beyond',
    updated_at     = now()
WHERE category_id = 'f577c7ce-d2e2-46ba-b494-57b038aa4b48';

-- Turkish
UPDATE public.categories
SET description_de = 'Döner, Lahmacun und mehr – mit Barakah',
    description_en = 'Döner, lahmacun and more – made with barakah',
    updated_at     = now()
WHERE category_id = '232c2870-7929-43eb-a909-6cac90203192';

-- ─────────────────────────────────────────────────────────────
-- 3. INSERT new cuisine regions
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.categories (
  id, category_id, name, name_de, name_en,
  description_de, description_en,
  category_images, applicable_to, applicable_section,
  created_at, updated_at
)
VALUES
  (gen_random_uuid(), gen_random_uuid(),
   'Nordafrikanische Küche',
   'Nordafrikanische Küche', 'North African Cuisine',
   'Tajine, Couscous und maghrebinische Tradition',
   'Tagine, couscous and Maghreb tradition',
   NULL, ARRAY['provider'], 'food', now(), now()),

  (gen_random_uuid(), gen_random_uuid(),
   'Afghanische Küche',
   'Afghanische Küche', 'Afghan Cuisine',
   'Kabuli Pulao, Mantu und herzhafte Gastfreundschaft',
   'Kabuli pulao, mantu and hearty hospitality',
   NULL, ARRAY['provider'], 'food', now(), now()),

  (gen_random_uuid(), gen_random_uuid(),
   'Persische Küche',
   'Persische Küche', 'Persian Cuisine',
   'Elegante Aromen mit langer Tradition',
   'Elegant flavours steeped in tradition',
   NULL, ARRAY['provider'], 'food', now(), now()),

  (gen_random_uuid(), gen_random_uuid(),
   'Balkan-Küche',
   'Balkan-Küche', 'Balkan Cuisine',
   'Ćevapi, Burek und südosteuropäische Herzlichkeit',
   'Ćevapi, burek and Southeast European warmth',
   NULL, ARRAY['provider'], 'food', now(), now()),

  (gen_random_uuid(), gen_random_uuid(),
   'Westafrikanische Küche',
   'Westafrikanische Küche', 'West African Cuisine',
   'Thiéboudienne, Jollof und westafrikanische Tradition',
   'Thiéboudienne, jollof and West African tradition',
   NULL, ARRAY['provider'], 'food', now(), now()),

  (gen_random_uuid(), gen_random_uuid(),
   'Deutsche Küche (Halal)',
   'Deutsche Küche (Halal)', 'German Cuisine (Halal)',
   'Klassisch deutsch – halal zubereitet',
   'Classic German – prepared the halal way',
   NULL, ARRAY['provider'], 'food', now(), now())

ON CONFLICT DO NOTHING;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- VERIFY
-- ─────────────────────────────────────────────────────────────
SELECT applicable_section, name_de, name_en
FROM public.categories
ORDER BY applicable_section NULLS FIRST, name_de;
