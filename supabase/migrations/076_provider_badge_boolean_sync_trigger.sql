-- ============================================================================
-- Migration: 076_provider_badge_boolean_sync_trigger.sql
-- Plan 106: Badge/Boolean Data Coherence
--
-- Keeps providers.* filter booleans in sync with provider_badges writes.
-- - INSERT provider_badges: set mapped boolean true
-- - DELETE provider_badges: set mapped boolean false only when the last badge
--   of the same type for the provider is deleted.
--
-- Scope: entity_type = 'provider' only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_provider_badge_to_boolean()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id UUID;
  v_entity_type entity_type;
  v_badge_type_id UUID;
  v_badge_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.entity_id;
    v_entity_type := NEW.entity_type;
    v_badge_type_id := NEW.badge_type_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.entity_id;
    v_entity_type := OLD.entity_type;
    v_badge_type_id := OLD.badge_type_id;
  ELSE
    RETURN NULL;
  END IF;

  -- Provider booleans only exist on public.providers.
  IF v_entity_type != 'provider' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT bt.badge_key
  INTO v_badge_key
  FROM public.badge_types bt
  WHERE bt.id = v_badge_type_id;

  IF v_badge_key IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    CASE v_badge_key
      WHEN 'MUSLIM_OWNED' THEN
        UPDATE public.providers SET muslim_owned = TRUE WHERE provider_id = v_entity_id;
      WHEN 'PRAYER_FRIENDLY' THEN
        UPDATE public.providers SET has_prayer_space = TRUE WHERE provider_id = v_entity_id;
      WHEN 'SUPPORTS_SADAQAH' THEN
        UPDATE public.providers SET accepts_donations = TRUE WHERE provider_id = v_entity_id;
      ELSE
        NULL;
    END CASE;

    RETURN NEW;
  END IF;

  -- DELETE path: only unset when this was the last badge row for the provider/type.
  IF NOT EXISTS (
    SELECT 1
    FROM public.provider_badges pb
    WHERE pb.entity_id = v_entity_id
      AND pb.entity_type = 'provider'
      AND pb.badge_type_id = v_badge_type_id
  ) THEN
    CASE v_badge_key
      WHEN 'MUSLIM_OWNED' THEN
        UPDATE public.providers SET muslim_owned = FALSE WHERE provider_id = v_entity_id;
      WHEN 'PRAYER_FRIENDLY' THEN
        UPDATE public.providers SET has_prayer_space = FALSE WHERE provider_id = v_entity_id;
      WHEN 'SUPPORTS_SADAQAH' THEN
        UPDATE public.providers SET accepts_donations = FALSE WHERE provider_id = v_entity_id;
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_provider_badge_to_boolean ON public.provider_badges;

CREATE TRIGGER trigger_sync_provider_badge_to_boolean
  AFTER INSERT OR DELETE ON public.provider_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_provider_badge_to_boolean();
