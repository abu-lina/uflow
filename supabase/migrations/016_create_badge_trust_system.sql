-- Migration: Create Badge and Trust System
-- Description: Implements a scalable badge system with community confirmations and trust levels
-- Date: 2025-12-14

-- ============================================================================
-- 1. CREATE ENUMS
-- ============================================================================

-- Trust level enum
CREATE TYPE trust_level AS ENUM (
  'SELF_DECLARED',
  'COMMUNITY_CONFIRMED',
  'UMMAH_FLOW_VERIFIED'
);

-- Entity type enum (for polymorphic relationship)
CREATE TYPE entity_type AS ENUM (
  'provider',
  'community_service'
);

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- Badge Types: Defines available badge types (HALAL, MUSLIM_OWNED, etc.)
CREATE TABLE IF NOT EXISTS public.badge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key TEXT UNIQUE NOT NULL,
  labels JSONB NOT NULL, -- { "de": "Halal", "en": "Halal" }
  description TEXT,
  icon_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Badge System Configuration
CREATE TABLE IF NOT EXISTS public.badge_system_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Provider Badges: Badges assigned to entities (providers or community_services)
CREATE TABLE IF NOT EXISTS public.provider_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- References provider_id or community_service_id
  entity_type entity_type NOT NULL,
  badge_type_id UUID REFERENCES public.badge_types(id) ON DELETE CASCADE NOT NULL,
  trust_level trust_level DEFAULT 'SELF_DECLARED' NOT NULL,
  confirmation_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure a badge type can only be assigned once per entity
  UNIQUE(entity_id, entity_type, badge_type_id)
);

-- Badge Confirmations: User confirmations for badges
CREATE TABLE IF NOT EXISTS public.badge_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_badge_id UUID REFERENCES public.provider_badges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure a user can only confirm a badge once
  UNIQUE(provider_badge_id, user_id)
);

-- Badge Verifications: Admin verification audit trail
CREATE TABLE IF NOT EXISTS public.badge_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_badge_id UUID REFERENCES public.provider_badges(id) ON DELETE CASCADE NOT NULL,
  verified_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  reason TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Provider badges indexes
CREATE INDEX IF NOT EXISTS idx_provider_badges_entity 
  ON public.provider_badges(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_provider_badges_badge_type 
  ON public.provider_badges(badge_type_id);
CREATE INDEX IF NOT EXISTS idx_provider_badges_trust_level 
  ON public.provider_badges(trust_level);
CREATE INDEX IF NOT EXISTS idx_provider_badges_created_at 
  ON public.provider_badges(created_at);

-- Badge confirmations indexes
CREATE INDEX IF NOT EXISTS idx_badge_confirmations_badge 
  ON public.badge_confirmations(provider_badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_confirmations_user 
  ON public.badge_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_confirmations_confirmed_at 
  ON public.badge_confirmations(confirmed_at);

-- Badge verifications indexes
CREATE INDEX IF NOT EXISTS idx_badge_verifications_badge 
  ON public.badge_verifications(provider_badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_verifications_verified_by 
  ON public.badge_verifications(verified_by_user_id);

-- Badge types indexes
CREATE INDEX IF NOT EXISTS idx_badge_types_badge_key 
  ON public.badge_types(badge_key);
CREATE INDEX IF NOT EXISTS idx_badge_types_is_active 
  ON public.badge_types(is_active);

-- ============================================================================
-- 4. CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update confirmation count when confirmations are added/removed
CREATE OR REPLACE FUNCTION update_confirmation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment confirmation count
    UPDATE public.provider_badges
    SET 
      confirmation_count = confirmation_count + 1,
      updated_at = NOW()
    WHERE id = NEW.provider_badge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement confirmation count
    UPDATE public.provider_badges
    SET 
      confirmation_count = GREATEST(0, confirmation_count - 1),
      updated_at = NOW()
    WHERE id = OLD.provider_badge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update confirmation count
CREATE TRIGGER trigger_update_confirmation_count
  AFTER INSERT OR DELETE ON public.badge_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_confirmation_count();

-- Function to automatically update trust level based on confirmation count
CREATE OR REPLACE FUNCTION update_badge_trust_level()
RETURNS TRIGGER AS $$
DECLARE
  threshold INTEGER;
BEGIN
  -- Get threshold from config (default 5)
  SELECT (config_value->>'confirmation_threshold')::INTEGER
  INTO threshold
  FROM public.badge_system_config
  WHERE config_key = 'confirmation_threshold';
  
  IF threshold IS NULL THEN
    threshold := 5;
  END IF;
  
  -- Don't change UMMAH_FLOW_VERIFIED badges automatically
  IF NEW.trust_level = 'UMMAH_FLOW_VERIFIED' THEN
    RETURN NEW;
  END IF;
  
  -- Update trust level based on confirmation count
  IF NEW.confirmation_count >= threshold THEN
    NEW.trust_level := 'COMMUNITY_CONFIRMED';
  ELSE
    NEW.trust_level := 'SELF_DECLARED';
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update trust level
CREATE TRIGGER trigger_update_badge_trust_level
  BEFORE UPDATE OF confirmation_count ON public.provider_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_badge_trust_level();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER trigger_badge_types_updated_at
  BEFORE UPDATE ON public.badge_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_badge_system_config_updated_at
  BEFORE UPDATE ON public.badge_system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_system_config ENABLE ROW LEVEL SECURITY;

-- Badge Types Policies (Public read, admin write)
CREATE POLICY "Badge types are viewable by everyone"
  ON public.badge_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert badge types"
  ON public.badge_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update badge types"
  ON public.badge_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Provider Badges Policies (Public read, authenticated write for own entities)
CREATE POLICY "Provider badges are viewable by everyone"
  ON public.provider_badges FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert provider badges"
  ON public.provider_badges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Entity owners can update their badges"
  ON public.provider_badges FOR UPDATE
  USING (
    -- Allow updates if user is the entity owner
    (entity_type = 'provider' AND EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.provider_id = entity_id
      AND (
        providers.provider_owner_id = auth.uid()
        OR providers.user_created_id = auth.uid()
      )
    ))
    OR
    (entity_type = 'community_service' AND EXISTS (
      SELECT 1 FROM public.community_services
      WHERE community_services.community_service_id = entity_id
      AND community_services.user_created_id = auth.uid()
    ))
    OR
    -- Or if user is admin
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Badge Confirmations Policies (Public read, authenticated write own confirmations)
CREATE POLICY "Badge confirmations are viewable by everyone"
  ON public.badge_confirmations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own confirmations"
  ON public.badge_confirmations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own confirmations"
  ON public.badge_confirmations FOR DELETE
  USING (user_id = auth.uid());

-- Badge Verifications Policies (Public read, admin write)
CREATE POLICY "Badge verifications are viewable by everyone"
  ON public.badge_verifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert badge verifications"
  ON public.badge_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
    AND verified_by_user_id = auth.uid()
  );

-- Badge System Config Policies (Public read, admin write)
CREATE POLICY "Badge system config is viewable by everyone"
  ON public.badge_system_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badge system config"
  ON public.badge_system_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- 6. INSERT INITIAL DATA
-- ============================================================================

-- Insert initial badge types
INSERT INTO public.badge_types (badge_key, labels, description, icon_name) VALUES
  (
    'HALAL',
    '{"de": "Halal", "en": "Halal"}',
    'Offers halal products or services',
    'halal'
  ),
  (
    'MUSLIM_OWNED',
    '{"de": "Muslim im Besitz", "en": "Muslim Owned"}',
    'Business is owned by Muslims',
    'muslim-owned'
  ),
  (
    'COMMUNITY_ACTIVE',
    '{"de": "Gemeinschaftsaktiv", "en": "Community Active"}',
    'Actively participates in community activities',
    'community-active'
  ),
  (
    'SUPPORTS_SADAQAH',
    '{"de": "Unterstützt Sadaqah", "en": "Supports Sadaqah"}',
    'Supports charitable causes (Sadaqah)',
    'sadaqah'
  ),
  (
    'PRAYER_FRIENDLY',
    '{"de": "Gebetsfreundlich", "en": "Prayer Friendly"}',
    'Provides space or accommodates prayer times',
    'prayer'
  ),
  (
    'FAMILY_FRIENDLY',
    '{"de": "Familienfreundlich", "en": "Family Friendly"}',
    'Suitable for families with children',
    'family'
  ),
  (
    'WOMEN_FRIENDLY',
    '{"de": "Frauenfreundlich", "en": "Women Friendly"}',
    'Welcoming environment for women',
    'women'
  )
ON CONFLICT (badge_key) DO NOTHING;

-- Insert initial system configuration
INSERT INTO public.badge_system_config (config_key, config_value) VALUES
  (
    'confirmation_threshold',
    '{"confirmation_threshold": 5, "rate_limit_per_hour": 50}'::jsonb
  )
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 7. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.badge_types IS 'Defines available badge types with labels, descriptions, and icons';
COMMENT ON TABLE public.provider_badges IS 'Badges assigned to providers or community services with trust levels';
COMMENT ON TABLE public.badge_confirmations IS 'User confirmations for badges - tracks which users confirmed which badges';
COMMENT ON TABLE public.badge_verifications IS 'Admin verification audit trail - tracks manual verifications by admins';
COMMENT ON TABLE public.badge_system_config IS 'System configuration for badge thresholds and settings';

COMMENT ON COLUMN public.provider_badges.entity_id IS 'UUID of the provider or community_service';
COMMENT ON COLUMN public.provider_badges.entity_type IS 'Type of entity: provider or community_service';
COMMENT ON COLUMN public.provider_badges.trust_level IS 'Current trust level: SELF_DECLARED, COMMUNITY_CONFIRMED, or UMMAH_FLOW_VERIFIED';
COMMENT ON COLUMN public.provider_badges.confirmation_count IS 'Number of user confirmations (updated automatically via trigger)';

