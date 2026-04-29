-- =====================================================
-- WAITLIST TABLE
-- =====================================================
-- This migration creates the waitlist table
-- to capture user email signups before launch
-- =====================================================

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  is_provider BOOLEAN DEFAULT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Ensure one signup per email
  CONSTRAINT waitlist_email_unique UNIQUE(email)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email 
  ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at 
  ON public.waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_is_provider 
  ON public.waitlist(is_provider) WHERE is_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_confirmed_at 
  ON public.waitlist(confirmed_at) WHERE confirmed_at IS NOT NULL;

-- Add comments
COMMENT ON TABLE public.waitlist IS 
  'Stores waitlist signups with email and provider status. Used for pre-launch user acquisition.';
COMMENT ON COLUMN public.waitlist.email IS 
  'User email address (unique)';
COMMENT ON COLUMN public.waitlist.is_provider IS 
  'Whether user is joining as a provider. NULL if user closed modal without selecting.';
COMMENT ON COLUMN public.waitlist.ip_address IS 
  'IP address from which signup occurred (for analytics and fraud prevention)';
COMMENT ON COLUMN public.waitlist.user_agent IS 
  'Browser user agent for analytics';
COMMENT ON COLUMN public.waitlist.created_at IS 
  'Timestamp when user joined waitlist';
COMMENT ON COLUMN public.waitlist.confirmed_at IS 
  'Timestamp when user confirmed email (if applicable)';

-- Enable Row Level Security
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public to insert (no authentication required)
CREATE POLICY "Anyone can join waitlist" 
  ON public.waitlist FOR INSERT 
  WITH CHECK (true);

-- No SELECT policy - privacy protection
-- Only service role can read waitlist data

-- Grant necessary permissions
GRANT INSERT ON public.waitlist TO anon;
GRANT INSERT ON public.waitlist TO authenticated;







