-- #987: admin_review_provider gate. LOCAL DB ONLY, always rolls back.
--   psql -X "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f scripts/db/test-halal-gate.sql
-- Covers: EXECUTE grants, 3x3x3 grid (stored answers, no payload), the same grid via payload with rollback of the
-- answers on failure, missing row, audit dates, non-approve statuses, CONFLICT, and a store listing.
-- Expects a seeded local DB with one admin user and one approved food provider with a food_providers row.
BEGIN;

DO $$
DECLARE
  v_pid uuid;
  v_admin uuid;
  v_vals boolean[] := ARRAY[true, false, NULL];
  a boolean; b boolean; c boolean;
  v_err text;
  v_passed boolean;
  v_row public.food_providers;
  v_cases int := 0;
BEGIN
  -- Prod has 157+ approved food providers alone; the local seed is a few dozen rows.
  IF (SELECT count(*) FROM public.providers) > 150 THEN
    RAISE EXCEPTION 'refusing to run: this does not look like the local seed DB';
  END IF;
  SELECT user_id INTO v_admin FROM public.users WHERE role = 'admin' ORDER BY user_id LIMIT 1;
  SELECT p.provider_id INTO v_pid FROM public.providers p
    JOIN public.food_providers fp USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved' ORDER BY p.provider_id LIMIT 1;
  IF v_admin IS NULL OR v_pid IS NULL THEN RAISE EXCEPTION 'seed data missing'; END IF;

  -- Grants: only service_role may execute the RPC (migration 155).
  IF has_function_privilege('anon', 'public.admin_review_provider(uuid, public.review_status, text, uuid, jsonb, timestamptz)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.admin_review_provider(uuid, public.review_status, text, uuid, jsonb, timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon or authenticated can still execute admin_review_provider';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.admin_review_provider(uuid, public.review_status, text, uuid, jsonb, timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute admin_review_provider';
  END IF;
  -- Everything below runs as service_role, the role every caller uses.
  SET LOCAL ROLE service_role;

  -- Grid: stored answers, approve with no payload.
  FOREACH a IN ARRAY v_vals LOOP FOREACH b IN ARRAY v_vals LOOP FOREACH c IN ARRAY v_vals LOOP
    UPDATE public.food_providers
      SET no_alcohol = a, no_pork = b, no_gambling = c, last_verified_at = NULL, next_audit_due = NULL
      WHERE provider_id = v_pid;
    UPDATE public.providers SET review_status = 'pending' WHERE provider_id = v_pid;
    v_passed := true;
    BEGIN
      PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin);
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      IF v_err NOT LIKE 'HALAL_GATE:%' THEN RAISE EXCEPTION 'unexpected error (%,%,%): %', a, b, c, v_err; END IF;
      v_passed := false;
    END;
    v_cases := v_cases + 1;
    IF v_passed IS DISTINCT FROM (a IS TRUE AND b IS TRUE AND c IS TRUE) THEN
      RAISE EXCEPTION 'grid (%,%,%): passed=% (expected only true,true,true)', a, b, c, v_passed;
    END IF;
    SELECT * INTO v_row FROM public.food_providers WHERE provider_id = v_pid;
    IF v_passed THEN
      IF v_row.last_verified_at IS NULL OR v_row.next_audit_due IS NULL THEN
        RAISE EXCEPTION 'approve with all true did not set last_verified_at and next_audit_due';
      END IF;
      IF v_row.next_audit_due < v_row.last_verified_at + interval '5 months' THEN
        RAISE EXCEPTION 'next_audit_due is not ~6 months after last_verified_at';
      END IF;
    ELSE
      IF (SELECT review_status FROM public.providers WHERE provider_id = v_pid) <> 'pending' THEN
        RAISE EXCEPTION 'status changed on gate failure (%,%,%)', a, b, c;
      END IF;
      IF v_row.last_verified_at IS NOT NULL THEN
        RAISE EXCEPTION 'audit dates set on gate failure (%,%,%)', a, b, c;
      END IF;
    END IF;
  END LOOP; END LOOP; END LOOP;

  -- Same grid via the payload path; a failed gate must roll back the payload.
  FOREACH a IN ARRAY v_vals LOOP FOREACH b IN ARRAY v_vals LOOP FOREACH c IN ARRAY v_vals LOOP
    UPDATE public.food_providers
      SET no_alcohol = true, no_pork = true, no_gambling = true, last_verified_at = NULL, next_audit_due = NULL
      WHERE provider_id = v_pid;
    UPDATE public.providers SET review_status = 'pending' WHERE provider_id = v_pid;
    v_passed := true;
    BEGIN
      PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin,
        jsonb_build_object('no_alcohol', a, 'no_pork', b, 'no_gambling', c));
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      IF v_err NOT LIKE 'HALAL_GATE:%' THEN RAISE EXCEPTION 'unexpected error (%,%,%): %', a, b, c, v_err; END IF;
      v_passed := false;
    END;
    v_cases := v_cases + 1;
    IF v_passed IS DISTINCT FROM (a IS TRUE AND b IS TRUE AND c IS TRUE) THEN
      RAISE EXCEPTION 'payload grid (%,%,%): passed=%', a, b, c, v_passed;
    END IF;
    SELECT * INTO v_row FROM public.food_providers WHERE provider_id = v_pid;
    IF v_passed AND (v_row.last_verified_at IS NULL OR v_row.next_audit_due IS NULL) THEN
      RAISE EXCEPTION 'payload approve did not set the audit dates (%,%,%)', a, b, c;
    END IF;
    IF NOT v_passed AND NOT (v_row.no_alcohol AND v_row.no_pork AND v_row.no_gambling) THEN
      RAISE EXCEPTION 'failed gate did not roll back the payload (%,%,%)', a, b, c;
    END IF;
  END LOOP; END LOOP; END LOOP;

  -- Non-approve statuses are not gated and do not stamp the audit dates.
  UPDATE public.food_providers
    SET no_alcohol = false, no_pork = NULL, no_gambling = false, last_verified_at = NULL, next_audit_due = NULL
    WHERE provider_id = v_pid;
  PERFORM public.admin_review_provider(v_pid, 'needs_revision', 'x', v_admin);
  PERFORM public.admin_review_provider(v_pid, 'rejected', 'x', v_admin);
  IF (SELECT last_verified_at FROM public.food_providers WHERE provider_id = v_pid) IS NOT NULL THEN
    RAISE EXCEPTION 'non-approve status stamped the audit dates';
  END IF;

  -- CONFLICT: stale expected_updated_at on a passing approval.
  UPDATE public.food_providers
    SET no_alcohol = true, no_pork = true, no_gambling = true WHERE provider_id = v_pid;
  v_passed := true;
  BEGIN
    PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin, NULL, now() - interval '1 year');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err NOT LIKE 'CONFLICT:%' THEN RAISE EXCEPTION 'expected CONFLICT, got: %', v_err; END IF;
    v_passed := false;
  END;
  IF v_passed THEN RAISE EXCEPTION 'stale expected_updated_at did not raise CONFLICT'; END IF;

  -- No food_providers row and no payload: all three unanswered, status unchanged.
  DELETE FROM public.food_providers WHERE provider_id = v_pid;
  UPDATE public.providers SET review_status = 'pending' WHERE provider_id = v_pid;
  v_err := NULL;
  BEGIN
    PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  END;
  IF v_err IS NULL THEN RAISE EXCEPTION 'approve without a food_providers row succeeded'; END IF;
  IF v_err <> 'HALAL_GATE: denied=[], unanswered=[no_alcohol,no_pork,no_gambling]' THEN
    RAISE EXCEPTION 'unexpected error for missing row: %', v_err;
  END IF;
  IF (SELECT review_status FROM public.providers WHERE provider_id = v_pid) <> 'pending' THEN
    RAISE EXCEPTION 'status changed for missing row';
  END IF;

  -- Store listing: behaviour unchanged (still gated on its own answers, no food_providers write).
  BEGIN
    UPDATE public.providers SET listing_type = 'store', review_status = 'pending' WHERE provider_id = v_pid;
    INSERT INTO public.store_providers (provider_id, no_alcohol, no_pork, no_gambling)
      VALUES (v_pid, true, true, false);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SKIP store case (cannot build a store row locally): %', SQLERRM;
    RAISE NOTICE 'PASS: % grid cases + status, CONFLICT and missing-row cases', v_cases;
    RETURN;
  END;
  v_err := NULL;
  BEGIN
    PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  END;
  IF v_err IS NULL OR v_err NOT LIKE 'HALAL_GATE: denied=[no_gambling]%' THEN
    RAISE EXCEPTION 'store with a false should hit the gate, got: %', v_err;
  END IF;
  UPDATE public.store_providers SET no_gambling = true WHERE provider_id = v_pid;
  PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin);
  IF EXISTS (SELECT 1 FROM public.food_providers WHERE provider_id = v_pid) THEN
    RAISE EXCEPTION 'store approval wrote a food_providers row';
  END IF;

  RAISE NOTICE 'PASS: % grid cases + status, CONFLICT, missing-row and store cases', v_cases;
END $$;

ROLLBACK;
