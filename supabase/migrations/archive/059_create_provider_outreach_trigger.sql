-- Migration: 059_create_provider_outreach_trigger.sql
-- Feature: 038 - Provider Owner Outreach & Claim System
-- Purpose: Auto-enqueue outreach when unclaimed provider with contact info is created

-- ==============================================================================
-- TRIGGER FUNCTION: Enqueue outreach on provider INSERT
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_provider_outreach()
RETURNS TRIGGER AS $$
DECLARE
  v_has_contact BOOLEAN;
  v_selected_channel outreach_channel;
BEGIN
  -- Only process unclaimed providers (recommendation mode)
  IF NEW.provider_owner_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Also skip if user_created_id is set (user-created providers)
  -- Recommendation mode = both NULL
  IF NEW.user_created_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if at least one contact channel exists
  v_has_contact := (
    (NEW.contact_email IS NOT NULL AND NEW.contact_email <> '') OR
    (NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '') OR
    (NEW.social_instagram IS NOT NULL AND NEW.social_instagram <> '')
  );
  
  IF NOT v_has_contact THEN
    RETURN NEW;
  END IF;
  
  -- Determine primary channel (email preferred)
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
    v_selected_channel := 'email';
  ELSIF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    v_selected_channel := 'phone';
  ELSE
    v_selected_channel := 'instagram';
  END IF;
  
  -- Insert outreach record (idempotent: unique constraint prevents duplicates)
  INSERT INTO public.provider_owner_outreach (
    provider_id,
    candidate_email,
    candidate_phone,
    candidate_instagram,
    selected_channel,
    language,
    status,
    dispatch_after
  )
  VALUES (
    NEW.provider_id,
    NULLIF(TRIM(NEW.contact_email), ''),
    NULLIF(TRIM(NEW.contact_phone), ''),
    NULLIF(TRIM(NEW.social_instagram), ''),
    v_selected_channel,
    'de',  -- MVP: German
    'pending_approval',  -- Requires operator approval
    NOW() + INTERVAL '24 hours'  -- Delay gate
  )
  ON CONFLICT DO NOTHING;  -- Idempotent: skip if already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- TRIGGER: Fire on provider INSERT
-- ==============================================================================

-- Drop existing trigger if it exists (for idempotent migration)
DROP TRIGGER IF EXISTS trigger_enqueue_provider_outreach ON public.providers;

-- Create trigger
CREATE TRIGGER trigger_enqueue_provider_outreach
  AFTER INSERT ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_provider_outreach();

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON FUNCTION public.enqueue_provider_outreach() IS 
  'Auto-enqueues outreach for unclaimed providers (recommendation mode) with contact info. 
   Fires on INSERT, selects email as primary channel, sets 24h delay, and requires approval.';

COMMENT ON TRIGGER trigger_enqueue_provider_outreach ON public.providers IS
  'Trigger to auto-enqueue provider owner outreach on INSERT of recommendation-mode providers.';
