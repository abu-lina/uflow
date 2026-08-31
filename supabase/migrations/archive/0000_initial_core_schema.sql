-- =====================================================
-- INITIAL CORE SCHEMA (LOCAL/NEW DB BOOTSTRAP)
-- =====================================================
-- This project’s later migrations assume core tables/types already exist.
-- Local `supabase start` runs migrations from scratch, so we create the
-- minimal foundational schema here.
--
-- Important: Do NOT create tables that are created later without IF NOT EXISTS
-- (e.g. provider_community_services in migration 002).
-- =====================================================

-- -----------------------------------------------------
-- 1) ENUM TYPES (idempotent)
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'owner', 'admin', 'moderator');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_revision');
  END IF;
END $$;

-- -----------------------------------------------------
-- 2) CORE TABLES
-- -----------------------------------------------------

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

-- Providers table
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

-- Bookmarks table (referenced by later migrations/policies)
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookmarkable_id UUID NOT NULL,
  bookmarkable_type TEXT NOT NULL CHECK (bookmarkable_type IN ('provider', 'community_service')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(bookmarkable_id, bookmarkable_type, user_id)
);

-- Email confirmation tokens table (indexes/policies added in later migrations)
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

-- -----------------------------------------------------
-- 3) BASIC INDEXES (safe/idempotent)
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_categories_category_id ON public.categories(category_id);

CREATE INDEX IF NOT EXISTS idx_providers_provider_id ON public.providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_community_services_service_id ON public.community_services(community_service_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

-- -----------------------------------------------------
-- 4) ENABLE RLS (policies are defined/updated in later migrations)
-- -----------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_confirmation_tokens ENABLE ROW LEVEL SECURITY;
