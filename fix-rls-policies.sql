-- Fix RLS policies for provider-community services relationships
-- Run this in Supabase SQL Editor

-- 1. Check current RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('provider_community_services', 'community_services', 'providers')
AND schemaname = 'public';

-- 2. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('provider_community_services', 'community_services')
AND schemaname = 'public';

-- 3. Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Provider community services are viewable by everyone" ON public.provider_community_services;
DROP POLICY IF EXISTS "Authenticated users can create provider community service relationships" ON public.provider_community_services;
DROP POLICY IF EXISTS "Users can manage their own provider's community service relationships" ON public.provider_community_services;

-- 4. Create more permissive policies for testing
-- Allow everyone to read provider-community service relationships
CREATE POLICY "Allow public read access to provider community services" ON public.provider_community_services
  FOR SELECT USING (true);

-- Allow authenticated users to create relationships
CREATE POLICY "Allow authenticated users to create relationships" ON public.provider_community_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to manage their own provider's relationships
CREATE POLICY "Allow users to manage their provider relationships" ON public.provider_community_services
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      -- Allow if user owns the provider
      EXISTS (
        SELECT 1 FROM public.providers 
        WHERE providers.provider_id = provider_community_services.provider_id 
        AND providers.provider_owner_id = auth.uid()
      )
      OR
      -- Allow if user is admin (you can modify this condition)
      auth.uid() IS NOT NULL
    )
  );

-- 5. Ensure community_services table has proper RLS policies
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Community services are viewable by everyone" ON public.community_services;
DROP POLICY IF EXISTS "Authenticated users can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Users can manage their own community services" ON public.community_services;

-- Create permissive policies for community services
CREATE POLICY "Allow public read access to community services" ON public.community_services
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create community services" ON public.community_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to manage their community services" ON public.community_services
  FOR ALL USING (
    auth.role() = 'authenticated' AND (
      -- Allow if user owns the community service
      provider_owner_id = auth.uid()
      OR
      -- Allow if user is admin
      auth.uid() IS NOT NULL
    )
  );

-- 6. Test the policies by trying to read data
SELECT 'Testing RLS policies' as test_type, COUNT(*) as relationship_count
FROM public.provider_community_services 
WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

SELECT 'Testing community services access' as test_type, COUNT(*) as service_count
FROM public.community_services 
WHERE community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee');
