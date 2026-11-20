-- #987: restore the pre-backfill answers from public.halal_backfill_987_archive. Owner-run.
--   psql "$DB_URL" -v finish=COMMIT -f scripts/db/restore-987-food-halal.sql   (default finish=ROLLBACK)
-- Only restores rows whose current answers are still all true, so a later admin edit is not overwritten.
\set ON_ERROR_STOP on
\if :{?finish} \else \set finish ROLLBACK \endif

BEGIN;
DO $$
DECLARE
  v_restored int;
  v_skipped int;
BEGIN
  WITH r AS (
    UPDATE public.food_providers fp
       SET no_alcohol = a.old_no_alcohol, no_pork = a.old_no_pork,
           no_gambling = a.old_no_gambling, updated_at = a.old_updated_at
      FROM public.halal_backfill_987_archive a
     WHERE fp.provider_id = a.provider_id
       AND fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE
    RETURNING fp.provider_id
  )
  SELECT count(*) INTO v_restored FROM r;
  SELECT count(*) - v_restored INTO v_skipped FROM public.halal_backfill_987_archive;
  RAISE NOTICE 'restored % rows, skipped % (edited since backfill)', v_restored, v_skipped;
END $$;
:finish;
