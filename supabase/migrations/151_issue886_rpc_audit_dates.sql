-- #886: Redefine admin_review_provider to set last_verified_at / next_audit_due
-- on food_providers when approving. Migration 150 added the columns;
-- migration 138 defined the function before they existed.

BEGIN;

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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Provider % does not exist', p_provider_id;
  END IF;

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
        last_verified_at = CASE WHEN p_review_status = 'approved'
                             THEN now()
                             ELSE food_providers.last_verified_at END,
        next_audit_due = CASE WHEN p_review_status = 'approved'
                           THEN now() + interval '6 months'
                           ELSE food_providers.next_audit_due END,
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
  'Issue #548/#886: one atomic review decision — persists submitted halal answers (key-presence, NULL round-trips), sets last_verified_at/next_audit_due on food_providers when approving, re-asserts the halal gate on post-write values, then sets review_status + reviewed_by/reviewed_at. Raises NOT_FOUND, FORBIDDEN, CONFLICT, or HALAL_GATE.';

COMMIT;
