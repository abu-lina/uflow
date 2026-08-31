-- =====================================================
-- ALLOW ANONYMOUS STORAGE UPLOADS AND ENTITY CREATION
-- =====================================================
-- Issue: RLS policies prevent anonymous users from:
-- 1. Uploading images to storage buckets (403 Unauthorized)
-- 2. Creating providers/community services in recommendation mode (403 Unauthorized)
-- 
-- Solution: Update policies to allow anonymous users for recommendation mode
-- Application code ensures proper handling of anonymous vs authenticated users
-- =====================================================

-- =====================================================
-- 1. STORAGE BUCKET POLICIES - Allow anonymous uploads
-- =====================================================

-- Provider images: Allow anonymous uploads (for recommendation mode)
-- Anonymous files are stored in providers/anon-* paths
DROP POLICY IF EXISTS "Authenticated users can upload provider images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload provider images" ON storage.objects;
CREATE POLICY "Anyone can upload provider images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'provider-images' 
    AND (
      -- Allow authenticated users to upload to providers/{user_id}-* paths
      (auth.role() = 'authenticated' AND name LIKE 'providers/' || auth.uid()::text || '-%')
      OR
      -- Allow anonymous users (anon role) to upload to providers/anon-* paths (for recommendations)
      (auth.role() = 'anon' AND name LIKE 'providers/anon-%')
    )
  );

-- Community service images: Allow anonymous uploads (for recommendation mode)
DROP POLICY IF EXISTS "Authenticated users can upload community service images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload community service images" ON storage.objects;
CREATE POLICY "Anyone can upload community service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-service-images' 
    AND (
      -- Allow authenticated users to upload to community-services/{user_id}-* paths
      (auth.role() = 'authenticated' AND name LIKE 'community-services/' || auth.uid()::text || '-%')
      OR
      -- Allow anonymous users (anon role) to upload to community-services/anon-* paths (for recommendations)
      (auth.role() = 'anon' AND name LIKE 'community-services/anon-%')
    )
  );

-- =====================================================
-- 2. PROVIDER RLS POLICIES - Allow anonymous inserts
-- =====================================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create providers" ON public.providers;

-- Create new INSERT policy that allows both authenticated and anonymous users
-- For authenticated users: user_created_id = auth.uid() (enforced by app code)
-- For anonymous users: user_created_id = null AND provider_owner_id = null (enforced by app code)
CREATE POLICY "Anyone can create providers" ON public.providers
  FOR INSERT WITH CHECK (
    -- Authenticated users: must set user_created_id to their own ID
    (auth.role() = 'authenticated' AND user_created_id = auth.uid())
    OR
    -- Anonymous users (anon role): must have both user_created_id and provider_owner_id as NULL
    (auth.role() = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)
  );

-- =====================================================
-- 3. COMMUNITY SERVICES RLS POLICIES - Allow anonymous inserts
-- =====================================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create community services" ON public.community_services;

-- Create new INSERT policy that allows both authenticated and anonymous users
-- For authenticated users: user_created_id = auth.uid() (enforced by app code)
-- For anonymous users: user_created_id = null (enforced by app code)
CREATE POLICY "Anyone can create community services" ON public.community_services
  FOR INSERT WITH CHECK (
    -- Authenticated users: must set user_created_id to their own ID
    (auth.role() = 'authenticated' AND user_created_id = auth.uid())
    OR
    -- Anonymous users (anon role): must have user_created_id as NULL
    (auth.role() = 'anon' AND user_created_id IS NULL)
  );

-- =====================================================
-- 4. VERIFY POLICIES
-- =====================================================

-- Verify storage policies
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%upload%'
ORDER BY policyname;

-- Verify provider policies
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'providers'
  AND schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Verify community services policies
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'community_services'
  AND schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Anonymous users can now:
-- ✅ Upload images to provider-images and community-service-images buckets (anon-* paths)
-- ✅ Create providers in recommendation mode (user_created_id = NULL, provider_owner_id = NULL)
-- ✅ Create community services in recommendation mode (user_created_id = NULL)
-- =====================================================

