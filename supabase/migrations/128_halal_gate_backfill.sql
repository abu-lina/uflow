-- Migration 128: Backfill halal attestation gate
-- Plan 228: Revert approved food/store providers to 'pending' when their
-- halal attestation is incomplete (any of no_alcohol, no_pork, no_gambling
-- is false/null) or when the extension table row is missing entirely.
--
-- Public queries already filter by review_status = 'approved', so reverting
-- to 'pending' hides these providers until an admin re-approves them after
-- the attestation is completed.

BEGIN;

-- Food providers: missing or incomplete attestation
UPDATE public.providers p
SET review_status = 'pending',
    updated_at    = now()
WHERE p.listing_type = 'food'
  AND p.review_status = 'approved'
  AND (
    -- No extension row at all
    NOT EXISTS (
      SELECT 1 FROM public.food_providers fp WHERE fp.provider_id = p.provider_id
    )
    -- Or any attestation is false/null
    OR EXISTS (
      SELECT 1 FROM public.food_providers fp
      WHERE fp.provider_id = p.provider_id
        AND (
          fp.no_alcohol  IS NOT TRUE
          OR fp.no_pork  IS NOT TRUE
          OR fp.no_gambling IS NOT TRUE
        )
    )
  );

-- Store providers: missing or incomplete attestation
UPDATE public.providers p
SET review_status = 'pending',
    updated_at    = now()
WHERE p.listing_type = 'store'
  AND p.review_status = 'approved'
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.store_providers sp WHERE sp.provider_id = p.provider_id
    )
    OR EXISTS (
      SELECT 1 FROM public.store_providers sp
      WHERE sp.provider_id = p.provider_id
        AND (
          sp.no_alcohol  IS NOT TRUE
          OR sp.no_pork  IS NOT TRUE
          OR sp.no_gambling IS NOT TRUE
        )
    )
  );

COMMIT;
