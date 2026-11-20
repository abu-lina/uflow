-- Step 3 of 5: REAL RUN (commits). Paste into the Supabase SQL Editor and run.
-- Sets no_alcohol / no_pork / no_gambling = true on every approved food provider that is not yet all
-- true, and archives the old values in public.halal_backfill_987_archive (the same table the psql
-- version uses). Nothing is written unless every check passes; any failed check aborts the whole run.
--
-- >>> EDIT THE TWO CONSTANTS BELOW BEFORE RUNNING <<<
--   expected_db_name : the name of the database you mean to change (Supabase shows it as "postgres").
--   expected_changed : N from step 2 ("REHEARSAL OK: N rows would change").
-- Leave min_approved_food alone. The run aborts if the values are not edited or do not match.
DO $$
DECLARE
  expected_db_name text := 'EDIT_ME';
  expected_changed int := -1;
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
  IF current_database() <> expected_db_name THEN
    RAISE EXCEPTION 'ABORT: connected to database "%", expected_db_name is "%"; nothing changed', current_database(), expected_db_name;
  END IF;
  IF expected_changed < 0 THEN
    RAISE EXCEPTION 'ABORT: set expected_changed to N from step 2; nothing changed';
  END IF;

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
    RAISE EXCEPTION 'ABORT: % approved food providers have no food_providers row; nothing changed', v_missing;
  END IF;

  SELECT count(*) INTO v_before FROM public.food_providers fp JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND fp.no_alcohol AND fp.no_pork AND fp.no_gambling;
  SELECT count(*) INTO v_candidates FROM public.food_providers fp JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
      AND NOT (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE)
      AND NOT EXISTS (SELECT 1 FROM public.halal_backfill_987_archive a WHERE a.provider_id = fp.provider_id);
  IF v_candidates <> expected_changed THEN
    RAISE EXCEPTION 'ABORT: found % rows to change, expected_changed is %; nothing changed', v_candidates, expected_changed;
  END IF;

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

  IF v_changed <> expected_changed OR v_archived <> expected_changed THEN
    RAISE EXCEPTION 'ABORT: expected %, changed %, archived %; nothing changed', expected_changed, v_changed, v_archived;
  END IF;
  IF v_below <> 0 OR v_after <> v_before + v_changed THEN
    RAISE EXCEPTION 'ABORT: below the bar after = %, all-true before % + changed % <> after %; nothing changed',
      v_below, v_before, v_changed, v_after;
  END IF;

  EXECUTE format('COMMENT ON TABLE public.halal_backfill_987_archive IS %L',
    'backfill-987 applied via SQL Editor script; changed ' || v_changed || ' rows at ' || now()::text);
END $$;

-- Result of the run: archived rows in total (compare with N, then run step 4).
SELECT count(*) AS archived_rows, obj_description('public.halal_backfill_987_archive'::regclass) AS marker
FROM public.halal_backfill_987_archive;
