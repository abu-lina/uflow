-- Step 5b of 5 (only if you need to undo): RESTORE (commits). Paste and run in the Supabase SQL Editor.
-- Puts the pre-backfill answers back from public.halal_backfill_987_archive, only for rows untouched
-- since the backfill (food_providers.updated_at still equals the archive's new_updated_at). Restored rows
-- get restored_at set, so a second run restores nothing. The result lists the rows it skipped.
-- To backfill again after a restore, first move the archive aside:
--   ALTER TABLE public.halal_backfill_987_archive RENAME TO halal_backfill_987_archive_1;
DO $$
BEGIN
  LOCK TABLE public.food_providers IN SHARE ROW EXCLUSIVE MODE;

  WITH r AS (
    UPDATE public.food_providers fp
       SET no_alcohol = a.old_no_alcohol, no_pork = a.old_no_pork,
           no_gambling = a.old_no_gambling, updated_at = a.old_updated_at
      FROM public.halal_backfill_987_archive a
     WHERE fp.provider_id = a.provider_id
       AND a.restored_at IS NULL
       AND fp.updated_at = a.new_updated_at
    RETURNING fp.provider_id
  )
  UPDATE public.halal_backfill_987_archive a SET restored_at = now()
   WHERE a.provider_id IN (SELECT provider_id FROM r);
END $$;

-- Result: first row = totals, then every row that was skipped because it was edited since the backfill.
SELECT provider_id, provider_name, state
FROM (
  SELECT 0 AS ord, NULL::uuid AS provider_id, '== TOTAL ==' AS provider_name,
         'restored ' || count(*) FILTER (WHERE restored_at IS NOT NULL)
         || ', skipped ' || count(*) FILTER (WHERE restored_at IS NULL) AS state
  FROM public.halal_backfill_987_archive
  UNION ALL
  SELECT 1, p.provider_id, p.provider_name, 'SKIPPED: edited since backfill'
  FROM public.halal_backfill_987_archive a
  JOIN public.providers p USING (provider_id)
  WHERE a.restored_at IS NULL
) x
ORDER BY ord, provider_name;
