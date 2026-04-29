-- Migration: 060_add_removed_by_owner_status.sql
-- Feature: 038 - Provider Owner Outreach & Claim System
-- Purpose: Add 'removed_by_owner' value to review_status enum

-- ==============================================================================
-- ADD ENUM VALUE
-- ==============================================================================

-- Add 'removed_by_owner' to the review_status enum if it doesn't exist
DO $$
BEGIN
  -- Check if the value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'removed_by_owner' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'review_status')
  ) THEN
    ALTER TYPE review_status ADD VALUE 'removed_by_owner';
  END IF;
END$$;

-- ==============================================================================
-- UPDATE PROVIDER LISTING FUNCTIONS (if any RPC uses review_status filter)
-- ==============================================================================

-- Note: The existing search_providers RPC function filters within the function,
-- but the actual filtering is done in application code via `.eq('review_status', 'approved')`.
-- No RPC changes needed - removed_by_owner will be excluded by the existing 'approved' filter.

-- ==============================================================================
-- COMMENTS
-- ==============================================================================

COMMENT ON TYPE review_status IS 
  'Provider/community service review status. Values: pending, approved, rejected, needs_revision, removed_by_owner';
