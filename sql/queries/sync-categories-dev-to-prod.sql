-- =====================================================
-- SYNC CATEGORIES FROM PROD TO DEV
-- =====================================================
-- This script updates DEV categories to match PROD
-- Run this in your DEV Supabase SQL Editor
-- =====================================================

-- Step 1: Ensure all required columns exist
-- =====================================================

-- Add description_de column if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS description_de TEXT;

-- Add description_en column if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Add category_images column if it doesn't exist (JSONB for storing image URLs)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS category_images JSONB;

-- Add applicable_to column if it doesn't exist (array of entity types)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS applicable_to TEXT[] DEFAULT '{provider,community_service}';

-- Step 2: Upsert categories from PROD
-- =====================================================
-- Using category_id as the unique identifier for upsert

INSERT INTO public.categories (
  id,
  category_id,
  name_de,
  name_en,
  description_de,
  description_en,
  applicable_to,
  category_images,
  created_at,
  updated_at
)
VALUES
  (
    '0615c92c-3bf6-48c1-a86e-67ccb6a670c9',
    '49563bf0-6962-4fd8-9147-5e68e9310eb1',
    'Kleidung & Mode',
    'Clothing & Fashion',
    'Einkaufen mit Niya und Wirkung',
    'Shopping with intention and impact',
    ARRAY['provider'],
    '{"urls":["https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/clothing.jpg"]}'::jsonb,
    '2025-09-12 22:11:17.308489+00'::timestamptz,
    '2025-10-26 08:04:10.3297+00'::timestamptz
  ),
  (
    '16281a1d-0121-454b-b8b4-92e99f1afa69',
    '4470c3e0-458f-40a6-a96e-ca0fbdf145d7',
    'Gemeinschaft & Spenden',
    'Community Support',
    'Tue Gutes für Allahs Wohlgefallen',
    'Doing good for the sake of Allah',
    ARRAY['community_service'],
    '{"urls":["https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/community_services.jpg"]}'::jsonb,
    '2025-10-05 14:09:05.166423+00'::timestamptz,
    '2025-10-26 08:09:05.575514+00'::timestamptz
  ),
  (
    '6e7b20da-640a-481e-9079-0b3a4bad4094',
    'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d',
    'Gesundheit & Sport',
    'Health & Sports',
    'Körperliche Stärke für Allahs Weg',
    'Physical strength for Allahs path',
    ARRAY['provider'],
    '{"urls":["https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/sports.jpg"]}'::jsonb,
    '2025-09-12 22:11:17.308489+00'::timestamptz,
    '2025-10-26 14:10:03.61562+00'::timestamptz
  ),
  (
    '82aeb251-36ff-48c6-b84e-0f2f5050d7e2',
    '1288f269-2cdb-47e8-bd8e-9d552ff25e83',
    'Dienstleistungen',
    'Services',
    'Dienen mit Halal-Arbeit und Herz',
    'Serving with halal work and heart',
    ARRAY['provider'],
    NULL,
    '2025-10-05 14:09:05.166423+00'::timestamptz,
    '2025-10-26 06:13:47.04332+00'::timestamptz
  ),
  (
    '9522687f-5da5-415b-a2cc-99fd03567ccf',
    'b43ba9ba-965e-46f8-a97e-c76d352c2ff0',
    'Handwerk & Reparatur',
    'Crafts & Repair',
    'Handgemacht mit Barakah',
    'Handmade with barakah',
    ARRAY['provider'],
    NULL,
    '2025-09-12 22:11:17.308489+00'::timestamptz,
    '2025-10-26 06:13:57.055785+00'::timestamptz
  ),
  (
    '9d9509fd-791f-44cd-a721-b36382488e6f',
    '20c10efe-404b-4a39-bb81-5089a0332d78',
    'Essen & Trinken',
    'Food & Drink',
    'Genießen mit Barakah und Niya',
    'Enjoy with barakah and niyyah',
    ARRAY['provider'],
    NULL,
    '2025-09-12 22:11:17.308489+00'::timestamptz,
    '2025-10-26 06:14:03.715572+00'::timestamptz
  ),
  (
    'c4c587cc-1469-4d23-b5a4-19f6a572077e',
    '21e8a577-f42c-499d-a277-0b8ba327c00b',
    'Bildung & Lernen',
    'Education',
    'Wissen mit Barakah',
    'Knowledge with barakah',
    ARRAY['provider'],
    NULL,
    '2025-10-05 14:09:05.166423+00'::timestamptz,
    '2025-10-26 06:14:10.715267+00'::timestamptz
  ),
  (
    'd800d3a7-7843-4ff2-81b1-c8c39e714e5f',
    '5e5d910d-d790-4184-a061-9cd74d0950e8',
    'Sonstiges',
    'Other',
    'Alles mit guter Absicht',
    'Everything with good intention',
    ARRAY['provider'],
    NULL,
    '2025-09-12 22:11:17.308489+00'::timestamptz,
    '2025-10-26 06:14:15.44235+00'::timestamptz
  )
ON CONFLICT (category_id) 
DO UPDATE SET
  id = EXCLUDED.id,
  name_de = EXCLUDED.name_de,
  name_en = EXCLUDED.name_en,
  description_de = EXCLUDED.description_de,
  description_en = EXCLUDED.description_en,
  applicable_to = EXCLUDED.applicable_to,
  category_images = EXCLUDED.category_images,
  updated_at = EXCLUDED.updated_at;

-- Step 3: Remove categories that don't exist in PROD
-- =====================================================
-- First, update providers and community_services that reference categories to be deleted
-- Assign them to "Other" category (Sonstiges) as a fallback

-- Update providers with invalid categories to "Other" category
UPDATE public.providers
SET category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8' -- "Other" category
WHERE category_id NOT IN (
  '49563bf0-6962-4fd8-9147-5e68e9310eb1',
  '4470c3e0-458f-40a6-a96e-ca0fbdf145d7',
  'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d',
  '1288f269-2cdb-47e8-bd8e-9d552ff25e83',
  'b43ba9ba-965e-46f8-a97e-c76d352c2ff0',
  '20c10efe-404b-4a39-bb81-5089a0332d78',
  '21e8a577-f42c-499d-a277-0b8ba327c00b',
  '5e5d910d-d790-4184-a061-9cd74d0950e8'
)
AND category_id IS NOT NULL;

-- Update community_services with invalid categories to "Other" category
UPDATE public.community_services
SET category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8' -- "Other" category
WHERE category_id NOT IN (
  '49563bf0-6962-4fd8-9147-5e68e9310eb1',
  '4470c3e0-458f-40a6-a96e-ca0fbdf145d7',
  'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d',
  '1288f269-2cdb-47e8-bd8e-9d552ff25e83',
  'b43ba9ba-965e-46f8-a97e-c76d352c2ff0',
  '20c10efe-404b-4a39-bb81-5089a0332d78',
  '21e8a577-f42c-499d-a277-0b8ba327c00b',
  '5e5d910d-d790-4184-a061-9cd74d0950e8'
)
AND category_id IS NOT NULL;

-- Now delete categories that don't exist in PROD
-- Note: offers and needs have ON DELETE SET NULL, so they'll be handled automatically
-- category_suggested_offers and category_suggested_needs have ON DELETE CASCADE
DELETE FROM public.categories
WHERE category_id NOT IN (
  '49563bf0-6962-4fd8-9147-5e68e9310eb1',
  '4470c3e0-458f-40a6-a96e-ca0fbdf145d7',
  'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d',
  '1288f269-2cdb-47e8-bd8e-9d552ff25e83',
  'b43ba9ba-965e-46f8-a97e-c76d352c2ff0',
  '20c10efe-404b-4a39-bb81-5089a0332d78',
  '21e8a577-f42c-499d-a277-0b8ba327c00b',
  '5e5d910d-d790-4184-a061-9cd74d0950e8'
);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this query to verify the sync was successful:
-- SELECT category_id, name_de, name_en, applicable_to, updated_at 
-- FROM public.categories 
-- ORDER BY name_de;
