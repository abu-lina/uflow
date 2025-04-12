-- uflow Database Schema
-- Run this script in the Supabase SQL Editor

-- 1. Profiles Table (extends Supabase Auth)
CREATE TYPE user_role AS ENUM ('customer', 'business_owner', 'halal_reviewer', 'admin');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    phone TEXT,
    bio TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    view_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Services Table
CREATE TYPE service_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE service_category AS ENUM ('food', 'beauty', 'fashion', 'health', 'education', 'travel', 'other');

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    category service_category DEFAULT 'other'::service_category,
    image_urls TEXT[] DEFAULT '{}',
    status service_status DEFAULT 'draft'::service_status,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Views Table (polymorphic)
CREATE TABLE IF NOT EXISTS views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewable_id UUID NOT NULL,
    viewable_type TEXT NOT NULL CHECK (viewable_type IN ('business', 'service')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index for faster querying on polymorphic relationship
CREATE INDEX idx_views_viewable ON views(viewable_id, viewable_type);

-- 5. Bookmarks Table (polymorphic)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bookmarkable_id UUID NOT NULL,
    bookmarkable_type TEXT NOT NULL CHECK (bookmarkable_type IN ('business', 'service')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index for faster querying on polymorphic relationship
CREATE INDEX idx_bookmarks_bookmarkable ON bookmarks(bookmarkable_id, bookmarkable_type);
-- Create a unique constraint to prevent duplicate bookmarks
CREATE UNIQUE INDEX idx_unique_bookmark ON bookmarks(user_id, bookmarkable_id, bookmarkable_type);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create auto-profile creation for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security Policies
-- 1. Profiles RLS
-- Users can read any profile
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Add this policy to explicitly prevent anonymous updates
CREATE POLICY "Prevent anonymous profile updates"
  ON profiles FOR UPDATE
  USING (auth.role() != 'anon');

-- Add policy to prevent inserts by anonymous users
CREATE POLICY "Only authenticated users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.role() != 'anon');

-- Add policy to prevent deletes by anyone except service role
CREATE POLICY "Prevent profile deletion"
  ON profiles FOR DELETE
  USING (false);

-- 2. Businesses RLS
-- Anyone can view businesses
CREATE POLICY "Businesses are viewable by everyone"
  ON businesses FOR SELECT
  USING (true);

-- Only business owners can update their businesses
CREATE POLICY "Business owners can update their own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only business owners can delete their businesses
CREATE POLICY "Business owners can delete their own businesses"
  ON businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- Only authenticated users with role 'business_owner' or 'admin' can insert businesses
CREATE POLICY "Only business owners and admins can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('business_owner', 'admin'))
    )
  );

-- 3. Services RLS
-- Anyone can view published services
CREATE POLICY "Everyone can view published services"
  ON services FOR SELECT
  USING (status = 'published'::service_status);

-- Business owners can view all their services (any status)
CREATE POLICY "Business owners can view all their services"
  ON services FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.id = services.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Only business owners can update their services
CREATE POLICY "Business owners can update their services"
  ON services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.id = services.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Only business owners can delete their services
CREATE POLICY "Business owners can delete their services"
  ON services FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.id = services.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Only business owners can insert services to their businesses
CREATE POLICY "Business owners can create services for their businesses"
  ON services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.id = services.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 4. Views RLS
-- Anyone can create views
CREATE POLICY "Anyone can create views"
  ON views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can see their own views
CREATE POLICY "Users can see their own views"
  ON views FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners can see views of their businesses
CREATE POLICY "Business owners can see views of their businesses"
  ON views FOR SELECT
  USING (
    viewable_type = 'business' AND
    EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.id = views.viewable_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Business owners can see views of their services
CREATE POLICY "Business owners can see views of their services"
  ON views FOR SELECT
  USING (
    viewable_type = 'service' AND
    EXISTS (
      SELECT 1
      FROM services
      JOIN businesses ON services.business_id = businesses.id
      WHERE services.id = views.viewable_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- 5. Bookmarks RLS
-- Users can create their own bookmarks
CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Create functions to increment view counts
-- For businesses
CREATE OR REPLACE FUNCTION increment_business_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses
  SET view_count = view_count + 1
  WHERE id = NEW.viewable_id AND NEW.viewable_type = 'business';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For services
CREATE OR REPLACE FUNCTION increment_service_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE services
  SET view_count = view_count + 1
  WHERE id = NEW.viewable_id AND NEW.viewable_type = 'service';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to increment view counts
CREATE TRIGGER after_view_insert_business
AFTER INSERT ON views
FOR EACH ROW
WHEN (NEW.viewable_type = 'business')
EXECUTE FUNCTION increment_business_view_count();

CREATE TRIGGER after_view_insert_service
AFTER INSERT ON views
FOR EACH ROW
WHEN (NEW.viewable_type = 'service')
EXECUTE FUNCTION increment_service_view_count(); 