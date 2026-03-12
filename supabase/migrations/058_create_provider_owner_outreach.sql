-- Migration: 058_create_provider_owner_outreach.sql
-- Feature: 038 - Provider Owner Outreach & Claim System
-- Purpose: Create tables for outreach queue and secure action tokens

-- ==============================================================================
-- ENUM TYPES
-- ==============================================================================

-- Outreach status lifecycle
CREATE TYPE outreach_status AS ENUM (
  'pending_approval',   -- Queued, awaiting operator approval
  'approved',           -- Approved by operator, waiting for delay to pass
  'pending_dispatch',   -- Ready to be dispatched
  'dispatched',         -- Message sent successfully
  'failed',             -- Permanent failure (invalid contact, etc.)
  'claimed',            -- Owner claimed the provider
  'removed',            -- Owner requested removal
  'kept',               -- Owner chose to stay listed
  'expired'             -- Max attempts reached or expired
);

-- Outreach channels
CREATE TYPE outreach_channel AS ENUM (
  'email',
  'phone',       -- Manual task
  'instagram'    -- Manual task
);

-- Action token scope
CREATE TYPE token_action_scope AS ENUM (
  'decision',   -- Landing page access (stay/claim/remove choice)
  'claim',      -- Claim provider ownership
  'remove'      -- Remove provider from listings
);

-- ==============================================================================
-- OUTREACH OUTBOX TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.provider_owner_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider reference
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  
  -- Available channels from provider contact info
  candidate_email TEXT,            -- Copied from providers.contact_email at enqueue time
  candidate_phone TEXT,            -- Copied from providers.contact_phone at enqueue time
  candidate_instagram TEXT,        -- Copied from providers.social_instagram at enqueue time
  
  -- Selected channel for this outreach attempt
  selected_channel outreach_channel NOT NULL DEFAULT 'email',
  
  -- Language for outbound message (MVP: 'de')
  language TEXT NOT NULL DEFAULT 'de',
  
  -- Status tracking
  status outreach_status NOT NULL DEFAULT 'pending_approval',
  
  -- Approval gate
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Dispatch tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  dispatch_error TEXT,
  
  -- Delay gate: outreach cannot be sent until this time
  dispatch_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Outcome tracking
  outcome_at TIMESTAMP WITH TIME ZONE,
  outcome_note TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure exactly one active outreach per provider
CREATE UNIQUE INDEX idx_provider_owner_outreach_active_provider 
  ON public.provider_owner_outreach (provider_id) 
  WHERE status NOT IN ('claimed', 'removed', 'kept', 'expired', 'failed');

-- Index for dispatcher to find pending work
CREATE INDEX idx_provider_owner_outreach_pending 
  ON public.provider_owner_outreach (status, dispatch_after, next_attempt_at)
  WHERE status IN ('approved', 'pending_dispatch');

-- Index for looking up outreach by provider
CREATE INDEX idx_provider_owner_outreach_provider_id 
  ON public.provider_owner_outreach (provider_id);

-- ==============================================================================
-- ACTION TOKENS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.provider_owner_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Token storage (hashed, not raw)
  token_hash TEXT NOT NULL UNIQUE,
  
  -- Provider reference
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  
  -- Outreach reference (optional - links token to specific outreach)
  outreach_id UUID REFERENCES public.provider_owner_outreach(id) ON DELETE SET NULL,
  
  -- Token scope
  action_scope token_action_scope NOT NULL DEFAULT 'decision',
  
  -- Security constraints
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  
  -- Minimal provider snapshot at token creation (for landing page display)
  provider_name_snapshot TEXT NOT NULL,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for token lookup (hash lookup)
CREATE INDEX idx_provider_owner_action_tokens_hash 
  ON public.provider_owner_action_tokens (token_hash);

-- Index for finding active tokens by provider
CREATE INDEX idx_provider_owner_action_tokens_provider 
  ON public.provider_owner_action_tokens (provider_id, expires_at)
  WHERE consumed_at IS NULL;

-- ==============================================================================
-- MANUAL OUTREACH TASKS TABLE (for Instagram/Phone)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.provider_outreach_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  outreach_id UUID REFERENCES public.provider_owner_outreach(id) ON DELETE SET NULL,
  
  -- Task details
  channel outreach_channel NOT NULL,
  contact_value TEXT NOT NULL,        -- Phone number or Instagram handle
  task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Outcome
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  outcome_note TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for finding pending tasks
CREATE INDEX idx_provider_outreach_tasks_pending 
  ON public.provider_outreach_tasks (task_status, created_at)
  WHERE task_status = 'pending';

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.provider_owner_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_owner_action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_outreach_tasks ENABLE ROW LEVEL SECURITY;

-- Outreach: Only service role can access (backend operations)
-- No public/authenticated user policies - all mutations through RPC

-- Tokens: Public can read valid tokens for landing page (via RPC)
-- No direct table access - all through RPC for security

-- Tasks: Admin-only access
CREATE POLICY "admin_manage_outreach_tasks" ON public.provider_outreach_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ==============================================================================
-- UPDATED_AT TRIGGERS
-- ==============================================================================

-- Trigger function (reuse existing or create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to outreach table
CREATE TRIGGER update_provider_owner_outreach_updated_at
  BEFORE UPDATE ON public.provider_owner_outreach
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to tasks table
CREATE TRIGGER update_provider_outreach_tasks_updated_at
  BEFORE UPDATE ON public.provider_outreach_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- RPC: Validate token and get provider info (public access)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.validate_outreach_token(
  p_token_hash TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  provider_id UUID,
  provider_name TEXT,
  action_scope token_action_scope,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Find token by hash
  SELECT 
    t.id,
    t.provider_id,
    t.provider_name_snapshot,
    t.action_scope,
    t.expires_at,
    t.consumed_at
  INTO v_token
  FROM public.provider_owner_action_tokens t
  WHERE t.token_hash = p_token_hash;
  
  -- Token not found
  IF v_token IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::token_action_scope,
      'Token not found'::TEXT;
    RETURN;
  END IF;
  
  -- Token already consumed
  IF v_token.consumed_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::token_action_scope,
      'Token already used'::TEXT;
    RETURN;
  END IF;
  
  -- Token expired
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::token_action_scope,
      'Token expired'::TEXT;
    RETURN;
  END IF;
  
  -- Valid token
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    v_token.provider_id,
    v_token.provider_name_snapshot,
    v_token.action_scope,
    NULL::TEXT;
END;
$$;

-- Grant execute to public (anonymous users can validate tokens)
GRANT EXECUTE ON FUNCTION public.validate_outreach_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_outreach_token(TEXT) TO authenticated;

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON TABLE public.provider_owner_outreach IS 'Outreach queue for unclaimed providers. Tracks status, approval, and dispatch attempts.';
COMMENT ON TABLE public.provider_owner_action_tokens IS 'Secure tokens for owner decision actions. Hash only stored, expires after 7 days.';
COMMENT ON TABLE public.provider_outreach_tasks IS 'Manual outreach tasks for channels that cannot be automated (phone, Instagram).';
COMMENT ON FUNCTION public.validate_outreach_token(TEXT) IS 'Validate an outreach token and return provider info for landing page.';
