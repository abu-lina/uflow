-- =====================================================
-- UMMAH FLOW - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database setup for your new Supabase project
-- Run these commands in your Supabase SQL Editor

-- =====================================================
-- 1. CREATE CUSTOM ENUM TYPES
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
  'user',
  'owner', 
  'admin',
  'moderator'
);

-- Review status enum
CREATE TYPE review_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'needs_revision'
);

-- =====================================================
-- 2. CREATE CORE TABLES
-- =====================================================

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_de TEXT,
  name_en TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Providers table (main marketplace listings)
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  provider_description TEXT,
  provider_images JSONB, -- Stores image URLs as JSON
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
  barakah_effects TEXT[] DEFAULT '{}', -- Array of tags
  provider_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  review_status review_status DEFAULT 'pending',
  review_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Community Services table (community service projects)
CREATE TABLE public.community_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_service_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  community_service_name TEXT NOT NULL,
  community_service_description TEXT,
  community_service_logo JSONB, -- Stores logo data as JSON
  community_service_images TEXT[] DEFAULT '{}', -- Array of image URLs
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
  barakah_effects TEXT[] DEFAULT '{}', -- Array of tags
  provider_id UUID REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Bookmarks table (user saved items)
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmarkable_id UUID NOT NULL, -- Can reference provider_id or community_service_id
  bookmarkable_type TEXT NOT NULL CHECK (bookmarkable_type IN ('provider', 'community_service')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(bookmarkable_id, bookmarkable_type, user_id)
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_user_id ON public.users(user_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Categories indexes
CREATE INDEX idx_categories_category_id ON public.categories(category_id);
CREATE INDEX idx_categories_name ON public.categories(name);

-- Providers indexes
CREATE INDEX idx_providers_provider_id ON public.providers(provider_id);
CREATE INDEX idx_providers_category_id ON public.providers(category_id);
CREATE INDEX idx_providers_owner_id ON public.providers(provider_owner_id);
CREATE INDEX idx_providers_city ON public.providers(address_city);
CREATE INDEX idx_providers_review_status ON public.providers(review_status);
CREATE INDEX idx_providers_created_at ON public.providers(created_at);
CREATE INDEX idx_providers_name_search ON public.providers USING gin(to_tsvector('german', provider_name));
CREATE INDEX idx_providers_description_search ON public.providers USING gin(to_tsvector('german', provider_description));

-- Community services indexes
CREATE INDEX idx_community_services_community_service_id ON public.community_services(community_service_id);
CREATE INDEX idx_community_services_category_id ON public.community_services(category_id);
CREATE INDEX idx_community_services_verified ON public.community_services(is_verified);
CREATE INDEX idx_community_services_review_status ON public.community_services(review_status);
CREATE INDEX idx_community_services_provider_id ON public.community_services(provider_id);
CREATE INDEX idx_community_services_name_search ON public.community_services USING gin(to_tsvector('german', community_service_name));

-- Bookmarks indexes
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_bookmarkable ON public.bookmarks(bookmarkable_id, bookmarkable_type);
CREATE INDEX idx_bookmarks_type ON public.bookmarks(bookmarkable_type);

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_services_updated_at BEFORE UPDATE ON public.community_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Providers policies
CREATE POLICY "Anyone can view approved providers" ON public.providers
  FOR SELECT USING (review_status = 'approved');

CREATE POLICY "Users can view their own providers" ON public.providers
  FOR SELECT USING (provider_owner_id = auth.uid());

CREATE POLICY "Authenticated users can create providers" ON public.providers
  FOR INSERT WITH CHECK (auth.uid() = provider_owner_id);

CREATE POLICY "Users can update their own providers" ON public.providers
  FOR UPDATE USING (provider_owner_id = auth.uid());

CREATE POLICY "Users can delete their own providers" ON public.providers
  FOR DELETE USING (provider_owner_id = auth.uid());

CREATE POLICY "Admins can manage all providers" ON public.providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Community services policies
CREATE POLICY "Anyone can view approved community services" ON public.community_services
  FOR SELECT USING (review_status = 'approved');

CREATE POLICY "Users can view their own community services" ON public.community_services
  FOR SELECT USING (provider_id IN (
    SELECT provider_id FROM public.providers WHERE provider_owner_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create community services" ON public.community_services
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own community services" ON public.community_services
  FOR UPDATE USING (provider_id IN (
    SELECT provider_id FROM public.providers WHERE provider_owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own community services" ON public.community_services
  FOR DELETE USING (provider_id IN (
    SELECT provider_id FROM public.providers WHERE provider_owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all community services" ON public.community_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Bookmarks policies
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 6. INSERT DEFAULT CATEGORIES
-- =====================================================

-- Insert default categories
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
  (gen_random_uuid(), 'Sonstiges', 'Sonstiges', 'Other', 'Other services and businesses');

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

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Your database is now ready for the Ummah Flow application
-- Next steps:
-- 1. Set up Supabase Storage buckets
-- 2. Update your environment variables
-- 3. Test the connection
