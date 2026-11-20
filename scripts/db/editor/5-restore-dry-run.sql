-- Step 5a of 5 (only if you need to undo): RESTORE DRY RUN. Read-only. Paste and run in the SQL Editor.
-- Lists every archived row: "would restore" (untouched since the backfill) or
-- "SKIPPED: edited since backfill" (an admin changed it afterwards; restore leaves it alone).
SELECT p.provider_id, p.provider_name,
       CASE WHEN a.restored_at IS NOT NULL THEN 'already restored'
            WHEN fp.updated_at = a.new_updated_at THEN 'would restore'
            ELSE 'SKIPPED: edited since backfill' END AS state
FROM public.halal_backfill_987_archive a
JOIN public.providers p USING (provider_id)
LEFT JOIN public.food_providers fp USING (provider_id)
ORDER BY state, p.provider_name;
