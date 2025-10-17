-- Simple RLS fix for provider-community services
-- Run this in Supabase SQL Editor

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Provider community services are viewable by everyone" ON public.provider_community_services;
DROP POLICY IF EXISTS "Authenticated users can create provider community service relationships" ON public.provider_community_services;
DROP POLICY IF EXISTS "Users can manage their own provider's community service relationships" ON public.provider_community_services;

-- 2. Create simple, permissive policies
-- Allow everyone to read provider-community service relationships
CREATE POLICY "Allow public read access to provider community services" ON public.provider_community_services
  FOR SELECT USING (true);

-- Allow authenticated users to create relationships
CREATE POLICY "Allow authenticated users to create relationships" ON public.provider_community_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to manage relationships (simplified)
CREATE POLICY "Allow users to manage relationships" ON public.provider_community_services
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. Ensure community_services has public read access
DROP POLICY IF EXISTS "Community services are viewable by everyone" ON public.community_services;
CREATE POLICY "Allow public read access to community services" ON public.community_services
  FOR SELECT USING (true);

-- 4. Test the policies
SELECT 'Testing relationships access' as test, COUNT(*) as count
FROM public.provider_community_services 
WHERE provider_id = 'f5cf7a57-74a8-4528-8aac-f4d773567adc';

SELECT 'Testing community services access' as test, COUNT(*) as count
FROM public.community_services 
WHERE community_service_name IN ('Wüstenkind e.V.', 'Umma Moschee');
