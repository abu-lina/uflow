-- Step 5a of 5 (only if you need to undo): RESTORE DRY RUN. Read-only. Paste and run in the SQL Editor.
-- Lists every archived row: "would restore" (untouched since the backfill) or a SKIPPED reason:
--   SKIPPED: edited since backfill  : updated_at changed, or an answer is no longer true
--   SKIPPED: provider row deleted   : the provider or its food_providers row is gone
-- Restore trusts updated_at plus the three answers; it cannot see an edit that changed neither.
SELECT a.provider_id, coalesce(p.provider_name, '(provider missing)') AS provider_name,
       CASE WHEN a.restored_at IS NOT NULL THEN 'already restored'
            WHEN p.provider_id IS NULL OR fp.provider_id IS NULL THEN 'SKIPPED: provider row deleted'
            WHEN fp.updated_at = a.new_updated_at
                 AND fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE THEN 'would restore'
            ELSE 'SKIPPED: edited since backfill' END AS state
FROM public.halal_backfill_987_archive a
LEFT JOIN public.providers p ON p.provider_id = a.provider_id
LEFT JOIN public.food_providers fp ON fp.provider_id = a.provider_id
ORDER BY state, provider_name;
