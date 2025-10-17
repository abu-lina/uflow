-- =====================================================
-- FIX PROVIDER RLS POLICIES
-- =====================================================
-- This script fixes the RLS policies to allow viewing all providers
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. DROP EXISTING RESTRICTIVE POLICIES
-- =====================================================

-- Drop the restrictive policy that only allows viewing approved providers
DROP POLICY IF EXISTS "Anyone can view approved providers" ON public.providers;

-- =====================================================
-- 2. CREATE NEW PERMISSIVE POLICIES
-- =====================================================

-- Allow anyone to view all providers (not just approved ones)
CREATE POLICY "Anyone can view all providers" ON public.providers
  FOR SELECT USING (true);

-- Keep the existing policies for authenticated users
-- (These should already exist, but we'll ensure they're there)

-- Users can view their own providers
CREATE POLICY "Users can view their own providers" ON public.providers
  FOR SELECT USING (provider_owner_id = auth.uid());

-- Authenticated users can create providers
CREATE POLICY "Authenticated users can create providers" ON public.providers
  FOR INSERT WITH CHECK (auth.uid() = provider_owner_id);

-- Users can update their own providers
CREATE POLICY "Users can update their own providers" ON public.providers
  FOR UPDATE USING (provider_owner_id = auth.uid());

-- Users can delete their own providers
CREATE POLICY "Users can delete their own providers" ON public.providers
  FOR DELETE USING (provider_owner_id = auth.uid());

-- Admins can manage all providers
CREATE POLICY "Admins can manage all providers" ON public.providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- 3. FIX COMMUNITY SERVICES RLS (if needed)
-- =====================================================

-- Drop restrictive community services policy
DROP POLICY IF EXISTS "Anyone can view approved community services" ON public.community_services;

-- Allow anyone to view all community services
CREATE POLICY "Anyone can view all community services" ON public.community_services
  FOR SELECT USING (true);

-- =====================================================
-- 4. UPDATE EXISTING PROVIDERS (if needed)
-- =====================================================

-- If you want to set all existing providers to 'approved' status
-- (Optional - only run this if you want to mark all providers as approved)
-- UPDATE public.providers SET review_status = 'approved' WHERE review_status IS NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('providers', 'community_services')
ORDER BY tablename, policyname;

-- Check provider review_status distribution
SELECT review_status, COUNT(*) as count 
FROM public.providers 
GROUP BY review_status;
