-- =====================================================
-- SUPABASE STORAGE SETUP (SAFE VERSION)
-- =====================================================
-- This version handles existing buckets gracefully
-- Run these commands in your Supabase SQL Editor

-- =====================================================
-- 1. CREATE STORAGE BUCKETS (WITH CONFLICT HANDLING)
-- =====================================================

-- Create bucket for provider images (ignore if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-images',
  'provider-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for community service images (ignore if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-service-images',
  'community-service-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for user avatars (ignore if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. DROP EXISTING POLICIES (IF ANY) AND CREATE NEW ONES
-- =====================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view provider images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload provider images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own provider images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own provider images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view community service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community service images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Provider images policies
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

-- Community service images policies
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

-- Avatar policies
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
-- 3. HELPER FUNCTIONS FOR STORAGE
-- =====================================================

-- Function to get public URL for storage objects
CREATE OR REPLACE FUNCTION get_public_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CONCAT(
    'https://',
    (SELECT value FROM settings WHERE key = 'project_ref'),
    '.supabase.co/storage/v1/object/public/',
    bucket_name,
    '/',
    file_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned storage files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  -- Find and delete orphaned provider images
  FOR file_record IN 
    SELECT name FROM storage.objects 
    WHERE bucket_id = 'provider-images'
    AND NOT EXISTS (
      SELECT 1 FROM public.providers 
      WHERE provider_images::text LIKE '%' || name || '%'
    )
  LOOP
    DELETE FROM storage.objects WHERE name = file_record.name;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  -- Find and delete orphaned community service images
  FOR file_record IN 
    SELECT name FROM storage.objects 
    WHERE bucket_id = 'community-service-images'
    AND NOT EXISTS (
      SELECT 1 FROM public.community_services 
      WHERE community_service_images::text LIKE '%' || name || '%'
    )
  LOOP
    DELETE FROM storage.objects WHERE name = file_record.name;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STORAGE SETUP COMPLETE!
-- =====================================================
-- Your storage buckets are now configured with proper policies
-- File uploads will be organized by user ID in folders
