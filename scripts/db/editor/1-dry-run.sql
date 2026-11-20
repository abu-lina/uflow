-- Step 1 of 5: DRY RUN. Read-only; nothing changes. Paste and run in the Supabase SQL Editor.
-- Lists every approved food provider the backfill would change (an answer that is not true yet),
-- with the current three answers. The first row is the TOTAL: candidates (this is N), approved food
-- providers, and how many already have all three true (write that last number down for step 4).
-- Run it before step 3; it does not look at the archive table, so after a run it can list rows that
-- were edited back to false (step 3 would still skip them).
SELECT provider_id, provider_name, city, no_alcohol, no_pork, no_gambling,
       candidates, approved_food, all_true_before
FROM (
  WITH approved AS (
    SELECT p.provider_id, p.provider_name, p.address_city AS city,
           fp.no_alcohol, fp.no_pork, fp.no_gambling,
           NOT (fp.no_alcohol IS TRUE AND fp.no_pork IS TRUE AND fp.no_gambling IS TRUE) AS is_candidate
    FROM public.food_providers fp
    JOIN public.providers p USING (provider_id)
    WHERE p.listing_type = 'food' AND p.review_status = 'approved'
  ), tot AS (
    SELECT count(*) FILTER (WHERE is_candidate) AS candidates,
           count(*) AS approved_food,
           count(*) FILTER (WHERE NOT is_candidate) AS all_true_before
    FROM approved
  )
  SELECT 0 AS ord, false AS has_false, NULL::uuid AS provider_id, '== TOTAL ==' AS provider_name,
         NULL::text AS city, NULL::boolean AS no_alcohol, NULL::boolean AS no_pork, NULL::boolean AS no_gambling,
         t.candidates, t.approved_food, t.all_true_before
  FROM tot t
  UNION ALL
  SELECT 1, (a.no_alcohol IS FALSE OR a.no_pork IS FALSE OR a.no_gambling IS FALSE), a.provider_id, a.provider_name,
         a.city, a.no_alcohol, a.no_pork, a.no_gambling,
         t.candidates, t.approved_food, t.all_true_before
  FROM approved a CROSS JOIN tot t
  WHERE a.is_candidate
) x
ORDER BY ord, has_false DESC, provider_name;
