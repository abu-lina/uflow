-- #987 prod backfill: every approved food provider gets no_alcohol / no_pork /
-- no_gambling = true (owner decision, 2026-11-20). Hand-run by the OWNER; not a migration.
--
--   Dry run (read-only, lists every row that would flip, names included):
--     psql "$DB_URL" -v mode=dry -f scripts/db/backfill-987-food-halal.sql
--   Rehearsal (does the work, then rolls back; default finish):
--     psql "$DB_URL" -v mode=run -f scripts/db/backfill-987-food-halal.sql
--   Real run (commits; -v i_am_prod=yes confirms $DB_URL is prod, not UAT or a copy):
--     psql "$DB_URL" -v mode=run -v finish=COMMIT -v i_am_prod=yes -f scripts/db/backfill-987-food-halal.sql
--   Local testing against a small DB only: add -v allow_small=1
--
-- Safety: one transaction; the old values are archived from the same UPDATE ... RETURNING
-- (rows are locked first, so a concurrent edit cannot desync archive and update); only
-- rows not yet archived are touched, so a re-run changes nothing and never rewrites the
-- archive; aborts if archived != changed. Backfilled rows are exactly the rows in
-- public.halal_backfill_987_archive (re-audit query at the bottom). Undo:
-- scripts/db/restore-987-food-halal.sql. Run the gate migration (155) right after this.
\set ON_ERROR_STOP on
\if :{?mode} \else \set mode dry \endif
\if :{?finish} \else \set finish ROLLBACK \endif
\if :{?allow_small} \else \set allow_small 0 \endif
\if :{?i_am_prod} \else \set i_am_prod no \endif
SELECT (:'mode' = 'run') AS is_run \gset

BEGIN;
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS public.halal_backfill_987_archive (
  provider_id     uuid PRIMARY KEY,
  old_no_alcohol  boolean,
  old_no_pork     boolean,
  old_no_gambling boolean,
  old_updated_at  timestamptz,
  archived_at     timestamptz NOT NULL DEFAULT now()
);
-- Owner-owned. Not exposed through the Data API.
ALTER TABLE public.halal_backfill_987_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.halal_backfill_987_archive FROM anon, authenticated;

-- Guard: a real commit needs an explicit prod confirmation (the row count cannot tell prod from a copy).
SELECT (:'mode' = 'run' AND :'finish' = 'COMMIT' AND :allow_small <> 1 AND :'i_am_prod' <> 'yes') AS unconfirmed \gset
\if :unconfirmed
  \echo 'REFUSING: a COMMIT run needs -v i_am_prod=yes (confirm DB_URL is prod)'
  ROLLBACK;
  \quit
\endif

-- Guard: refuse an empty or non-prod-looking DB (prod has 157 approved food providers).
SELECT count(*) AS approved_food FROM public.providers
  WHERE listing_type = 'food' AND review_status = 'approved' \gset
SELECT (:approved_food = 0 OR (:approved_food < 100 AND :allow_small <> 1)) AS refuse \gset
\if :refuse
  \echo 'REFUSING: approved food providers =' :approved_food '(expected ~157; local test? add -v allow_small=1)'
  ROLLBACK;
  \quit
\endif

-- Guard: every approved food provider must already have a food_providers row.
SELECT count(*) AS missing_count,
       count(*) > 0 AS missing_rows FROM public.providers p
  WHERE p.listing_type = 'food' AND p.review_status = 'approved'
    AND NOT EXISTS (SELECT 1 FROM public.food_providers fp WHERE fp.provider_id = p.provider_id) \gset
\if :missing_rows
  \echo 'REFUSING: approved food providers without a food_providers row =' :missing_count
  ROLLBACK;
  \quit
\endif

SELECT count(*) AS before_all_true FROM public.food_providers fp
  JOIN public.providers p USING (provider_id)
  WHERE p.listing_type = 'food' AND p.review_status = 'approved'
    AND fp.no_alcohol AND fp.no_pork AND fp.no_gambling \gset
\echo 'approved food providers:' :approved_food ', all three true before:' :before_all_true

\if :is_run
DO $$
DECLARE
  v_changed int;
  v_archived int;
BEGIN
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
              o.no_gambling AS old_no_gambling, o.updated_at AS old_updated_at
  ), ins AS (
    INSERT INTO public.halal_backfill_987_archive
      (provider_id, old_no_alcohol, old_no_pork, old_no_gambling, old_updated_at)
    SELECT provider_id, old_no_alcohol, old_no_pork, old_no_gambling, old_updated_at FROM u
    RETURNING provider_id
  )
  SELECT (SELECT count(*) FROM u), (SELECT count(*) FROM ins) INTO v_changed, v_archived;

  IF v_changed <> v_archived THEN
    RAISE EXCEPTION 'ABORT: changed % rows but archived %', v_changed, v_archived;
  END IF;
  RAISE NOTICE 'changed % rows, archived % rows', v_changed, v_archived;
END $$;

SELECT count(*) AS after_all_true FROM public.food_providers fp
  JOIN public.providers p USING (provider_id)
  WHERE p.listing_type = 'food' AND p.review_status = 'approved'
    AND fp.no_alcohol AND fp.no_pork AND fp.no_gambling \gset
\echo 'all three true after:' :after_all_true
\else
-- Dry run: what would flip. Rows with an explicit false first; those are the ones to read.
SELECT p.provider_name, p.address_city AS city,
       fp.no_alcohol, fp.no_pork, fp.no_gambling,
       (fp.no_alcohol IS FALSE OR fp.no_pork IS FALSE OR fp.no_gambling IS FALSE) AS has_explicit_false
FROM public.food_providers fp
JOIN public.providers p USING (provider_id)
WHERE p.listing_type = 'food' AND p.review_status = 'approved'
  AND NOT (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE)
  AND NOT EXISTS (SELECT 1 FROM public.halal_backfill_987_archive a WHERE a.provider_id = fp.provider_id)
ORDER BY has_explicit_false DESC, p.provider_name;
\endif

\if :is_run
  :finish;
\else
  ROLLBACK;
\endif

-- Re-audit backfilled rows later (they show a bronze seal on the strength of the owner's decision):
--   SELECT p.provider_name, a.old_no_alcohol, a.old_no_pork, a.old_no_gambling, a.archived_at
--   FROM public.halal_backfill_987_archive a JOIN public.providers p USING (provider_id)
--   ORDER BY (a.old_no_alcohol IS FALSE OR a.old_no_pork IS FALSE OR a.old_no_gambling IS FALSE) DESC, p.provider_name;
