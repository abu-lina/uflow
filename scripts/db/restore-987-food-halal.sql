-- #987: restore the pre-backfill answers from public.halal_backfill_987_archive. Owner-run, psql 13+, -X.
--   Dry run (default; lists rows it would restore and rows it would skip, by name):
--     psql -X "$DB_URL" -f scripts/db/restore-987-food-halal.sql
--   Real run:
--     psql -X "$DB_URL" -v mode=run -v finish=COMMIT -f scripts/db/restore-987-food-halal.sql   (default finish=ROLLBACK)
-- Restores only rows untouched since the backfill (food_providers.updated_at equals the archive's
-- new_updated_at). Anything an admin confirmed or edited since is skipped and listed. Restored rows get
-- restored_at set, so a second restore is a no-op. Purge caches (CDN / ISR) after a restore.
-- Re-applying the backfill after a restore: move the archive aside first (see the backfill header),
-- otherwise restored rows count as already backfilled.
SELECT :VERSION_NUM < 130000 AS old_psql \gset
\if :old_psql
  \echo 'REFUSING: psql 13+ required'
  \quit
\endif
\set ON_ERROR_STOP on
\if :{?mode} \else \set mode dry \endif
\if :{?finish} \else \set finish ROLLBACK \endif
SELECT (:'mode' = 'run') AS is_run, (:'mode' NOT IN ('dry', 'run') OR :'finish' NOT IN ('COMMIT', 'ROLLBACK')) AS bad_args \gset
\if :bad_args
  \echo 'REFUSING: mode must be dry or run; finish must be COMMIT or ROLLBACK'
  \quit
\endif

BEGIN;
SET LOCAL lock_timeout = '10s';
\echo 'target:' :DBNAME 'on' :HOST ':' :PORT
LOCK TABLE public.food_providers IN SHARE ROW EXCLUSIVE MODE;

\if :is_run
DO $$
DECLARE
  v_restored int;
  v_pending int;
BEGIN
  SELECT count(*) INTO v_pending FROM public.halal_backfill_987_archive WHERE restored_at IS NULL;
  WITH r AS (
    UPDATE public.food_providers fp
       SET no_alcohol = a.old_no_alcohol, no_pork = a.old_no_pork,
           no_gambling = a.old_no_gambling, updated_at = a.old_updated_at
      FROM public.halal_backfill_987_archive a
     WHERE fp.provider_id = a.provider_id
       AND a.restored_at IS NULL
       AND fp.updated_at = a.new_updated_at
    RETURNING fp.provider_id
  ), m AS (
    UPDATE public.halal_backfill_987_archive a SET restored_at = now()
     WHERE a.provider_id IN (SELECT provider_id FROM r)
    RETURNING 1
  )
  SELECT count(*) INTO v_restored FROM m;
  RAISE NOTICE 'restored % rows, skipped % (edited since the backfill)', v_restored, v_pending - v_restored;
END $$;
\endif

-- Skipped rows (edited since the backfill, so not restored), by name; in dry mode, also what would restore.
SELECT p.provider_id, p.provider_name,
       CASE WHEN a.restored_at IS NOT NULL THEN 'already restored'
            WHEN fp.updated_at = a.new_updated_at THEN 'would restore'
            ELSE 'SKIPPED: edited since backfill' END AS state
FROM public.halal_backfill_987_archive a
JOIN public.providers p USING (provider_id)
LEFT JOIN public.food_providers fp USING (provider_id)
WHERE NOT :'is_run'::boolean OR a.restored_at IS NULL
ORDER BY state, p.provider_name;

\if :is_run
  :finish;
\else
  ROLLBACK;
\endif
