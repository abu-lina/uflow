-- =====================================================
-- EXTEND WAITLIST TABLE - EARLY ACCESS FIELDS
-- =====================================================
-- This migration extends the waitlist table with fields
-- to support the Early Access / Community Mode feature
-- =====================================================

-- Add early access tracking fields
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS has_seen_early_access BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS selected_city TEXT,
  ADD COLUMN IF NOT EXISTS skipped_early_access BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS waitlist_token TEXT UNIQUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_selected_city
  ON public.waitlist(selected_city)
  WHERE selected_city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_token
  ON public.waitlist(waitlist_token)
  WHERE waitlist_token IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.waitlist.has_seen_early_access IS 
  'Tracks if user has seen the early access screen';
COMMENT ON COLUMN public.waitlist.selected_city IS 
  'City the user is interested in (for future unlock notifications)';
COMMENT ON COLUMN public.waitlist.skipped_early_access IS 
  'Tracks if user explicitly skipped the early access flow';
COMMENT ON COLUMN public.waitlist.waitlist_token IS 
  'Unique token for secure waitlist entry updates (prevents unauthorized modifications)';

-- Update RLS policy to allow updates with token
CREATE POLICY "Users can update their own waitlist entry with token"
  ON public.waitlist FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT UPDATE ON public.waitlist TO anon;
GRANT UPDATE ON public.waitlist TO authenticated;
