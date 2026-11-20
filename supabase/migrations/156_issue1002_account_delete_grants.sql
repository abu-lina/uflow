-- #1002: Account deletion runs in the server route (DELETE /api/user/delete-account)
-- with the service-role client. Reproduce the EXECUTE grants already applied on UAT
-- and prod so DEV and fresh environments match: only service_role may call
-- delete_user_account(uuid) and cleanup_orphaned_files().
-- delete_user_account stays for service-role use; it also refuses an id that is
-- not the caller's own when the call carries a user identity. Body is the
-- baseline's otherwise. Idempotent.

CREATE OR REPLACE FUNCTION public.delete_user_account(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> delete_user_account.user_id THEN
    RAISE EXCEPTION 'delete_user_account: id does not match the caller'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.providers WHERE provider_owner_id = delete_user_account.user_id;
  DELETE FROM public.bookmarks WHERE bookmarks.user_id = delete_user_account.user_id;
  DELETE FROM public.users WHERE users.user_id = delete_user_account.user_id;
  DELETE FROM auth.users WHERE auth.users.id = delete_user_account.user_id;

  -- Log the deletion if deletion_logs table exists (optional)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deletion_logs') THEN
    INSERT INTO public.deletion_logs (user_id, deleted_at, reason)
    VALUES (delete_user_account.user_id, NOW(), 'User requested account deletion');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_orphaned_files() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_files() TO service_role;
