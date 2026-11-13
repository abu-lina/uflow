-- #886: Add audit date columns to food_providers for halal verification tracking.
ALTER TABLE food_providers
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_audit_due  TIMESTAMPTZ;

-- Backfill from providers.reviewed_at where a review has been done.
UPDATE food_providers fp
SET last_verified_at = p.reviewed_at,
    next_audit_due   = p.reviewed_at + INTERVAL '6 months'
FROM providers p
WHERE p.provider_id = fp.provider_id
  AND p.reviewed_at IS NOT NULL
  AND fp.last_verified_at IS NULL;
