-- =====================================================
-- OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =====================================================
-- This migration fixes performance issues with RLS policies:
-- 1. Auth RLS Initialization Plan - wrap auth.uid() and auth.role() in (select ...)
-- 2. Multiple permissive policies - consolidate where possible
-- =====================================================

-- =====================================================
-- 1. FIX AUTH RLS INITPLAN ISSUES
-- =====================================================
-- Replace auth.uid() with (select auth.uid()) and auth.role() with (select auth.role())
-- This prevents re-evaluation for each row and improves query performance
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Categories table policies
-- Note: The FOR ALL policy is split into separate INSERT/UPDATE/DELETE policies in the consolidation section below
-- This section is kept for reference but the actual policy creation happens later

-- Providers table policies
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;
CREATE POLICY "Users can delete their own providers" ON public.providers
  FOR DELETE USING (provider_owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
CREATE POLICY "Users can view their own providers" ON public.providers
  FOR SELECT USING (provider_owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all providers" ON public.providers;
CREATE POLICY "Admins can view all providers" ON public.providers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Admins can insert providers" ON public.providers;
CREATE POLICY "Admins can insert providers" ON public.providers
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Admins can delete providers" ON public.providers;
CREATE POLICY "Admins can delete providers" ON public.providers
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Users can update their own providers or admins can update any" ON public.providers;
CREATE POLICY "Users can update their own providers or admins can update any" ON public.providers
  FOR UPDATE
  TO public
  USING (
    provider_owner_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Allow authenticated provider inserts" ON public.providers;
CREATE POLICY "Allow authenticated provider inserts" ON public.providers
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_created_id = (select auth.uid()));

DROP POLICY IF EXISTS "Allow provider inserts" ON public.providers;
CREATE POLICY "Allow provider inserts" ON public.providers
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
    ((select auth.role()) = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)
    OR
    ((select auth.role()) = 'authenticated' AND user_created_id = (select auth.uid()))
  );

-- Community services table policies
-- Consolidate multiple permissive policies into single policies with OR logic
-- Drop the old FOR ALL policy that might still exist
-- Note: Policy names must be <= 63 characters (PostgreSQL identifier limit)
DROP POLICY IF EXISTS "Admins can manage all community services" ON public.community_services;
DROP POLICY IF EXISTS "Users can view their own community services" ON public.community_services;
DROP POLICY IF EXISTS "Admins can view all community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can view approved community services" ON public.community_services;
-- Drop truncated policy names if they exist
DROP POLICY IF EXISTS "Users can view their own or admins can view all community servi" ON public.community_services;
DROP POLICY IF EXISTS "Users can update their own or admins can update all community s" ON public.community_services;
DROP POLICY IF EXISTS "Users can delete their own or admins can delete all community s" ON public.community_services;
-- Drop the shorter policy names if they already exist
DROP POLICY IF EXISTS "Users or admins can view community services" ON public.community_services;
DROP POLICY IF EXISTS "Users or admins can update community services" ON public.community_services;
DROP POLICY IF EXISTS "Users or admins can delete community services" ON public.community_services;
-- Use shorter policy names to avoid truncation
CREATE POLICY "Users or admins can view community services" ON public.community_services
  FOR SELECT USING (
    provider_id IN (
      SELECT provider_id FROM public.providers WHERE provider_owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Users can update their own community services" ON public.community_services;
DROP POLICY IF EXISTS "Admins can update all community services" ON public.community_services;
CREATE POLICY "Users or admins can update community services" ON public.community_services
  FOR UPDATE USING (
    provider_id IN (
      SELECT provider_id FROM public.providers WHERE provider_owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Users can delete their own community services" ON public.community_services;
DROP POLICY IF EXISTS "Admins can delete all community services" ON public.community_services;
CREATE POLICY "Users or admins can delete community services" ON public.community_services
  FOR DELETE USING (
    provider_id IN (
      SELECT provider_id FROM public.providers WHERE provider_owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Anyone can create community services" ON public.community_services;
DROP POLICY IF EXISTS "Admins can insert community services" ON public.community_services;
DROP POLICY IF EXISTS "Authenticated users can create community services" ON public.community_services;
-- Drop the old consolidated policy if it exists (full name and truncated version)
DROP POLICY IF EXISTS "Anyone can create or admins can insert community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can create or admins can insert community servi" ON public.community_services;
-- Drop the new shorter policy if it already exists
DROP POLICY IF EXISTS "Anyone or admins can create community services" ON public.community_services;
-- Use shorter policy name to avoid truncation
CREATE POLICY "Anyone or admins can create community services" ON public.community_services
  FOR INSERT WITH CHECK (
    -- Admins can insert any community service
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
    OR
    -- Authenticated users: must set user_created_id to their own ID
    ((select auth.role()) = 'authenticated' AND user_created_id = (select auth.uid()))
    OR
    -- Anonymous users: must have user_created_id as NULL
    ((select auth.role()) = 'anon' AND user_created_id IS NULL)
  );

-- Bookmarks table policies
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (user_id = (select auth.uid()));

-- Offers table policies
DROP POLICY IF EXISTS "Authenticated users can update offers" ON public.offers;
CREATE POLICY "Authenticated users can update offers" ON public.offers
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete offers" ON public.offers;
CREATE POLICY "Authenticated users can delete offers" ON public.offers
  FOR DELETE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own unused offers" ON public.offers;
CREATE POLICY "Users can delete their own unused offers" ON public.offers
  FOR DELETE USING (
    (select auth.uid()) = created_by 
    AND NOT EXISTS (
      SELECT 1 FROM public.providers 
      WHERE offer_id = ANY(offers_ids)
    )
  );

-- Needs table policies
DROP POLICY IF EXISTS "Authenticated users can update needs" ON public.needs;
CREATE POLICY "Authenticated users can update needs" ON public.needs
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete needs" ON public.needs;
CREATE POLICY "Authenticated users can delete needs" ON public.needs
  FOR DELETE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own unused needs" ON public.needs;
CREATE POLICY "Users can delete their own unused needs" ON public.needs
  FOR DELETE USING (
    (select auth.uid()) = created_by 
    AND NOT EXISTS (
      SELECT 1 FROM public.providers 
      WHERE need_id = ANY(needs_ids)
    )
  );

-- Provider community services table policies
-- Note: "Provider community services are viewable by everyone" (FOR SELECT) already exists from migration 002
-- We only need to optimize the auth functions here, not recreate the SELECT policy
DROP POLICY IF EXISTS "Allow authenticated users to create relationships" ON public.provider_community_services;
CREATE POLICY "Allow authenticated users to create relationships" ON public.provider_community_services
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- Drop the overly broad "Allow users to manage relationships" (FOR ALL - will be handled by consolidation section)
DROP POLICY IF EXISTS "Allow users to manage relationships" ON public.provider_community_services;

-- Split "Users can manage their own provider's community service relationships" from FOR ALL to only UPDATE/DELETE
-- This avoids overlap with the SELECT policy "Provider community services are viewable by everyone"
-- Note: Policy names must be <= 63 characters (PostgreSQL identifier limit)
DROP POLICY IF EXISTS "Users can manage their own provider's community service relationships" ON public.provider_community_services;
-- Drop truncated policy names if they exist (PostgreSQL truncates long names)
DROP POLICY IF EXISTS "Users can update their own provider's community service relatio" ON public.provider_community_services;
DROP POLICY IF EXISTS "Users can delete their own provider's community service relatio" ON public.provider_community_services;
-- Drop the shorter policy names if they already exist
DROP POLICY IF EXISTS "Users can update own provider relationships" ON public.provider_community_services;
DROP POLICY IF EXISTS "Users can delete own provider relationships" ON public.provider_community_services;
-- Use shorter policy names to avoid truncation
CREATE POLICY "Users can update own provider relationships" ON public.provider_community_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.providers 
      WHERE providers.provider_id = provider_community_services.provider_id 
      AND providers.provider_owner_id = (select auth.uid())
    )
  );
CREATE POLICY "Users can delete own provider relationships" ON public.provider_community_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.providers 
      WHERE providers.provider_id = provider_community_services.provider_id 
      AND providers.provider_owner_id = (select auth.uid())
    )
  );

-- Category suggested offers table policies
DROP POLICY IF EXISTS "Authenticated users can insert suggested offers" ON public.category_suggested_offers;
CREATE POLICY "Authenticated users can insert suggested offers" ON public.category_suggested_offers
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update suggested offers" ON public.category_suggested_offers;
CREATE POLICY "Authenticated users can update suggested offers" ON public.category_suggested_offers
  FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete suggested offers" ON public.category_suggested_offers;
CREATE POLICY "Authenticated users can delete suggested offers" ON public.category_suggested_offers
  FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Category suggested needs table policies
DROP POLICY IF EXISTS "Authenticated users can insert suggested needs" ON public.category_suggested_needs;
CREATE POLICY "Authenticated users can insert suggested needs" ON public.category_suggested_needs
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update suggested needs" ON public.category_suggested_needs;
CREATE POLICY "Authenticated users can update suggested needs" ON public.category_suggested_needs
  FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete suggested needs" ON public.category_suggested_needs;
CREATE POLICY "Authenticated users can delete suggested needs" ON public.category_suggested_needs
  FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Email confirmation tokens table policies
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.email_confirmation_tokens;
CREATE POLICY "Service role can manage tokens" ON public.email_confirmation_tokens
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Push subscriptions table policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Consent logs table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consent_logs') THEN
    -- Consolidate SELECT policies to avoid multiple permissive policies
    DROP POLICY IF EXISTS "Users can view their own consent logs" ON public.consent_logs;
    DROP POLICY IF EXISTS "Admins can view all consent logs" ON public.consent_logs;
    -- Drop the consolidated policy if it already exists
    DROP POLICY IF EXISTS "Users can view own or admins can view all consent logs" ON public.consent_logs;
    CREATE POLICY "Users can view own or admins can view all consent logs" ON public.consent_logs
      FOR SELECT USING (
        user_id = (select auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
        )
      );

    DROP POLICY IF EXISTS "Users can create their own consent logs" ON public.consent_logs;
    CREATE POLICY "Users can create their own consent logs" ON public.consent_logs
      FOR INSERT WITH CHECK (user_id = (select auth.uid()));

    DROP POLICY IF EXISTS "Users can update their own consent logs" ON public.consent_logs;
    CREATE POLICY "Users can update their own consent logs" ON public.consent_logs
      FOR UPDATE USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- Admin audit logs table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_logs') THEN
    DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
    CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.user_id = (select auth.uid())
          AND users.role IN ('admin', 'moderator')
        )
      );
  END IF;
END $$;

-- Badge types table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_types') THEN
    DROP POLICY IF EXISTS "Admins can insert badge types" ON public.badge_types;
    CREATE POLICY "Admins can insert badge types" ON public.badge_types
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      );

    DROP POLICY IF EXISTS "Admins can update badge types" ON public.badge_types;
    CREATE POLICY "Admins can update badge types" ON public.badge_types
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      );
  END IF;
END $$;

-- Provider badges table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_badges') THEN
    DROP POLICY IF EXISTS "Authenticated users can insert provider badges" ON public.provider_badges;
    CREATE POLICY "Authenticated users can insert provider badges" ON public.provider_badges
      FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

    DROP POLICY IF EXISTS "Entity owners can update their badges" ON public.provider_badges;
    CREATE POLICY "Entity owners can update their badges" ON public.provider_badges
      FOR UPDATE USING (
        (entity_type = 'provider' AND EXISTS (
          SELECT 1 FROM public.providers
          WHERE providers.provider_id = entity_id
          AND (
            providers.provider_owner_id = (select auth.uid())
            OR providers.user_created_id = (select auth.uid())
          )
        ))
        OR
        (entity_type = 'community_service' AND EXISTS (
          SELECT 1 FROM public.community_services
          WHERE community_services.community_service_id = entity_id
          AND community_services.user_created_id = (select auth.uid())
        ))
        OR
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      );
  END IF;
END $$;

-- Badge confirmations table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_confirmations') THEN
    DROP POLICY IF EXISTS "Authenticated users can insert their own confirmations" ON public.badge_confirmations;
    CREATE POLICY "Authenticated users can insert their own confirmations" ON public.badge_confirmations
      FOR INSERT WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND user_id = (select auth.uid())
      );

    DROP POLICY IF EXISTS "Users can delete their own confirmations" ON public.badge_confirmations;
    CREATE POLICY "Users can delete their own confirmations" ON public.badge_confirmations
      FOR DELETE USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- Badge verifications table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_verifications') THEN
    DROP POLICY IF EXISTS "Admins can insert badge verifications" ON public.badge_verifications;
    CREATE POLICY "Admins can insert badge verifications" ON public.badge_verifications
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
        AND verified_by_user_id = (select auth.uid())
      );
  END IF;
END $$;

-- Badge system config table policies (only if table exists)
-- Note: The FOR ALL policy is split into separate INSERT/UPDATE/DELETE policies in the consolidation section below
-- This section is kept for reference but the actual policy creation happens later

-- Deletion logs table policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deletion_logs') THEN
    DROP POLICY IF EXISTS "Only admins can read deletion logs" ON public.deletion_logs;
    CREATE POLICY "Only admins can read deletion logs" ON public.deletion_logs
      FOR SELECT USING ((select auth.jwt()) ->> 'role' = 'admin');
  END IF;
END $$;

-- =====================================================
-- 2. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- =====================================================
-- Fix multiple permissive policies by:
-- 1. Changing "FOR ALL" policies to only apply to INSERT/UPDATE/DELETE (not SELECT)
-- 2. Dropping redundant broad policies that are superseded by more specific ones
-- 3. Consolidating overlapping policies where safe
-- =====================================================

-- Badge system config: Change "FOR ALL" to only INSERT/UPDATE/DELETE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_system_config') THEN
    -- Drop the FOR ALL policy and any individual policies that might exist
    DROP POLICY IF EXISTS "Admins can manage badge system config" ON public.badge_system_config;
    DROP POLICY IF EXISTS "Admins can insert badge system config" ON public.badge_system_config;
    DROP POLICY IF EXISTS "Admins can update badge system config" ON public.badge_system_config;
    DROP POLICY IF EXISTS "Admins can delete badge system config" ON public.badge_system_config;
    -- Keep SELECT separate, only apply admin policy to INSERT/UPDATE/DELETE
    CREATE POLICY "Admins can insert badge system config" ON public.badge_system_config
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      );
    CREATE POLICY "Admins can update badge system config" ON public.badge_system_config
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      );
    CREATE POLICY "Admins can delete badge system config" ON public.badge_system_config
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = (select auth.uid())
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      );
  END IF;
END $$;

-- Categories: Change "FOR ALL" to only INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Only admins can modify categories" ON public.categories;
-- Drop individual policies if they already exist
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

-- Offers: Drop redundant "Authenticated users can delete offers" (superseded by more specific policy)
DROP POLICY IF EXISTS "Authenticated users can delete offers" ON public.offers;

-- Needs: Drop redundant "Authenticated users can delete needs" (superseded by more specific policy)
DROP POLICY IF EXISTS "Authenticated users can delete needs" ON public.needs;

-- Provider community services: Additional consolidation (already handled above, but ensure cleanup)
-- Drop "Anyone can create provider community service relationships" if it exists (redundant)
DROP POLICY IF EXISTS "Anyone can create provider community service relationships" ON public.provider_community_services;

-- Community services: Additional cleanup (policies already consolidated above)
DROP POLICY IF EXISTS "Allow public read access to community services" ON public.community_services;
DROP POLICY IF EXISTS "Anyone can view all community services" ON public.community_services;

-- Providers: Consolidate multiple permissive policies into single policies with OR logic
DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON public.providers;
-- Drop the consolidated policy if it already exists
DROP POLICY IF EXISTS "Users can delete their own or admins can delete any providers" ON public.providers;
CREATE POLICY "Users can delete their own or admins can delete any providers" ON public.providers
  FOR DELETE USING (
    provider_owner_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Admins can insert providers" ON public.providers;
DROP POLICY IF EXISTS "Allow authenticated provider inserts" ON public.providers;
DROP POLICY IF EXISTS "Allow provider inserts" ON public.providers;
-- Consolidate INSERT policies: admins can insert any, authenticated users can insert with user_created_id, anon can insert without user_created_id
-- Note: "Allow provider inserts" is dropped above and recreated here with consolidated logic
CREATE POLICY "Allow provider inserts" ON public.providers
  FOR INSERT 
  TO PUBLIC
  WITH CHECK (
    -- Admins can insert any provider
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
    OR
    -- Authenticated users can insert with user_created_id = their own ID
    ((select auth.role()) = 'authenticated' AND user_created_id = (select auth.uid()))
    OR
    -- Anonymous users can insert without user_created_id
    ((select auth.role()) = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)
  );

DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
DROP POLICY IF EXISTS "Admins can view all providers" ON public.providers;
DROP POLICY IF EXISTS "Anyone can view approved providers" ON public.providers;
-- Drop the consolidated SELECT policy if it already exists
DROP POLICY IF EXISTS "Public can view approved, users can view own, admins can view all providers" ON public.providers;
-- Consolidate SELECT policies: public can view approved, users can view their own, admins can view all
CREATE POLICY "Public can view approved, users can view own, admins can view all providers" ON public.providers
  FOR SELECT
  TO public
  USING (
    -- Public can view approved providers
    review_status = 'approved'
    OR
    -- Users can view their own providers (any status)
    provider_owner_id = (select auth.uid())
    OR
    -- Admins can view all providers
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Fixed:
--   1. Wrapped all auth.uid(), auth.role(), and auth.jwt() calls in (select ...) 
--      to prevent re-evaluation for each row (auth_rls_initplan optimization)
--   2. Consolidated multiple permissive policies by:
--      - Splitting "FOR ALL" policies into separate INSERT/UPDATE/DELETE policies
--      - Dropping redundant broad policies that are superseded by more specific ones
--      - Keeping necessary separate policies for different security purposes
-- 
-- Performance improvements:
--   - Auth function calls are now evaluated once per query instead of per row
--   - Reduced policy evaluation overhead by consolidating overlapping policies
--   - Maintained security model while improving query performance
-- =====================================================
