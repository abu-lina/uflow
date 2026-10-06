-- =====================================================================
-- Issue #547 — verification script for migration
--   supabase/migrations/137_issue547_provider_route_visibility.sql
--
-- Run this in the Supabase Dashboard SQL Editor, on DEV
-- (qrekonfhaenjdnjhwdum) FIRST, then on PROD (rdtdtcfntopcxcigkqoq).
--
-- Structure:
--   Part A  — BEFORE. Run alone, copy the numbers out. Read-only.
--   Part B  — apply migration 137 (paste the migration file, not this one).
--   Part C  — AFTER. Same probes. Compare against Part A.
--   Part D  — plan check (performance), read-only.
--
-- Pass/fail rules are stated inline. Everything here is read-only except
-- Part B, which is the migration itself, and the two blocks that create a
-- throwaway row (both wrapped in an explicit ROLLBACK).
--
-- Why a probe harness and not plain SELECTs: RLS is evaluated against
-- `auth.uid()`, which reads the `request.jwt.claim.sub` setting. The
-- `probe_visibility` helper below sets that per call inside a transaction
-- that is always rolled back, so it never leaves state behind.
-- =====================================================================


-- =====================================================================
-- PART A — BEFORE
-- =====================================================================

-- A0. Which role am I, and will the SECURITY DEFINER functions end up
--     owned by it? Expect `postgres`. Anything else (e.g. a personal role)
--     means the definer's privileges differ from what was reviewed: STOP.
SELECT current_user AS will_own_the_functions,
       rolbypassrls,
       rolsuper
FROM pg_roles
WHERE rolname = current_user;

-- A1. Full policy inventory on public.providers.
--     EXPECT exactly 4 rows: one SELECT, one INSERT, one UPDATE, one DELETE.
--     The SELECT one MUST be named exactly
--       'Public can view approved, users can view own, admins can view a'
--     (75 chars truncated to 63 by Postgres). If the name differs, migration
--     137's DROP POLICY IF EXISTS will no-op and its CREATE POLICY will add a
--     SECOND permissive SELECT policy. Permissive policies OR together, so
--     that is not a privilege leak, but it leaves an orphaned policy: STOP
--     and fix the name before applying.
SELECT policyname, cmd, permissive, roles::text, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'providers'
ORDER BY cmd, policyname;

-- A2. Is the pre-137 SELECT policy the migration-130 text (which includes
--     the user_created_id clause) or the older 001_baseline text (which does
--     NOT)? Grep the output of A1's `qual` for 'user_created_id'.
--     EXPECT true. If false, migration 130 was never applied here and the
--     "creator sees their own pending row" criterion is currently broken
--     independently of #547. Migration 137 fixes it either way, because
--     provider_is_visible carries the user_created_id clause itself.
SELECT position('user_created_id' in qual) > 0 AS policy_has_creator_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'providers' AND cmd = 'SELECT';

-- A3. ANON BASELINE. This is the single most important number in this file.
--     On DEV the expected value is 24. On PROD it was 419 at diagnose time.
--     Record it. Part C must return the SAME number.
BEGIN;
  SELECT set_config('request.jwt.claim.sub', '', true);
  SELECT set_config('request.jwt.claims',    '', true);
  SET LOCAL ROLE anon;
  SELECT count(*) AS anon_visible_providers_BEFORE FROM public.providers;
  SELECT review_status, count(*) AS n
  FROM public.providers GROUP BY review_status ORDER BY review_status;
ROLLBACK;

-- A4. Ground truth with RLS bypassed, for comparison.
SELECT review_status, count(*) AS n
FROM public.providers
GROUP BY review_status
ORDER BY review_status;

-- A5. Do the two function names already exist? EXPECT 0 rows.
--     (Non-zero means a previous partial apply; CREATE OR REPLACE will
--     overwrite, which is fine, but you should know.)
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.provolatile
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('provider_is_visible', 'provider_route_visibility');

-- A6. Enum labels referenced by the migration must all exist.
--     EXPECT review_status to contain 'approved'; user_role to contain
--     'admin' and 'moderator'.
SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('review_status', 'user_role')
GROUP BY t.typname;

-- A7. The PK column the RPC filters on. EXPECT one row: provider_id, uuid.
--     (There is NO `id` column on public.providers.)
SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS type
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
WHERE i.indrelid = 'public.providers'::regclass AND i.indisprimary;

-- A8. Everything else in the database that reads public.providers and could
--     be affected by a SELECT-policy rewrite. Review the list; none of these
--     should change behaviour, because 137 is semantics-preserving (see C2),
--     but confirm nothing here depends on the policy's literal text.
--   A8a. views / matviews
SELECT c.relkind, n.nspname, c.relname
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class c ON c.oid = r.ev_class
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE d.refobjid = 'public.providers'::regclass
  AND d.classid = 'pg_rewrite'::regclass
  AND c.relname <> 'providers'
GROUP BY 1, 2, 3 ORDER BY 2, 3;
--   A8b. functions / RPCs whose body mentions providers (SECURITY DEFINER
--        ones bypass RLS and are unaffected; note which are INVOKER).
SELECT n.nspname, p.proname, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosrc ILIKE '%providers%'
ORDER BY p.prosecdef, p.proname;
--   A8c. triggers on providers (unaffected by a SELECT policy; listed for
--        completeness).
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'public.providers'::regclass AND NOT tgisinternal;


-- =====================================================================
-- PART B — APPLY THE MIGRATION
--
-- Paste the full contents of
--   supabase/migrations/137_issue547_provider_route_visibility.sql
-- into the SQL Editor and run it. It is wrapped in BEGIN/COMMIT and is
-- idempotent (CREATE OR REPLACE FUNCTION x2, DROP POLICY IF EXISTS +
-- CREATE POLICY, GRANT/REVOKE), so a re-run is safe.
--
-- Do NOT apply via `supabase db push`: DEV's migration history has
-- remote-only versions (006, 20260928202818) and ~20 unapplied local ones,
-- so a push would land unrelated migrations wholesale.
-- =====================================================================


-- =====================================================================
-- PART C — AFTER
-- =====================================================================

-- C1. ANON BASELINE AGAIN. HARD GATE.
--     MUST equal the A3 number exactly (DEV: 24). The distribution MUST
--     still be approved-only. If either moved, ROLL BACK the policy to the
--     migration-130 text immediately and do not touch PROD.
BEGIN;
  SELECT set_config('request.jwt.claim.sub', '', true);
  SELECT set_config('request.jwt.claims',    '', true);
  SET LOCAL ROLE anon;
  SELECT count(*) AS anon_visible_providers_AFTER FROM public.providers;
  SELECT review_status, count(*) AS n
  FROM public.providers GROUP BY review_status ORDER BY review_status;
ROLLBACK;

-- C2. Predicate equivalence against the migration-130 text, row by row,
--     for every caller class, with RLS bypassed so all 1,669 rows are
--     compared. EXPECT 0 rows from each query below.
--     This is the real proof that 137 changes nothing observable.
--
--     Pick one real uid per class first:
SELECT 'admin_or_moderator' AS class, user_id FROM public.users
WHERE role = ANY (ARRAY['admin'::public.user_role, 'moderator'::public.user_role]) LIMIT 1;
SELECT 'plain_user' AS class, user_id FROM public.users
WHERE role = 'user'::public.user_role LIMIT 1;
SELECT 'creator_of_a_pending_row' AS class, user_created_id AS user_id
FROM public.providers
WHERE review_status <> 'approved'::public.review_status AND user_created_id IS NOT NULL
LIMIT 1;

--     Then run this for EACH uid above, substituting :probe_uid.
--     '' (empty) covers the anon case.
BEGIN;
  SELECT set_config('request.jwt.claim.sub', '<<PASTE_UID_OR_EMPTY>>', true);
  SELECT count(*) AS rows_where_137_disagrees_with_130
  FROM public.providers p
  WHERE public.provider_is_visible(p.review_status, p.user_created_id, p.provider_owner_id)
     IS DISTINCT FROM COALESCE(
          (p.review_status = 'approved'::public.review_status)
          OR (p.provider_owner_id = (SELECT auth.uid()))
          OR (p.user_created_id   = (SELECT auth.uid()))
          OR EXISTS (SELECT 1 FROM public.users u
                     WHERE u.user_id = (SELECT auth.uid())
                       AND u.role = ANY (ARRAY['admin'::public.user_role,
                                               'moderator'::public.user_role])),
          false);
  -- EXPECT 0.
ROLLBACK;

-- C3. Policy inventory again. EXPECT exactly the same 4 policies as A1,
--     with the SELECT one's qual now reading
--       provider_is_visible(review_status, user_created_id, provider_owner_id)
--     EXPECT no duplicate SELECT policy (see the A1 warning).
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'providers'
ORDER BY cmd, policyname;

SELECT count(*) AS select_policy_count  -- EXPECT 1
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'providers' AND cmd = 'SELECT';

-- C4. Function metadata. EXPECT:
--       provider_is_visible        owner postgres, prosecdef f, provolatile s
--       provider_route_visibility  owner postgres, prosecdef t, provolatile s
--     and the owner MUST be a role with BYPASSRLS or at least unrestricted
--     SELECT on providers (check A0): the definer has to be able to read a
--     hidden row for the 'hidden' vs 'absent' distinction to be computed at
--     all. If the owner is RLS-restricted, hidden rows report 'absent' —
--     still a 404, so not a security problem, but then the creator/admin
--     200 case silently breaks. VERIFY WITH C6, not by reading this.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       p.provolatile,
       p.proconfig,            -- EXPECT {search_path=public} on the RPC
       p.proacl::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('provider_is_visible', 'provider_route_visibility');

-- C5. Grants, explicitly. EXPECT for each function: anon=X, authenticated=X.
--     NOTE a reviewed finding: provider_route_visibility has
--     REVOKE ALL FROM PUBLIC, but provider_is_visible does NOT, so PUBLIC
--     retains the default EXECUTE on it (proacl shows a bare `=X/postgres`
--     entry). That is not a data leak (the function reads no rows that the
--     caller could not already reach, and returns a boolean), but it is
--     inconsistent with the sibling function and non-minimal. Optional
--     tightening, safe to run:
--       REVOKE ALL ON FUNCTION public.provider_is_visible(
--         public.review_status, uuid, uuid) FROM PUBLIC;
--       GRANT EXECUTE ON FUNCTION public.provider_is_visible(
--         public.review_status, uuid, uuid) TO anon, authenticated;
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authn_exec,
       has_function_privilege('public',        p.oid, 'EXECUTE') AS public_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('provider_is_visible', 'provider_route_visibility');

-- C6. THE VISIBILITY PROBE — the acceptance matrix, end to end.
--     Creates one production-shaped pending row (provider_owner_id NULL,
--     which is how all 1,127 real pending rows look) plus one approved row,
--     runs the RPC and a direct RLS-filtered read as four caller classes,
--     then ROLLS BACK. Nothing is left behind.
--
--     EXPECTED OUTPUT (12 rows):
--       who         | provider | rpc       | rls_row_visible
--       anon        | approved | visible   | t
--       anon        | pending  | hidden    | f
--       anon        | absent   | absent    | f
--       creator     | approved | visible   | t
--       creator     | pending  | visible   | t     <-- the #547 fix
--       creator     | absent   | absent    | f
--       admin       | approved | visible   | t
--       admin       | pending  | visible   | t     <-- the #547 fix
--       admin       | absent   | absent    | f
--       unrelated   | approved | visible   | t
--       unrelated   | pending  | hidden    | f     <-- no leak
--       unrelated   | absent   | absent    | f
--
--     Any 't' in the `unrelated`/`anon` + `pending` cells is a data leak:
--     STOP, do not go to PROD.
BEGIN;

  CREATE TEMP TABLE probe_ids (label text, uid uuid);
  INSERT INTO probe_ids
    SELECT 'admin', user_id FROM public.users
     WHERE role = ANY (ARRAY['admin'::public.user_role,'moderator'::public.user_role])
     LIMIT 1;
  INSERT INTO probe_ids
    SELECT 'unrelated', user_id FROM public.users
     WHERE role = 'user'::public.user_role
       AND user_id NOT IN (SELECT uid FROM probe_ids)
     LIMIT 1;
  INSERT INTO probe_ids
    SELECT 'creator', user_id FROM public.users
     WHERE user_id NOT IN (SELECT uid FROM probe_ids)
     LIMIT 1;
  INSERT INTO probe_ids VALUES ('anon', NULL);

  CREATE TEMP TABLE probe_rows (label text, provider_id uuid);
  WITH creator AS (SELECT uid FROM probe_ids WHERE label = 'creator')
  INSERT INTO public.providers
    (provider_name, review_status, user_created_id, provider_owner_id)
  SELECT '#547 probe pending', 'pending'::public.review_status, creator.uid, NULL
  FROM creator
  RETURNING 'pending', provider_id;
  INSERT INTO probe_rows SELECT 'pending', provider_id
    FROM public.providers WHERE provider_name = '#547 probe pending';

  INSERT INTO public.providers
    (provider_name, review_status, user_created_id, provider_owner_id)
  VALUES ('#547 probe approved', 'approved'::public.review_status, NULL, NULL);
  INSERT INTO probe_rows SELECT 'approved', provider_id
    FROM public.providers WHERE provider_name = '#547 probe approved';

  INSERT INTO probe_rows
    VALUES ('absent', '00000000-0000-0000-0000-000000000000');

  -- One pass per caller class. Repeat this DO-free block manually for each
  -- label if your SQL Editor will not let you SET ROLE in a loop; the
  -- function form below works in the Dashboard editor.
  CREATE OR REPLACE FUNCTION pg_temp.probe() RETURNS TABLE(
    who text, provider text, rpc text, rls_row_visible boolean
  ) LANGUAGE plpgsql AS $probe$
  DECLARE i record; r record;
  BEGIN
    FOR i IN SELECT * FROM probe_ids ORDER BY label LOOP
      PERFORM set_config('request.jwt.claim.sub', COALESCE(i.uid::text, ''), true);
      PERFORM set_config('request.jwt.claims',
        CASE WHEN i.uid IS NULL THEN ''
             ELSE json_build_object('sub', i.uid::text, 'role', 'authenticated')::text END,
        true);
      FOR r IN SELECT * FROM probe_rows ORDER BY label LOOP
        who := i.label; provider := r.label;
        rpc := public.provider_route_visibility(r.provider_id);
        rls_row_visible := public.provider_is_visible(
          (SELECT review_status    FROM public.providers WHERE provider_id = r.provider_id),
          (SELECT user_created_id  FROM public.providers WHERE provider_id = r.provider_id),
          (SELECT provider_owner_id FROM public.providers WHERE provider_id = r.provider_id));
        rls_row_visible := COALESCE(rls_row_visible, false);
        RETURN NEXT;
      END LOOP;
    END LOOP;
  END $probe$;

  SELECT * FROM pg_temp.probe();

ROLLBACK;  -- MANDATORY: discards both probe rows and the temp function.

-- C7. Confirm the probe rows are gone. EXPECT 0.
SELECT count(*) AS leftover_probe_rows
FROM public.providers WHERE provider_name LIKE '#547 probe%';

-- C8. End-to-end through PostgREST, outside SQL. Run from a shell, not
--     here, once the app is deployed:
--       agent-output/artifacts/547-repro.sh 2e3f9942-8cce-4570-a474-24cba76963f0
--     EXPECT: GREEN only after BOTH migration 137 and the app deploy land.


-- =====================================================================
-- PART D — PLAN CHECK (performance), read-only
-- =====================================================================

-- D1. Reviewed finding, confirmed against PGlite (Postgres WASM): Postgres
--     does NOT inline provider_is_visible into the policy. The plan shows
--       Filter: provider_is_visible(review_status, user_created_id, provider_owner_id)
--     rather than the expanded disjunction. Consequence: the admin
--     EXISTS-on-users subquery is no longer row-independent, so it can no
--     longer be hoisted into an InitPlan the way migration
--     034_optimize_rls_policies_performance deliberately arranged. For an
--     authenticated caller scanning non-approved rows it becomes one users
--     lookup per provider row.
--
--     Confirm the plan shape on the real database, as an authenticated
--     non-admin, and compare total runtime against the A-phase baseline.
BEGIN;
  SELECT set_config('request.jwt.claim.sub', '<<PASTE_PLAIN_USER_UID>>', true);
  SET LOCAL ROLE authenticated;
  EXPLAIN (ANALYZE, BUFFERS)
    SELECT provider_id FROM public.providers;
  EXPLAIN (ANALYZE, BUFFERS)
    SELECT provider_id FROM public.providers
    WHERE review_status <> 'approved'::public.review_status;
ROLLBACK;

-- D2. Same two plans as an admin (the worst case: every row falls through
--     to the EXISTS clause).
BEGIN;
  SELECT set_config('request.jwt.claim.sub', '<<PASTE_ADMIN_UID>>', true);
  SET LOCAL ROLE authenticated;
  EXPLAIN (ANALYZE, BUFFERS)
    SELECT provider_id FROM public.providers;
ROLLBACK;

-- D3. Single-row lookup, the shape the /p/<id> guard and page actually use.
--     This is the only plan that matters for the user-facing fix, and it is
--     a PK lookup, so the per-row cost of D1 does not apply.
--     EXPECT an Index Scan on the providers PK.
BEGIN;
  SELECT set_config('request.jwt.claim.sub', '<<PASTE_ADMIN_UID>>', true);
  SET LOCAL ROLE authenticated;
  EXPLAIN (ANALYZE, BUFFERS)
    SELECT provider_id FROM public.providers
    WHERE provider_id = '2e3f9942-8cce-4570-a474-24cba76963f0';
ROLLBACK;

-- If D1/D2 regress materially versus A-phase timings, the mitigation is to
-- keep provider_is_visible as the shared definition for the RPC but leave
-- the RLS policy on the inlined migration-130 text. That re-opens the
-- "one definition" property, so prefer measuring before changing.


-- =====================================================================
-- ROLLBACK PLAN (if C1 or C6 fails)
-- =====================================================================
-- Restore the migration-130 SELECT policy verbatim and drop the new
-- functions. The app's middleware guard fails open when the RPC is missing,
-- so this restores pre-#547 behaviour, NOT a broken state — but see the
-- Code Review comment: with the RPC absent, a signed-in caller on a
-- non-approved /p/<id> gets a soft 404 (HTTP 200 + not-found body). Roll
-- the app deploy back together with this.
--
-- BEGIN;
--   DROP POLICY IF EXISTS "Public can view approved, users can view own, admins can view a"
--     ON public.providers;
--   CREATE POLICY "Public can view approved, users can view own, admins can view a"
--     ON public.providers FOR SELECT USING (
--       (("review_status" = 'approved'::"public"."review_status")
--         OR ("provider_owner_id" = ( SELECT "auth"."uid"()))
--         OR ("user_created_id"   = ( SELECT "auth"."uid"()))
--         OR (EXISTS ( SELECT 1 FROM "public"."users"
--              WHERE (("users"."user_id" = ( SELECT "auth"."uid"()))
--                AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role",
--                                                 'moderator'::"public"."user_role"])))))));
--   DROP FUNCTION IF EXISTS public.provider_route_visibility(uuid);
--   DROP FUNCTION IF EXISTS public.provider_is_visible(public.review_status, uuid, uuid);
-- COMMIT;
