-- COMPLETE UMMAH FLOW DATABASE SCHEMA
-- Run this script in Supabase SQL Editor to set up the complete database schema

-- =============== SERVICES TABLE ===============
-- Create the services table for providers to list their services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Provider who owns the service
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Service details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  
  -- Optional service fields
  price DECIMAL(10,2),
  location TEXT,
  availability JSONB,
  
  -- Audit and rating
  view_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0
);

-- Create a trigger to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- =============== BOOKMARKS TABLE ===============
-- Create the bookmarks table for users to save services they're interested in
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Optional note
  note TEXT,
  
  -- Enforce unique constraint - each user can bookmark a service only once
  UNIQUE(user_id, service_id)
);

-- =============== ROW LEVEL SECURITY FOR SERVICES ===============
-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 1. Public can view active services
CREATE POLICY "Anyone can view active services"
  ON services
  FOR SELECT
  USING (status = 'active');

-- 2. Providers can view all their own services (including inactive/pending)
CREATE POLICY "Providers can view their own services"
  ON services
  FOR SELECT
  USING (auth.uid() = provider_id);

-- 3. Providers can create their own services
CREATE POLICY "Providers can create their own services"
  ON services
  FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- 4. Providers can update their own services
CREATE POLICY "Providers can update their own services"
  ON services
  FOR UPDATE
  USING (auth.uid() = provider_id);

-- 5. Providers can delete their own services
CREATE POLICY "Providers can delete their own services"
  ON services
  FOR DELETE
  USING (auth.uid() = provider_id);

-- =============== ROW LEVEL SECURITY FOR BOOKMARKS ===============
-- Enable RLS on bookmarks table
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 1. Users can only view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can create bookmarks (only for their own user_id)
CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Users can update their own bookmarks (e.g., to change the note)
CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =============== INDEX CREATION FOR PERFORMANCE ===============
-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_service ON bookmarks(service_id);

-- =============== GRANT PERMISSIONS ===============
-- Grant appropriate permissions to authenticated users
GRANT SELECT ON services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON services TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON bookmarks TO authenticated;

-- =============== VERIFICATION QUERIES ===============
-- To verify the schema is set up correctly, you can run:
-- 
-- 1. Check tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('profiles', 'services', 'bookmarks');
--
-- 2. Check RLS is enabled:
-- SELECT tablename, relrowsecurity FROM pg_tables 
-- JOIN pg_class ON pg_tables.tablename = pg_class.relname
-- WHERE schemaname = 'public' AND tablename IN ('profiles', 'services', 'bookmarks');
--
-- 3. Check policies are in place:
-- SELECT tablename, policyname, permissive, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd; 