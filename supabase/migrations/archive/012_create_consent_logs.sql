-- =====================================================
-- CONSENT LOGS TABLE
-- =====================================================
-- This migration creates the consent_logs table
-- to track user consent for Terms of Service and Privacy Policy
-- Required for GDPR compliance and audit trail
-- =====================================================

-- Create consent_type enum
CREATE TYPE consent_type AS ENUM (
  'terms_of_service',
  'privacy_policy'
);

-- Create consent_logs table
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT true,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id 
  ON public.consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type 
  ON public.consent_logs(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_accepted_at 
  ON public.consent_logs(accepted_at DESC);

-- Add comments
COMMENT ON TABLE public.consent_logs IS 
  'Stores user consent records for Terms of Service and Privacy Policy. Required for GDPR compliance and audit trail.';
COMMENT ON COLUMN public.consent_logs.consent_type IS 
  'Type of consent: terms_of_service or privacy_policy';
COMMENT ON COLUMN public.consent_logs.accepted IS 
  'Whether consent was accepted (true) or revoked (false)';
COMMENT ON COLUMN public.consent_logs.accepted_at IS 
  'Timestamp when consent was given';
COMMENT ON COLUMN public.consent_logs.revoked_at IS 
  'Timestamp when consent was revoked (if applicable)';
COMMENT ON COLUMN public.consent_logs.ip_address IS 
  'IP address from which consent was given (for audit trail)';
COMMENT ON COLUMN public.consent_logs.user_agent IS 
  'User agent from which consent was given (for audit trail)';

-- Enable Row Level Security
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own consent logs
CREATE POLICY "Users can view their own consent logs" 
  ON public.consent_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own consent logs (via API)
CREATE POLICY "Users can create their own consent logs" 
  ON public.consent_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent logs (for revocation)
CREATE POLICY "Users can update their own consent logs" 
  ON public.consent_logs FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins can view all consent logs (for compliance audits)
CREATE POLICY "Admins can view all consent logs" 
  ON public.consent_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.user_id = auth.uid() 
      AND users.role = 'admin'
    )
  );
