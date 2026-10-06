-- ============================================================
-- Migration 138: Review audit columns + admin_review_provider RPC
-- Issue #548
--
-- Problem: the admin halal check page has no approve/reject action and
--   saves halal answers to localStorage only. Approving means editing
--   Supabase by hand, which records neither who decided nor when.
-- Fix:
--   1. providers gains reviewed_by / reviewed_at (nullable, no backfill —
--      NULL honestly means "decided before these columns existed").
--   2. Re-state migration 129's six DROP NOT NULL / DROP DEFAULT
--      statements idempotently so "not sure" round-trips as NULL even on
--      databases where 129 was never applied (verified: DEV).
--   3. admin_review_provider(): one SECURITY DEFINER transaction that
--      writes the merged halal answers AND the review status, so a
--      failure in either leaves both unchanged (AC 1). The halal gate is
--      re-asserted inside the transaction on the post-write values,
--      closing the race between the app's pre-flight check and the write.
--
-- The p_halal jsonb keys are the extension-table column names
-- (no_alcohol, no_pork, no_gambling, verification_method,
-- has_certificate, certificate_url). Key PRESENCE decides whether a
-- value is written — the same CASE WHEN ? pattern migration 131
-- established — so an explicit JSON null is stored as NULL and an absent
-- key leaves the column untouched.
-- ============================================================

BEGIN;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.providers.reviewed_by IS
  'Admin/moderator who last set review_status via admin_review_provider (#548). NULL on rows decided before this column existed or by system paths — do not read NULL as "never reviewed"; review_status carries that.';
COMMENT ON COLUMN public.providers.reviewed_at IS
  'Timestamp of the last admin_review_provider status change (#548). NULL on rows decided before this column existed.';

-- Idempotent re-statement of migration 129 (DROP NOT NULL / DROP DEFAULT
-- are idempotent): tri-state NULL must be storable regardless of whether
-- 129 ran on this database.
ALTER TABLE public.food_providers
  ALTER COLUMN no_alcohol  DROP NOT NULL,
  ALTER COLUMN no_alcohol  DROP DEFAULT,
  ALTER COLUMN no_pork     DROP NOT NULL,
  ALTER COLUMN no_pork     DROP DEFAULT,
  ALTER COLUMN no_gambling DROP NOT NULL,
  ALTER COLUMN no_gambling DROP DEFAULT;

ALTER TABLE public.store_providers
  ALTER COLUMN no_alcohol  DROP NOT NULL,
  ALTER COLUMN no_alcohol  DROP DEFAULT,
  ALTER COLUMN no_pork     DROP NOT NULL,
  ALTER COLUMN no_pork     DROP DEFAULT,
  ALTER COLUMN no_gambling DROP NOT NULL,
  ALTER COLUMN no_gambling DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.admin_review_provider(
  p_provider_id uuid,
  p_review_status public.review_status,
  p_review_feedback text,
  p_reviewer_id uuid,
  p_halal jsonb DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_type public.listing_type_enum;
  v_no_alcohol boolean;
  v_no_pork boolean;
  v_no_gambling boolean;
  v_ext_found boolean;
  v_denied text[] := ARRAY[]::text[];
  v_unanswered text[] := ARRAY[]::text[];
  v_rows integer;
  v_result jsonb;
BEGIN
  SELECT p.listing_type INTO v_listing_type
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  -- Not found is not a conflict: raise before any write so a missing
  -- provider maps to 404, and 409 stays reserved for a genuine
  -- expected_updated_at mismatch (#548 review).
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Provider % does not exist', p_provider_id;
  END IF;

  -- Defence in depth: the route enforces admin/moderator, but this
  -- function runs SECURITY DEFINER granted to service_role, which
  -- bypasses RLS entirely. Re-assert the reviewer's role here so a
  -- caller that reaches the RPC without the route's check cannot stamp
  -- a decision as a plain user or owner (#548 review).
  IF p_reviewer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = p_reviewer_id
      AND u.role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: reviewer % is not an admin or moderator', p_reviewer_id;
  END IF;

  -- 1) Persist the submitted halal answers (key-presence semantics).
  IF v_listing_type IN ('food', 'store') AND p_halal IS NOT NULL THEN
    IF v_listing_type = 'food' THEN
      INSERT INTO public.food_providers (
        provider_id, no_alcohol, no_pork, no_gambling,
        verification_method, has_certificate, certificate_url, updated_at
      ) VALUES (
        p_provider_id,
        CASE WHEN p_halal ? 'no_alcohol'  THEN (p_halal->>'no_alcohol')::boolean  ELSE NULL END,
        CASE WHEN p_halal ? 'no_pork'     THEN (p_halal->>'no_pork')::boolean     ELSE NULL END,
        CASE WHEN p_halal ? 'no_gambling' THEN (p_halal->>'no_gambling')::boolean ELSE NULL END,
        -- verification_method is NOT NULL: keep migration 131's 'online'
        -- fallback on INSERT so a missing answer cannot violate it.
        COALESCE(NULLIF(p_halal->>'verification_method', ''), 'online'),
        COALESCE((p_halal->>'has_certificate')::boolean, false),
        NULLIF(p_halal->>'certificate_url', ''),
        now()
      )
      ON CONFLICT (provider_id) DO UPDATE SET
        no_alcohol = CASE WHEN p_halal ? 'no_alcohol'
                       THEN (p_halal->>'no_alcohol')::boolean
                       ELSE food_providers.no_alcohol END,
        no_pork = CASE WHEN p_halal ? 'no_pork'
                       THEN (p_halal->>'no_pork')::boolean
                       ELSE food_providers.no_pork END,
        no_gambling = CASE WHEN p_halal ? 'no_gambling'
                       THEN (p_halal->>'no_gambling')::boolean
                       ELSE food_providers.no_gambling END,
        verification_method = CASE WHEN p_halal ? 'verification_method'
                                THEN NULLIF(p_halal->>'verification_method', '')
                                ELSE food_providers.verification_method END,
        has_certificate = CASE WHEN p_halal ? 'has_certificate'
                            THEN (p_halal->>'has_certificate')::boolean
                            ELSE food_providers.has_certificate END,
        certificate_url = CASE WHEN p_halal ? 'certificate_url'
                            THEN NULLIF(p_halal->>'certificate_url', '')
                            ELSE food_providers.certificate_url END,
        updated_at = now();
    ELSE
      INSERT INTO public.store_providers (
        provider_id, no_alcohol, no_pork, no_gambling,
        verification_method, has_certificate, certificate_url, updated_at
      ) VALUES (
        p_provider_id,
        CASE WHEN p_halal ? 'no_alcohol'  THEN (p_halal->>'no_alcohol')::boolean  ELSE NULL END,
        CASE WHEN p_halal ? 'no_pork'     THEN (p_halal->>'no_pork')::boolean     ELSE NULL END,
        CASE WHEN p_halal ? 'no_gambling' THEN (p_halal->>'no_gambling')::boolean ELSE NULL END,
        COALESCE(NULLIF(p_halal->>'verification_method', ''), 'online'),
        COALESCE((p_halal->>'has_certificate')::boolean, false),
        NULLIF(p_halal->>'certificate_url', ''),
        now()
      )
      ON CONFLICT (provider_id) DO UPDATE SET
        no_alcohol = CASE WHEN p_halal ? 'no_alcohol'
                       THEN (p_halal->>'no_alcohol')::boolean
                       ELSE store_providers.no_alcohol END,
        no_pork = CASE WHEN p_halal ? 'no_pork'
                       THEN (p_halal->>'no_pork')::boolean
                       ELSE store_providers.no_pork END,
        no_gambling = CASE WHEN p_halal ? 'no_gambling'
                       THEN (p_halal->>'no_gambling')::boolean
                       ELSE store_providers.no_gambling END,
        verification_method = CASE WHEN p_halal ? 'verification_method'
                                THEN NULLIF(p_halal->>'verification_method', '')
                                ELSE store_providers.verification_method END,
        has_certificate = CASE WHEN p_halal ? 'has_certificate'
                            THEN (p_halal->>'has_certificate')::boolean
                            ELSE store_providers.has_certificate END,
        certificate_url = CASE WHEN p_halal ? 'certificate_url'
                            THEN NULLIF(p_halal->>'certificate_url', '')
                            ELSE store_providers.certificate_url END,
        updated_at = now();
    END IF;
  END IF;

  -- 2) Re-assert the halal gate on the post-write values for approvals.
  --    true = compliant, false = denied, NULL = unanswered. A missing
  --    extension row means every answer is unanswered.
  IF p_review_status = 'approved' AND v_listing_type IN ('food', 'store') THEN
    IF v_listing_type = 'food' THEN
      SELECT true, fp.no_alcohol, fp.no_pork, fp.no_gambling
        INTO v_ext_found, v_no_alcohol, v_no_pork, v_no_gambling
      FROM public.food_providers fp
      WHERE fp.provider_id = p_provider_id;
    ELSE
      SELECT true, sp.no_alcohol, sp.no_pork, sp.no_gambling
        INTO v_ext_found, v_no_alcohol, v_no_pork, v_no_gambling
      FROM public.store_providers sp
      WHERE sp.provider_id = p_provider_id;
    END IF;

    IF v_ext_found IS DISTINCT FROM true THEN
      v_unanswered := ARRAY['no_alcohol', 'no_pork', 'no_gambling'];
    ELSE
      IF v_no_alcohol IS NULL THEN v_unanswered := array_append(v_unanswered, 'no_alcohol');
      ELSIF v_no_alcohol = false THEN v_denied := array_append(v_denied, 'no_alcohol'); END IF;
      IF v_no_pork IS NULL THEN v_unanswered := array_append(v_unanswered, 'no_pork');
      ELSIF v_no_pork = false THEN v_denied := array_append(v_denied, 'no_pork'); END IF;
      IF v_no_gambling IS NULL THEN v_unanswered := array_append(v_unanswered, 'no_gambling');
      ELSIF v_no_gambling = false THEN v_denied := array_append(v_denied, 'no_gambling'); END IF;
    END IF;

    IF array_length(v_denied, 1) IS NOT NULL OR array_length(v_unanswered, 1) IS NOT NULL THEN
      RAISE EXCEPTION 'HALAL_GATE: denied=[%], unanswered=[%]',
        array_to_string(v_denied, ','),
        array_to_string(v_unanswered, ',');
    END IF;
  END IF;

  -- 3) Set the review status with optimistic concurrency.
  UPDATE public.providers SET
    review_status   = p_review_status,
    review_feedback = p_review_feedback,
    reviewed_by     = p_reviewer_id,
    reviewed_at     = now(),
    updated_at      = now()
  WHERE provider_id = p_provider_id
    AND (p_expected_updated_at IS NULL OR updated_at = p_expected_updated_at);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    IF p_expected_updated_at IS NOT NULL THEN
      RAISE EXCEPTION 'CONFLICT: Provider was modified by another reviewer. Please refresh and try again.';
    ELSE
      -- Unreachable once the existence check above ran, unless the row
      -- was deleted inside the transaction. Keep the signal distinct.
      RAISE EXCEPTION 'NOT_FOUND: Provider % does not exist', p_provider_id;
    END IF;
  END IF;

  SELECT to_jsonb(p.*) INTO v_result
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_review_provider(uuid, public.review_status, text, uuid, jsonb, timestamptz) IS
  'Issue #548: one atomic review decision — persists submitted halal answers (key-presence, NULL round-trips), re-asserts the halal gate on post-write values for approvals, then sets review_status + reviewed_by/reviewed_at. Raises NOT_FOUND: for a missing provider, FORBIDDEN: when p_reviewer_id is not an admin/moderator user, CONFLICT: on expected_updated_at mismatch, HALAL_GATE: on failed attestation.';

REVOKE ALL ON FUNCTION public.admin_review_provider(uuid, public.review_status, text, uuid, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_provider(uuid, public.review_status, text, uuid, jsonb, timestamptz) TO service_role;

COMMIT;
