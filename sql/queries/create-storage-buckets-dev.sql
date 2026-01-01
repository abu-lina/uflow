-- =====================================================
-- CREATE STORAGE BUCKETS FOR DEV (MATCHING PROD)
-- =====================================================
-- This script creates all storage buckets matching production configuration
-- Run in Supabase SQL Editor for dev environment

-- =====================================================
-- 1. CREATE STORAGE BUCKETS
-- =====================================================

-- Create bucket for category images (public, 50 MB, any MIME type, no policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  52428800, -- 50 MB limit
  NULL -- Any MIME type (unset)
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- Create bucket for community service images (public, 5 MB, specific MIME types, 4 policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-service-images',
  'community-service-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- Create bucket for provider images (public, 5 MB, specific MIME types, 4 policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-images',
  'provider-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- Create bucket for zakat images (public, 5 MB, specific MIME types, 4 policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zakat-images',
  'zakat-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- Create bucket for user avatars (public, 2 MB, specific MIME types, 4 policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- =====================================================
-- 2. STORAGE POLICIES
-- =====================================================

-- Note: category-images has no policies (0 policies as per prod)

-- Community service images policies (4 policies)
DROP POLICY IF EXISTS "Anyone can view community service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community service images" ON storage.objects;

CREATE POLICY "Anyone can view community service images" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-service-images');

CREATE POLICY "Authenticated users can upload community service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-service-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own community service images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'community-service-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own community service images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'community-service-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Provider images policies (4 policies)
DROP POLICY IF EXISTS "Anyone can view provider images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload provider images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own provider images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own provider images" ON storage.objects;

CREATE POLICY "Anyone can view provider images" ON storage.objects
  FOR SELECT USING (bucket_id = 'provider-images');

CREATE POLICY "Authenticated users can upload provider images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'provider-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own provider images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own provider images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Zakat images policies (4 policies)
DROP POLICY IF EXISTS "Anyone can view zakat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload zakat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own zakat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own zakat images" ON storage.objects;

CREATE POLICY "Anyone can view zakat images" ON storage.objects
  FOR SELECT USING (bucket_id = 'zakat-images');

CREATE POLICY "Authenticated users can upload zakat images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'zakat-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own zakat images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'zakat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own zakat images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'zakat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Avatar policies (4 policies)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- All storage buckets have been created/updated to match production:
-- ✅ category-images (public, 50 MB, any MIME type, 0 policies)
-- ✅ community-service-images (public, 5 MB, image types, 4 policies)
-- ✅ provider-images (public, 5 MB, image types, 4 policies)
-- ✅ zakat-images (public, 5 MB, image types, 4 policies)
-- ✅ avatars (public, 2 MB, image types, 4 policies)
-- =====================================================




