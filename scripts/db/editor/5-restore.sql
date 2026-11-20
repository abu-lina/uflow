-- Step 5b of 5 (only if you need to undo): RESTORE (commits). Paste and run in the Supabase SQL Editor
-- (click in the editor, deselect any text, then Run).
-- Puts the pre-backfill answers back from public.halal_backfill_987_archive, only for rows untouched
-- since the backfill: food_providers.updated_at still equals the archive's new_updated_at AND all three
-- answers are still true. Restored rows get restored_at set, so a second run restores nothing. The result
-- lists the rows it skipped. Restore trusts updated_at plus the answers; it cannot see an edit that
-- changed neither.
--
-- >>> EDIT THE CONSTANT BELOW BEFORE RUNNING <<<
--   expected_db_name : "postgres". Every Supabase project's database has this name, so this does NOT
--                      tell prod from UAT. Check the project ref in the dashboard URL before every run.
-- To backfill again after a restore, first move the archive aside:
--   ALTER TABLE public.halal_backfill_987_archive RENAME TO halal_backfill_987_archive_1;
DO $$
DECLARE
  expected_db_name text := 'EDIT_ME';
BEGIN
  PERFORM set_config('lock_timeout', '10s', true);
  IF current_database() <> expected_db_name THEN
    RAISE EXCEPTION 'ABORT: connected to database "%", expected_db_name is "%"; nothing changed', current_database(), expected_db_name;
  END IF;

  LOCK TABLE public.food_providers IN SHARE ROW EXCLUSIVE MODE;

  WITH r AS (
    UPDATE public.food_providers fp
       SET no_alcohol = a.old_no_alcohol, no_pork = a.old_no_pork,
           no_gambling = a.old_no_gambling, updated_at = a.old_updated_at
      FROM public.halal_backfill_987_archive a
     WHERE fp.provider_id = a.provider_id
       AND a.restored_at IS NULL
       AND fp.updated_at = a.new_updated_at
       AND fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE
    RETURNING fp.provider_id
  )
  UPDATE public.halal_backfill_987_archive a SET restored_at = now()
   WHERE a.provider_id IN (SELECT provider_id FROM r);
END $$;

-- Result: first row = totals, then every row that was skipped (not restored), with the reason.
SELECT provider_id, provider_name, state
FROM (
  SELECT NULL::uuid AS provider_id, '== TOTAL ==' AS provider_name,
         'restored ' || count(*) FILTER (WHERE restored_at IS NOT NULL)
         || ', skipped ' || count(*) FILTER (WHERE restored_at IS NULL) AS state
  FROM public.halal_backfill_987_archive
  UNION ALL
  SELECT a.provider_id, coalesce(p.provider_name, '(provider missing)'),
         CASE WHEN p.provider_id IS NULL OR fp.provider_id IS NULL THEN 'SKIPPED: provider row deleted'
              ELSE 'SKIPPED: edited since backfill' END
  FROM public.halal_backfill_987_archive a
  LEFT JOIN public.providers p ON p.provider_id = a.provider_id
  LEFT JOIN public.food_providers fp ON fp.provider_id = a.provider_id
  WHERE a.restored_at IS NULL
) x
ORDER BY provider_id IS NOT NULL, provider_name;
