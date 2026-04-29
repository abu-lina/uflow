-- =====================================================
-- Plan 055: Fix broken category_images reference for Clothing & Fashion
-- =====================================================
-- Root cause: The categories.category_images JSONB for "Kleidung & Mode"
-- references a Supabase Storage object (a65-design-2NLeXS3NR5E-unsplash.jpg)
-- that does not exist in the category-images bucket, causing HTTP 400 from
-- /_next/image on the home page gallery.
--
-- Fix: Point category_images to the confirmed replacement asset
-- clothing.jpg in the same public bucket.
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'category_images'
  ) THEN
    UPDATE public.categories
    SET category_images = '{"urls":["https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/clothing.jpg"]}'::jsonb,
        updated_at = NOW()
    WHERE category_id = '49563bf0-6962-4fd8-9147-5e68e9310eb1'
      AND name_de = 'Kleidung & Mode';
  ELSE
    RAISE NOTICE 'Skipping Plan 055 image patch in migration 061 because public.categories.category_images is not available in this schema state.';
  END IF;
END
$$;
