-- Step 4 of 5: VERIFY after step 3. Read-only. Paste into the Supabase SQL Editor and run.
-- >>> EDIT THE FOUR CONSTANTS IN "params" BELOW BEFORE RUNNING <<<
--   expected_changed : N from step 2.
--   all_true_before  : "all_true_before" from the TOTAL row of step 1.
--   approved_food    : "approved_food" from the TOTAL row of step 1.
--   other_rows       : "other_rows" from the TOTAL row of step 1.
-- The last row, ALL CHECKS, must say true. Any false row is a problem; see README.md.
-- Run it right after step 3: a later admin edit of a backfilled row makes check 2 fail on purpose.
WITH params AS (
  SELECT -1::int AS expected_changed, -1::int AS all_true_before, -1::int AS approved_food, -1::int AS other_rows
), approved AS (
  SELECT fp.provider_id,
         (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE) AS all_true
  FROM public.food_providers fp
  JOIN public.providers p USING (provider_id)
  WHERE p.listing_type = 'food' AND p.review_status = 'approved'
), archived AS (
  SELECT count(*) AS n FROM public.halal_backfill_987_archive
), checks AS (
  SELECT 1 AS ord, '1 archived rows = expected_changed' AS check_name,
         pr.expected_changed::text AS expected,
         (SELECT n FROM archived)::text AS actual,
         (SELECT n FROM archived) = pr.expected_changed AS ok
  FROM params pr
  UNION ALL
  SELECT 2, '2 changed rows (archived rows still holding the backfilled values) = archived rows',
         (SELECT n FROM archived)::text,
         (SELECT count(*) FROM public.halal_backfill_987_archive a
            JOIN public.food_providers fp USING (provider_id)
           WHERE fp.updated_at = a.new_updated_at AND a.restored_at IS NULL
             AND fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE)::text,
         (SELECT n FROM archived) =
         (SELECT count(*) FROM public.halal_backfill_987_archive a
            JOIN public.food_providers fp USING (provider_id)
           WHERE fp.updated_at = a.new_updated_at AND a.restored_at IS NULL
             AND fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE)
  UNION ALL
  SELECT 3, '3 approved food rows below the bar', '0',
         (SELECT count(*) FROM approved WHERE NOT all_true)::text,
         (SELECT count(*) FROM approved WHERE NOT all_true) = 0
  UNION ALL
  SELECT 4, '4 all-true count = all_true_before + expected_changed',
         (pr.all_true_before + pr.expected_changed)::text,
         (SELECT count(*) FROM approved WHERE all_true)::text,
         (SELECT count(*) FROM approved WHERE all_true) = pr.all_true_before + pr.expected_changed
  FROM params pr
  UNION ALL
  SELECT 5, '5 approved food count = approved_food (step 1)',
         pr.approved_food::text,
         (SELECT count(*) FROM approved)::text,
         (SELECT count(*) FROM approved) = pr.approved_food
  FROM params pr
  UNION ALL
  SELECT 6, '6 food_providers rows outside approved food = other_rows (step 1)',
         pr.other_rows::text,
         ((SELECT count(*) FROM public.food_providers) - (SELECT count(*) FROM approved))::text,
         ((SELECT count(*) FROM public.food_providers) - (SELECT count(*) FROM approved)) = pr.other_rows
  FROM params pr
  UNION ALL
  -- Every row stamped by the run is an archived row, so no store or non-approved row was touched.
  SELECT 7, '7 rows outside the archive stamped with the run timestamp', '0',
         (SELECT count(*) FROM public.food_providers fp
           WHERE fp.updated_at IN (SELECT new_updated_at FROM public.halal_backfill_987_archive)
             AND NOT EXISTS (SELECT 1 FROM public.halal_backfill_987_archive a WHERE a.provider_id = fp.provider_id))::text,
         (SELECT count(*) FROM public.food_providers fp
           WHERE fp.updated_at IN (SELECT new_updated_at FROM public.halal_backfill_987_archive)
             AND NOT EXISTS (SELECT 1 FROM public.halal_backfill_987_archive a WHERE a.provider_id = fp.provider_id)) = 0
)
SELECT check_name, expected, actual, ok
FROM (
  SELECT ord, check_name, expected, actual, ok FROM checks
  UNION ALL
  SELECT 99, 'ALL CHECKS', 'all true', '', bool_and(ok) FROM checks
) z
ORDER BY ord;
