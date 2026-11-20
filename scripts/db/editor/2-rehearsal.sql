-- Step 2 of 5: REHEARSAL. Paste into the Supabase SQL Editor and run. Nothing is saved.
-- Does the real work of step 3 (same locks, same update, same archive, same checks), then ALWAYS ends with
-- an error, so everything is rolled back. The error you want to see is:
--   REHEARSAL OK: N rows would change; rolled back
-- Write N down: step 3 needs it. Any other error starting with ABORT means a check failed; see README.md.
DO $$
DECLARE
  min_approved_food int := 100;
  v_approved int;
  v_missing int;
  v_before int;
  v_candidates int;
  v_changed int;
  v_archived int;
  v_after int;
  v_below int;
BEGIN
  LOCK TABLE public.food_providers IN SHARE ROW EXCLUSIVE MODE;

  CREATE TABLE IF NOT EXISTS public.halal_backfill_987_archive (
    provider_id     uuid PRIMARY KEY,
    old_no_alcohol  boolean,
    old_no_pork     boolean,
    old_no_gambling boolean,
    old_updated_at  timestamptz,
    new_updated_at  timestamptz,
    archived_at     timestamptz NOT NULL DEFAULT now(),
    restored_at     timestamptz
  );
  -- Owner-owned. Not exposed through the Data API.
  ALTER TABLE public.halal_backfill_987_archive ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.halal_backfill_987_archive FROM anon, authenticated;

  SELECT count(*) INTO v_approved FROM public.providers
    WHERE listing_type = 'food' AND review_status = 'approved';
  IF v_approved < min_approved_food THEN
    RAISE EXCEPTION 'ABORT: only % approved food providers (expected about 157); wrong database? nothing changed', v_approved;
  END IF;

  SELECT count(*) INTO v_missing FROM public.providers p
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND NOT EXISTS (SELECT 1 FROM public.food_providers fp WHERE fp.provider_id = p.provider_id);
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'ABORT: % approved food providers have no food_providers row', v_missing;
  END IF;

  SELECT count(*) INTO v_before FROM public.food_providers fp JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND fp.no_alcohol AND fp.no_pork AND fp.no_gambling;
  SELECT count(*) INTO v_candidates FROM public.food_providers fp JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND NOT (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE)
      AND NOT EXISTS (SELECT 1 FROM public.halal_backfill_987_archive a WHERE a.provider_id = fp.provider_id);
  WITH o AS (
    SELECT fp.provider_id, fp.no_alcohol, fp.no_pork, fp.no_gambling, fp.updated_at
    FROM public.food_providers fp
    JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND NOT (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE)
      AND NOT EXISTS (SELECT 1 FROM public.halal_backfill_987_archive a WHERE a.provider_id = fp.provider_id)
    FOR UPDATE OF fp
  ), u AS (
    UPDATE public.food_providers fp
       SET no_alcohol = true, no_pork = true, no_gambling = true, updated_at = now()
      FROM o WHERE fp.provider_id = o.provider_id
    RETURNING o.provider_id, o.no_alcohol AS old_no_alcohol, o.no_pork AS old_no_pork,
              o.no_gambling AS old_no_gambling, o.updated_at AS old_updated_at,
              fp.updated_at AS new_updated_at
  ), ins AS (
    INSERT INTO public.halal_backfill_987_archive
      (provider_id, old_no_alcohol, old_no_pork, old_no_gambling, old_updated_at, new_updated_at)
    SELECT provider_id, old_no_alcohol, old_no_pork, old_no_gambling, old_updated_at, new_updated_at FROM u
    RETURNING provider_id
  )
  SELECT (SELECT count(*) FROM u), (SELECT count(*) FROM ins) INTO v_changed, v_archived;

  SELECT count(*) INTO v_after FROM public.food_providers fp JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND fp.no_alcohol AND fp.no_pork AND fp.no_gambling;
  SELECT count(*) INTO v_below FROM public.food_providers fp JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND NOT (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE);

  IF v_changed <> v_candidates OR v_archived <> v_candidates THEN
    RAISE EXCEPTION 'ABORT: candidates %, changed %, archived %', v_candidates, v_changed, v_archived;
  END IF;
  IF v_below <> 0 OR v_after <> v_before + v_changed THEN
    RAISE EXCEPTION 'ABORT: below the bar after = %, all-true before % + changed % <> after %',
      v_below, v_before, v_changed, v_after;
  END IF;

  RAISE EXCEPTION 'REHEARSAL OK: % rows would change; rolled back', v_changed;
END $$;
