-- =============================================================================
-- Migration 085: M-7 — Advisory SQL Comments (FL-6, FL-12, FL-21)
-- Plan: PLAN-116  Origin: 118  UUID: e7a3f1c9
-- These are documentation-only changes; no schema structure is modified.
-- =============================================================================

-- FL-6: providers.listing_type has no DEFAULT by design
COMMENT ON COLUMN public.providers.listing_type IS
  'Listing type enum (food, store, ummah). NO DEFAULT by design — '
  'every INSERT must explicitly set listing_type. App-layer validation '
  'is required on all provider creation paths.';

-- FL-12: deletion_logs.user_id — intentional absence of FK
COMMENT ON COLUMN public.deletion_logs.user_id IS
  'Auth user who requested deletion. No FK to auth.users by design: '
  'the user row is deleted BEFORE this log is written, so a FK would '
  'cause a constraint violation on every account deletion. The UUID '
  'is retained for audit purposes only.';

-- FL-21: provider_owner_outreach.dispatch_after — 24h cool-down rule
COMMENT ON COLUMN public.provider_owner_outreach.dispatch_after IS
  'UTC timestamp before which this outreach job must not be dispatched. '
  'Used to enforce the 24-hour cool-down period between outreach attempts '
  'for the same provider/user pair. Jobs with dispatch_after > now() '
  'should be skipped by the queue worker.';
