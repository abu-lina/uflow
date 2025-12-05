-- =====================================================
-- CREATE OFFERS AND NEEDS TABLES
-- =====================================================
-- This migration creates the offers and needs tables
-- that are referenced by migration 001
-- =====================================================

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name_de TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES public.categories(category_id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create needs table
CREATE TABLE IF NOT EXISTS public.needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name_de TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES public.categories(category_id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_offers_offer_id ON public.offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_name_de ON public.offers(name_de);
CREATE INDEX IF NOT EXISTS idx_offers_category_id ON public.offers(category_id);
CREATE INDEX IF NOT EXISTS idx_offers_created_by ON public.offers(created_by);

CREATE INDEX IF NOT EXISTS idx_needs_need_id ON public.needs(need_id);
CREATE INDEX IF NOT EXISTS idx_needs_name_de ON public.needs(name_de);
CREATE INDEX IF NOT EXISTS idx_needs_category_id ON public.needs(category_id);
CREATE INDEX IF NOT EXISTS idx_needs_created_by ON public.needs(created_by);

-- Create triggers for updated_at
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_needs_updated_at BEFORE UPDATE ON public.needs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

-- RLS policies will be added by migration 001






