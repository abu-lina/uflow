-- =====================================================
-- UMMAH FLOW - COMPLETE UAT DATABASE SCHEMA
-- =====================================================
-- This is a complete, consolidated SQL file that creates
-- all required tables, indexes, policies, functions, and
-- storage buckets for the Supabase UAT instance.
-- 
-- Run this entire file in Supabase SQL Editor to set up
-- a fresh UAT database from scratch.
-- 
-- Generated: 2025-01-26
-- =====================================================

-- =====================================================
-- 1. CREATE CUSTOM ENUM TYPES
-- =====================================================

-- User roles enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'user',
    'owner', 
    'admin',
    'moderator'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Review status enum
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'needs_revision'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Consent type enum
DO $$ BEGIN
  CREATE TYPE consent_type AS ENUM (
    'terms_of_service',
    'privacy_policy'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE CORE TABLES
-- =====================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_de TEXT,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Providers table (includes offers_ids and needs_ids)
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  provider_description TEXT,
  provider_images JSONB,
  category_id UUID REFERENCES public.categories(category_id),
  address_street TEXT,
  address_zip TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'DE',
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  contact_email TEXT,
  contact_phone TEXT,
  social_website TEXT,
  social_instagram TEXT,
  barakah_effects TEXT[] DEFAULT '{}',
  provider_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_created_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status review_status DEFAULT 'pending',
  review_feedback TEXT,
  offers_ids UUID[] DEFAULT '{}',
  needs_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Community Services table
CREATE TABLE IF NOT EXISTS public.community_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_service_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  community_service_name TEXT NOT NULL,
  community_service_description TEXT,
  community_service_logo JSONB,
  community_service_images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  community_service_view_count INTEGER DEFAULT 0,
  donation_count INTEGER DEFAULT 0,
  category_id UUID REFERENCES public.categories(category_id),
  contact_email TEXT,
  contact_phone TEXT,
  social_website TEXT,
  social_instagram TEXT,
  address_street TEXT,
  address_zip TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'DE',
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  review_status review_status DEFAULT 'pending',
  review_feedback TEXT,
  barakah_effects TEXT[] DEFAULT '{}',
  provider_id UUID REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmarkable_id UUID NOT NULL,
  bookmarkable_type TEXT NOT NULL CHECK (bookmarkable_type IN ('provider', 'community_service')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(bookmarkable_id, bookmarkable_type, user_id)
);

-- Offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name_de TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES public.categories(category_id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT offers_name_de_unique UNIQUE (name_de)
);

-- Needs table
CREATE TABLE IF NOT EXISTS public.needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name_de TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES public.categories(category_id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT needs_name_de_unique UNIQUE (name_de)
);

-- Provider-Community Services junction table
CREATE TABLE IF NOT EXISTS public.provider_community_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  community_service_id UUID NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(provider_id, community_service_id)
);

-- Category Suggested Offers table
CREATE TABLE IF NOT EXISTS public.category_suggested_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, offer_id)
);

-- Category Suggested Needs table
CREATE TABLE IF NOT EXISTS public.category_suggested_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  need_id UUID NOT NULL REFERENCES public.needs(need_id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, need_id)
);

-- Email Confirmation Tokens table
CREATE TABLE IF NOT EXISTS public.email_confirmation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('signup', 'password_reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push Subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Consent Logs table
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT true,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Audit Logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('provider', 'user', 'system')),
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for admin_audit_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id' AND table_schema = 'public') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_admin_audit_logs_admin_user_id' AND table_schema = 'public'
      ) THEN
        ALTER TABLE public.admin_audit_logs
          ADD CONSTRAINT fk_admin_audit_logs_admin_user_id
          FOREIGN KEY (admin_user_id) REFERENCES public.users(user_id)
          ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_category_id ON public.categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- Providers indexes
CREATE INDEX IF NOT EXISTS idx_providers_provider_id ON public.providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_providers_category_id ON public.providers(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_owner_id ON public.providers(provider_owner_id);
CREATE INDEX IF NOT EXISTS idx_providers_address_city ON public.providers(address_city) WHERE address_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_review_status ON public.providers(review_status);
CREATE INDEX IF NOT EXISTS idx_providers_created_at ON public.providers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_providers_user_created_id ON public.providers(user_created_id);
CREATE INDEX IF NOT EXISTS idx_providers_review_status_created_at ON public.providers(review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_providers_category_created ON public.providers(category_id, created_at DESC) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_offers_ids ON public.providers USING GIN (offers_ids);
CREATE INDEX IF NOT EXISTS idx_providers_needs_ids ON public.providers USING GIN (needs_ids);
CREATE INDEX IF NOT EXISTS idx_providers_name_search ON public.providers USING gin(to_tsvector('german', provider_name));
CREATE INDEX IF NOT EXISTS idx_providers_description_search ON public.providers USING gin(to_tsvector('german', provider_description));

-- Community services indexes
CREATE INDEX IF NOT EXISTS idx_community_services_community_service_id ON public.community_services(community_service_id);
CREATE INDEX IF NOT EXISTS idx_community_services_category_id ON public.community_services(category_id);
CREATE INDEX IF NOT EXISTS idx_community_services_verified ON public.community_services(is_verified);
CREATE INDEX IF NOT EXISTS idx_community_services_review_status ON public.community_services(review_status);
CREATE INDEX IF NOT EXISTS idx_community_services_provider_id ON public.community_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_community_services_name_search ON public.community_services USING gin(to_tsvector('german', community_service_name));

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_bookmarkable ON public.bookmarks(bookmarkable_id, bookmarkable_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON public.bookmarks(bookmarkable_type);

-- Offers indexes
CREATE INDEX IF NOT EXISTS idx_offers_offer_id ON public.offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_name_de ON public.offers(name_de);
CREATE INDEX IF NOT EXISTS idx_offers_category_id ON public.offers(category_id);
CREATE INDEX IF NOT EXISTS idx_offers_created_by ON public.offers(created_by);

-- Needs indexes
CREATE INDEX IF NOT EXISTS idx_needs_need_id ON public.needs(need_id);
CREATE INDEX IF NOT EXISTS idx_needs_name_de ON public.needs(name_de);
CREATE INDEX IF NOT EXISTS idx_needs_category_id ON public.needs(category_id);
CREATE INDEX IF NOT EXISTS idx_needs_created_by ON public.needs(created_by);

-- Provider-Community Services indexes
CREATE INDEX IF NOT EXISTS idx_provider_community_services_provider_id ON public.provider_community_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_community_services_community_service_id ON public.provider_community_services(community_service_id);
CREATE INDEX IF NOT EXISTS idx_provider_community_services_composite ON public.provider_community_services(provider_id, community_service_id);

-- Category Suggested Offers indexes
CREATE INDEX IF NOT EXISTS idx_category_suggested_offers_category ON public.category_suggested_offers(category_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_offers_offer ON public.category_suggested_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_offers_priority ON public.category_suggested_offers(category_id, priority DESC);

-- Category Suggested Needs indexes
CREATE INDEX IF NOT EXISTS idx_category_suggested_needs_category ON public.category_suggested_needs(category_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_needs_need ON public.category_suggested_needs(need_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_needs_priority ON public.category_suggested_needs(category_id, priority DESC);

-- Email Confirmation Tokens indexes
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_token ON public.email_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_user_id ON public.email_confirmation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_email ON public.email_confirmation_tokens(email);

-- Push Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Consent Logs indexes
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type ON public.consent_logs(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_accepted_at ON public.consent_logs(accepted_at DESC);

-- Admin Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_type_id ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- =====================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_providers_updated_at ON public.providers;
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_services_updated_at ON public.community_services;
CREATE TRIGGER update_community_services_updated_at BEFORE UPDATE ON public.community_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_needs_updated_at ON public.needs;
CREATE TRIGGER update_needs_updated_at BEFORE UPDATE ON public.needs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_community_services_updated_at ON public.provider_community_services;
CREATE TRIGGER update_provider_community_services_updated_at BEFORE UPDATE ON public.provider_community_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_category_suggested_offers_updated_at ON public.category_suggested_offers;
CREATE TRIGGER update_category_suggested_offers_updated_at BEFORE UPDATE ON public.category_suggested_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_category_suggested_needs_updated_at ON public.category_suggested_needs;
CREATE TRIGGER update_category_suggested_needs_updated_at BEFORE UPDATE ON public.category_suggested_needs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Push subscriptions trigger (uses separate function)
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_community_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_suggested_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_suggested_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_confirmation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify categories" ON public.categories;
CREATE POLICY "Only admins can modify categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Providers policies
DROP POLICY IF EXISTS "Anyone can view approved providers" ON public.providers;
CREATE POLICY "Anyone can view approved providers" ON public.providers
  FOR SELECT USING (review_status = 'approved');

DROP POLICY IF EXISTS "Users can view their own providers" ON public.providers;
CREATE POLICY "Users can view their own providers" ON public.providers
  FOR SELECT USING (provider_owner_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create providers" ON public.providers;
CREATE POLICY "Authenticated users can create providers" ON public.providers
  FOR INSERT WITH CHECK (auth.uid() = provider_owner_id);

DROP POLICY IF EXISTS "Users can update their own providers" ON public.providers;
CREATE POLICY "Users can update their own providers" ON public.providers
  FOR UPDATE USING (provider_owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own providers" ON public.providers;
CREATE POLICY "Users can delete their own providers" ON public.providers
  FOR DELETE USING (provider_owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all providers" ON public.providers;
CREATE POLICY "Admins can manage all providers" ON public.providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Community services policies
DROP POLICY IF EXISTS "Anyone can view approved community services" ON public.community_services;
CREATE POLICY "Anyone can view approved community services" ON public.community_services
  FOR SELECT USING (review_status = 'approved');

DROP POLICY IF EXISTS "Users can view their own community services" ON public.community_services;
CREATE POLICY "Users can view their own community services" ON public.community_services
  FOR SELECT USING (provider_id IN (
    SELECT provider_id FROM public.providers WHERE provider_owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Authenticated users can create community services" ON public.community_services;
CREATE POLICY "Authenticated users can create community services" ON public.community_services
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own community services" ON public.community_services;
CREATE POLICY "Users can update their own community services" ON public.community_services
  FOR UPDATE USING (provider_id IN (
    SELECT provider_id FROM public.providers WHERE provider_owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete their own community services" ON public.community_services;
CREATE POLICY "Users can delete their own community services" ON public.community_services
  FOR DELETE USING (provider_id IN (
    SELECT provider_id FROM public.providers WHERE provider_owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage all community services" ON public.community_services;
CREATE POLICY "Admins can manage all community services" ON public.community_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Bookmarks policies
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- Offers policies
DROP POLICY IF EXISTS "Offers are viewable by everyone" ON public.offers;
CREATE POLICY "Offers are viewable by everyone" ON public.offers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert offers" ON public.offers;
CREATE POLICY "Authenticated users can insert offers" ON public.offers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update offers" ON public.offers;
CREATE POLICY "Authenticated users can update offers" ON public.offers FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own unused offers" ON public.offers;
CREATE POLICY "Users can delete their own unused offers" 
ON public.offers FOR DELETE 
USING (
  auth.uid() = created_by 
  AND NOT EXISTS (
    SELECT 1 FROM public.providers 
    WHERE offer_id = ANY(offers_ids)
  )
);

-- Needs policies
DROP POLICY IF EXISTS "Needs are viewable by everyone" ON public.needs;
CREATE POLICY "Needs are viewable by everyone" ON public.needs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert needs" ON public.needs;
CREATE POLICY "Authenticated users can insert needs" ON public.needs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update needs" ON public.needs;
CREATE POLICY "Authenticated users can update needs" ON public.needs FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own unused needs" ON public.needs;
CREATE POLICY "Users can delete their own unused needs" 
ON public.needs FOR DELETE 
USING (
  auth.uid() = created_by 
  AND NOT EXISTS (
    SELECT 1 FROM public.providers 
    WHERE need_id = ANY(needs_ids)
  )
);

-- Provider-Community Services policies
DROP POLICY IF EXISTS "Provider community services are viewable by everyone" ON public.provider_community_services;
CREATE POLICY "Provider community services are viewable by everyone" ON public.provider_community_services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create provider community service relationships" ON public.provider_community_services;
CREATE POLICY "Authenticated users can create provider community service relationships" ON public.provider_community_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage their own provider's community service relationships" ON public.provider_community_services;
CREATE POLICY "Users can manage their own provider's community service relationships" ON public.provider_community_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.providers 
      WHERE providers.provider_id = provider_community_services.provider_id 
      AND providers.provider_owner_id = auth.uid()
    )
  );

-- Category Suggested Offers policies
DROP POLICY IF EXISTS "Suggested offers are viewable by everyone" ON public.category_suggested_offers;
CREATE POLICY "Suggested offers are viewable by everyone" 
  ON public.category_suggested_offers FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert suggested offers" ON public.category_suggested_offers;
CREATE POLICY "Authenticated users can insert suggested offers" 
  ON public.category_suggested_offers FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update suggested offers" ON public.category_suggested_offers;
CREATE POLICY "Authenticated users can update suggested offers" 
  ON public.category_suggested_offers FOR UPDATE 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete suggested offers" ON public.category_suggested_offers;
CREATE POLICY "Authenticated users can delete suggested offers" 
  ON public.category_suggested_offers FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Category Suggested Needs policies
DROP POLICY IF EXISTS "Suggested needs are viewable by everyone" ON public.category_suggested_needs;
CREATE POLICY "Suggested needs are viewable by everyone" 
  ON public.category_suggested_needs FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert suggested needs" ON public.category_suggested_needs;
CREATE POLICY "Authenticated users can insert suggested needs" 
  ON public.category_suggested_needs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update suggested needs" ON public.category_suggested_needs;
CREATE POLICY "Authenticated users can update suggested needs" 
  ON public.category_suggested_needs FOR UPDATE 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete suggested needs" ON public.category_suggested_needs;
CREATE POLICY "Authenticated users can delete suggested needs" 
  ON public.category_suggested_needs FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Email Confirmation Tokens policies
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.email_confirmation_tokens;
CREATE POLICY "Service role can manage tokens" ON public.email_confirmation_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Push Subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own subscriptions" 
  ON public.push_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can create their own subscriptions" 
  ON public.push_subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own subscriptions" 
  ON public.push_subscriptions FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions" 
  ON public.push_subscriptions FOR DELETE 
  USING (auth.uid() = user_id);

-- Consent Logs policies
DROP POLICY IF EXISTS "Users can view their own consent logs" ON public.consent_logs;
CREATE POLICY "Users can view their own consent logs" 
  ON public.consent_logs FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own consent logs" ON public.consent_logs;
CREATE POLICY "Users can create their own consent logs" 
  ON public.consent_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own consent logs" ON public.consent_logs;
CREATE POLICY "Users can update their own consent logs" 
  ON public.consent_logs FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all consent logs" ON public.consent_logs;
CREATE POLICY "Admins can view all consent logs" 
  ON public.consent_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.user_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admin Audit Logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- 6. INSERT DEFAULT DATA
-- =====================================================

-- Insert default categories (only if they don't exist)
INSERT INTO public.categories (category_id, name, name_de, name_en, description) VALUES
  ('2335922b-76a9-4d79-b32a-b3f95941ba5c', 'Spenden', 'Spenden-Projekte', 'Donations', 'Zakat and donation projects'),
  (gen_random_uuid(), 'Lebensmittel', 'Lebensmittel & Getränke', 'Food & Beverages', 'Food and beverage businesses'),
  (gen_random_uuid(), 'Kleidung', 'Kleidung & Mode', 'Clothing & Fashion', 'Clothing and fashion stores'),
  (gen_random_uuid(), 'Bildung', 'Bildung & Lernen', 'Education & Learning', 'Educational services and institutions'),
  (gen_random_uuid(), 'Gesundheit', 'Gesundheit & Wellness', 'Health & Wellness', 'Health and wellness services'),
  (gen_random_uuid(), 'Technologie', 'Technologie & IT', 'Technology & IT', 'Technology and IT services'),
  (gen_random_uuid(), 'Handwerk', 'Handwerk & Reparatur', 'Crafts & Repair', 'Craftsmanship and repair services'),
  (gen_random_uuid(), 'Transport', 'Transport & Logistik', 'Transport & Logistics', 'Transportation and logistics services'),
  (gen_random_uuid(), 'Immobilien', 'Immobilien & Wohnen', 'Real Estate & Housing', 'Real estate and housing services'),
  (gen_random_uuid(), 'Sonstiges', 'Sonstiges', 'Other', 'Other services and businesses')
ON CONFLICT (category_id) DO NOTHING;

-- Insert sample offers
INSERT INTO public.offers (name_de, name_en) VALUES 
  ('Beratung', 'Consultation'),
  ('Coaching', 'Coaching'),
  ('Kurse', 'Courses'),
  ('Workshops', 'Workshops'),
  ('Mentoring', 'Mentoring'),
  ('Networking', 'Networking'),
  ('Support', 'Support'),
  ('Training', 'Training'),
  ('Seminare', 'Seminars'),
  ('Webinare', 'Webinars')
ON CONFLICT (name_de) DO NOTHING;

-- Insert sample needs
INSERT INTO public.needs (name_de, name_en) VALUES 
  ('Beratung', 'Consultation'),
  ('Coaching', 'Coaching'),
  ('Kurse', 'Courses'),
  ('Workshops', 'Workshops'),
  ('Mentoring', 'Mentoring'),
  ('Networking', 'Networking'),
  ('Support', 'Support'),
  ('Training', 'Training'),
  ('Seminare', 'Seminars'),
  ('Webinare', 'Webinars')
ON CONFLICT (name_de) DO NOTHING;

-- =====================================================
-- 7. CREATE FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to search providers with full-text search
CREATE OR REPLACE FUNCTION search_providers(
  search_query TEXT DEFAULT '',
  category_filter UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  provider_description TEXT,
  address_city TEXT,
  category_name TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.provider_description,
    p.address_city,
    c.name_de as category_name,
    ts_rank(
      to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
      plainto_tsquery('german', search_query)
    ) as rank
  FROM public.providers p
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE 
    p.review_status = 'approved'
    AND (search_query = '' OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')) @@ plainto_tsquery('german', search_query))
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (city_filter IS NULL OR p.address_city = city_filter)
  ORDER BY rank DESC, p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get community services for a provider
CREATE OR REPLACE FUNCTION get_community_services_for_provider(provider_uuid UUID)
RETURNS TABLE (
  community_service_id UUID,
  community_service_name TEXT,
  community_service_description TEXT,
  community_service_images TEXT[],
  donation_count INTEGER,
  category_name_de TEXT,
  barakah_effects TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.community_service_id,
    cs.community_service_name,
    cs.community_service_description,
    cs.community_service_images,
    cs.donation_count,
    c.name_de as category_name_de,
    cs.barakah_effects
  FROM public.provider_community_services pcs
  JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
  LEFT JOIN public.categories c ON cs.category_id = c.category_id
  WHERE pcs.provider_id = provider_uuid
  AND cs.review_status = 'approved'
  ORDER BY cs.community_service_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get providers for a community service
CREATE OR REPLACE FUNCTION get_providers_for_community_service(service_uuid UUID)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  address_city TEXT,
  category_name_de TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.address_city,
    c.name_de as category_name_de
  FROM public.provider_community_services pcs
  JOIN public.providers p ON pcs.provider_id = p.provider_id
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE pcs.community_service_id = service_uuid
  AND p.review_status = 'approved'
  ORDER BY p.provider_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suggested offers for a category
CREATE OR REPLACE FUNCTION get_suggested_offers_for_category(p_category_id UUID)
RETURNS TABLE (
  offer_id UUID,
  name_de TEXT,
  name_en TEXT,
  priority INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.offer_id,
    o.name_de,
    o.name_en,
    cso.priority
  FROM public.category_suggested_offers cso
  JOIN public.offers o ON cso.offer_id = o.offer_id
  WHERE cso.category_id = p_category_id
  ORDER BY cso.priority DESC, o.name_de ASC;
END;
$$;

-- Function to get suggested needs for a category
CREATE OR REPLACE FUNCTION get_suggested_needs_for_category(p_category_id UUID)
RETURNS TABLE (
  need_id UUID,
  name_de TEXT,
  name_en TEXT,
  priority INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.need_id,
    n.name_de,
    n.name_en,
    csn.priority
  FROM public.category_suggested_needs csn
  JOIN public.needs n ON csn.need_id = n.need_id
  WHERE csn.category_id = p_category_id
  ORDER BY csn.priority DESC, n.name_de ASC;
END;
$$;

-- Function to check if an offer can be deleted
CREATE OR REPLACE FUNCTION can_delete_offer(p_offer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.offers
    WHERE offer_id = p_offer_id
      AND created_by = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.providers 
        WHERE p_offer_id = ANY(offers_ids)
      )
  );
END;
$$;

-- Function to check if a need can be deleted
CREATE OR REPLACE FUNCTION can_delete_need(p_need_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.needs
    WHERE need_id = p_need_id
      AND created_by = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.providers 
        WHERE p_need_id = ANY(needs_ids)
      )
  );
END;
$$;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_confirmation_tokens 
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- 9. STORAGE SETUP (OPTIONAL)
-- =====================================================
-- Uncomment the following section if you need storage buckets
-- =====================================================

/*
-- Create bucket for provider images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-images',
  'provider-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for community service images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-service-images',
  'community-service-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY IF NOT EXISTS "Anyone can view provider images" ON storage.objects
  FOR SELECT USING (bucket_id = 'provider-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload provider images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'provider-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY IF NOT EXISTS "Users can update their own provider images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "Users can delete their own provider images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Similar policies for community-service-images and avatars...
*/

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- This consolidated schema includes:
-- ✅ All enum types
-- ✅ All tables (13 tables)
-- ✅ All indexes (optimized for performance)
-- ✅ All RLS policies (security configured)
-- ✅ All functions and triggers
-- ✅ Seed data (categories, offers, needs)
-- ✅ Storage setup (commented out, uncomment if needed)
-- 
-- Next steps:
-- 1. Verify all tables were created successfully
-- 2. Test authentication flow
-- 3. Uncomment storage section if needed
-- 4. Configure environment variables
-- =====================================================

