-- UAT orphan cleanup — Request 255 / Issue #415 / PR #418
--
-- SCOPE: UAT ONLY. Production never received #416 (deploy-hetzner.yml is
-- manual-dispatch; last run 2026-08-16), so it has no orphans from this cause.
--
-- WHY THESE ROWS EXIST
-- PR #416 merged 2026-09-26 13:19 and auto-deployed to UAT. It fixed the
-- providers.listing_type NOT NULL bug, which let the recommend flow reach the
-- next statement: the locations INSERT. That failed with 42501, because the
-- locations INSERT policy (101_plan_151_multi_location.sql:68-77) only ever
-- permitted provider_owner_id = auth.uid(), and a recommendation has
-- provider_owner_id = NULL by design.
--
-- createPrimaryLocation throws from inside a Promise.all that runs BEFORE the
-- extension-row write and its compensating delete, so the provider row was
-- already inserted and nothing removed it. The signature of an affected row is
-- therefore: created after the deploy, still pending, and NO locations row.
-- Relation and badge rows may have landed, since they share that Promise.all.
--
-- Migration 133 on PR #418 fixes the policy and closes the orphan window.
--
--
-- NOTE ON AN EARLIER, BROADER VERSION OF THIS SCRIPT
-- The first draft also matched rows whose listing_type had no corresponding
-- extension row. That over-matched: it caught pre-existing rows whose
-- extension row is in the WRONG table (listing_type = 'store' with a
-- food_providers row), which are real listings with real locations, not
-- orphans. Two were nearly deleted. It also assumed provider_owner_id IS NULL
-- means "recommendation", when imported and seeded rows share that shape.
-- Both clauses are gone. Match on the missing location and the deploy window.
-- That separate wrong-extension-table problem affects 4 rows and is tracked
-- on its own; do not use this script for it.


-- ============================================================
-- STEP 1 — REVIEW. Read-only. Run this first, every time.
-- ============================================================

SELECT
  p.provider_id,
  p.provider_name,
  p.listing_type,
  p.review_status,
  p.created_at,
  p.user_created_id,
  p.provider_owner_id
FROM public.providers p
WHERE p.created_at >= '2026-09-26 13:24:00+00'   -- the UAT deploy that introduced the failure
  AND p.review_status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.provider_id = p.provider_id)
ORDER BY p.created_at DESC;

-- Confirmed result on UAT, 2026-09-26 (three test submissions named "ABC"):
--   4016a673-6f53-4717-b816-f644c92c60cc  13:36:12
--   0298d534-aee3-49e7-9135-2915a5097ac2  13:36:06
--   cae6a06e-77dd-4ae5-b94b-6f37d6ac16f3  13:34:43


-- ============================================================
-- STEP 2 — DELETE. Destructive. Re-run STEP 1 first.
-- ============================================================

BEGIN;

CREATE TEMP TABLE orphan_ids (provider_id uuid PRIMARY KEY);
INSERT INTO orphan_ids (provider_id) VALUES
  ('4016a673-6f53-4717-b816-f644c92c60cc'),
  ('0298d534-aee3-49e7-9135-2915a5097ac2'),
  ('cae6a06e-77dd-4ae5-b94b-6f37d6ac16f3');

-- Safety net. Aborts if any supplied id no longer matches the STEP 1
-- criteria, which is what protects against a stale id list or a row that has
-- since gained a location or been approved.
DO $$
DECLARE
  bad_count integer;
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM orphan_ids o
  WHERE NOT EXISTS (SELECT 1 FROM public.providers p WHERE p.provider_id = o.provider_id);

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Refusing to delete: % supplied id(s) no longer exist. Re-run STEP 1.', missing_count;
  END IF;

  SELECT count(*) INTO bad_count
  FROM orphan_ids o
  JOIN public.providers p USING (provider_id)
  WHERE NOT (
    p.review_status = 'pending'
    AND p.created_at >= '2026-09-26 13:24:00+00'
    AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.provider_id = p.provider_id)
  );

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Refusing to delete: % of the supplied ids no longer match the orphan criteria (approved, gained a location, or outside the window). Re-run STEP 1.', bad_count;
  END IF;
END $$;

-- Children first. Relations and badges share the Promise.all with the failed
-- location insert, so they may exist. Extension rows are written after it, so
-- they should not, but delete defensively.
DELETE FROM public.provider_offers  WHERE provider_id IN (SELECT provider_id FROM orphan_ids);
DELETE FROM public.provider_needs   WHERE provider_id IN (SELECT provider_id FROM orphan_ids);
DELETE FROM public.provider_badges  WHERE provider_id IN (SELECT provider_id FROM orphan_ids);
DELETE FROM public.food_providers   WHERE provider_id IN (SELECT provider_id FROM orphan_ids);
DELETE FROM public.store_providers  WHERE provider_id IN (SELECT provider_id FROM orphan_ids);
DELETE FROM public.providers        WHERE provider_id IN (SELECT provider_id FROM orphan_ids);

-- Expect 3 rows deleted from public.providers. Then:
--   COMMIT;
-- or if anything looks wrong:
--   ROLLBACK;
