-- #987: admin_review_provider gate, 3x3x3 answer grid. LOCAL DB ONLY, rolls back.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f scripts/db/test-halal-gate.sql
-- Expects a seeded local DB with one admin user and one approved food provider.
BEGIN;

DO $$
DECLARE
  v_pid uuid;
  v_admin uuid;
  v_vals boolean[] := ARRAY[true, false, NULL];
  a boolean; b boolean; c boolean;
  v_err text;
  v_passed boolean;
  v_lva timestamptz;
  v_cases int := 0;
BEGIN
  -- Prod has 157+ approved food providers alone; the local seed is a few dozen rows.
  IF (SELECT count(*) FROM public.providers) > 150 THEN
    RAISE EXCEPTION 'refusing to run: this does not look like the local seed DB';
  END IF;
  SELECT user_id INTO v_admin FROM public.users WHERE role = 'admin' LIMIT 1;
  SELECT provider_id INTO v_pid FROM public.providers
    WHERE listing_type = 'food' AND review_status = 'approved' LIMIT 1;
  IF v_admin IS NULL OR v_pid IS NULL THEN RAISE EXCEPTION 'seed data missing'; END IF;

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
      IF v_err NOT LIKE 'HALAL_GATE:%' THEN RAISE; END IF;
      v_passed := false;
    END;
    v_cases := v_cases + 1;
    IF v_passed IS DISTINCT FROM (a IS TRUE AND b IS TRUE AND c IS TRUE) THEN
      RAISE EXCEPTION 'grid (%,%,%): passed=% (expected only true,true,true)', a, b, c, v_passed;
    END IF;
    IF v_passed THEN
      SELECT last_verified_at INTO v_lva FROM public.food_providers WHERE provider_id = v_pid;
      IF v_lva IS NULL THEN RAISE EXCEPTION 'approve with all true did not set last_verified_at'; END IF;
    ELSIF (SELECT review_status FROM public.providers WHERE provider_id = v_pid) <> 'pending' THEN
      RAISE EXCEPTION 'status changed on gate failure (%,%,%)', a, b, c;
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
      IF v_err NOT LIKE 'HALAL_GATE:%' THEN RAISE; END IF;
      v_passed := false;
    END;
    v_cases := v_cases + 1;
    IF v_passed IS DISTINCT FROM (a IS TRUE AND b IS TRUE AND c IS TRUE) THEN
      RAISE EXCEPTION 'payload grid (%,%,%): passed=%', a, b, c, v_passed;
    END IF;
    IF NOT v_passed AND EXISTS (
      SELECT 1 FROM public.food_providers
      WHERE provider_id = v_pid AND NOT (no_alcohol AND no_pork AND no_gambling)
    ) THEN
      RAISE EXCEPTION 'failed gate did not roll back the payload (%,%,%)', a, b, c;
    END IF;
  END LOOP; END LOOP; END LOOP;

  -- No food_providers row and no payload: all three unanswered, status unchanged.
  DELETE FROM public.food_providers WHERE provider_id = v_pid;
  UPDATE public.providers SET review_status = 'pending' WHERE provider_id = v_pid;
  BEGIN
    PERFORM public.admin_review_provider(v_pid, 'approved', NULL, v_admin);
    RAISE EXCEPTION 'approve without a food_providers row succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err NOT LIKE 'HALAL_GATE: denied=[], unanswered=[no_alcohol,no_pork,no_gambling]' THEN
      RAISE EXCEPTION 'unexpected error for missing row: %', v_err;
    END IF;
  END;
  IF (SELECT review_status FROM public.providers WHERE provider_id = v_pid) <> 'pending' THEN
    RAISE EXCEPTION 'status changed for missing row';
  END IF;

  RAISE NOTICE 'PASS: % grid cases + missing-row case', v_cases;
END $$;

ROLLBACK;
