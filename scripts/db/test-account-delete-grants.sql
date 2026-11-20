-- #1002: EXECUTE grants on delete_user_account and cleanup_orphaned_files. LOCAL DB ONLY, always rolls back.
--   psql -X "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f scripts/db/test-account-delete-grants.sql
BEGIN;

DO $$
DECLARE
  v_fn text;
  v_role text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['public.delete_user_account(uuid)', 'public.cleanup_orphaned_files()'] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(v_role, v_fn, 'EXECUTE') THEN
        RAISE EXCEPTION '% must not have EXECUTE on %', v_role, v_fn;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role must have EXECUTE on %', v_fn;
    END IF;
  END LOOP;

  -- A caller with an identity may only pass their own id.
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', true);
  BEGIN
    PERFORM public.delete_user_account('22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'delete_user_account accepted an id that is not the caller''s';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  RAISE NOTICE 'account delete grants: all checks passed';
END $$;

ROLLBACK;
