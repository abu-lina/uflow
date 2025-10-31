-- =====================================================
-- CATEGORY SUGGESTIONS SYSTEM
-- =====================================================
-- This migration creates tables to store predefined offers and needs
-- suggestions for each category, replacing hardcoded constants

-- =====================================================
-- 1. CREATE CATEGORY_SUGGESTED_OFFERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.category_suggested_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0, -- Higher priority = shown first
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no duplicate suggestions per category
  UNIQUE(category_id, offer_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_suggested_offers_category 
  ON public.category_suggested_offers(category_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_offers_offer 
  ON public.category_suggested_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_offers_priority 
  ON public.category_suggested_offers(category_id, priority DESC);

-- Add comment
COMMENT ON TABLE public.category_suggested_offers IS 
  'Stores predefined offer suggestions for each category to help users during provider creation';

-- =====================================================
-- 2. CREATE CATEGORY_SUGGESTED_NEEDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.category_suggested_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  need_id UUID NOT NULL REFERENCES public.needs(need_id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0, -- Higher priority = shown first
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no duplicate suggestions per category
  UNIQUE(category_id, need_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_suggested_needs_category 
  ON public.category_suggested_needs(category_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_needs_need 
  ON public.category_suggested_needs(need_id);
CREATE INDEX IF NOT EXISTS idx_category_suggested_needs_priority 
  ON public.category_suggested_needs(category_id, priority DESC);

-- Add comment
COMMENT ON TABLE public.category_suggested_needs IS 
  'Stores predefined need suggestions for each category to help users during provider creation';

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.category_suggested_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_suggested_needs ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view suggestions)
CREATE POLICY "Suggested offers are viewable by everyone" 
  ON public.category_suggested_offers FOR SELECT 
  USING (true);

CREATE POLICY "Suggested needs are viewable by everyone" 
  ON public.category_suggested_needs FOR SELECT 
  USING (true);

-- Only authenticated users can modify (future admin panel)
CREATE POLICY "Authenticated users can insert suggested offers" 
  ON public.category_suggested_offers FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suggested offers" 
  ON public.category_suggested_offers FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete suggested offers" 
  ON public.category_suggested_offers FOR DELETE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert suggested needs" 
  ON public.category_suggested_needs FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suggested needs" 
  ON public.category_suggested_needs FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete suggested needs" 
  ON public.category_suggested_needs FOR DELETE 
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. CREATE HELPER FUNCTIONS
-- =====================================================

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

-- Add comments on functions
COMMENT ON FUNCTION get_suggested_offers_for_category IS 
  'Returns all suggested offers for a given category, ordered by priority and name';
COMMENT ON FUNCTION get_suggested_needs_for_category IS 
  'Returns all suggested needs for a given category, ordered by priority and name';

