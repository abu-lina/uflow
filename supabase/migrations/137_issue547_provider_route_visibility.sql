-- Migration 137: shared provider visibility predicate + edge-guard RPC (#547)
--
-- The /p/<id> route guard (middleware) used to check existence with an anon
-- select on providers. Anon RLS exposes only review_status='approved', so
-- every pending/rejected provider answered 404 — including for the admin or
-- the user who created it (1,127 pending rows were unreachable).
--
-- This migration makes "who may see this provider" a single definition:
--
--   1. provider_is_visible(...) — a pure SQL predicate: approved for
--      everyone; the creator (user_created_id), the owner
--      (provider_owner_id), and admins/moderators for non-approved rows.
--      It touches no tables itself, so it cannot recurse when used inside
--      an RLS policy, and it is the one definition both the SELECT policy
--      and the edge guard consume.
--
--   2. The providers SELECT policy is rewritten to delegate to it. The
--      semantics are identical to the migration-130 text (approved OR owner
--      OR creator OR admin/moderator) — this changes nothing observable,
--      only where the rule lives.
--
--   3. provider_route_visibility(uuid) — a security-definer RPC for the
--      middleware guard. It returns only 'visible' | 'hidden' | 'absent',
--      never row data, so an unauthorized caller learns nothing. When the
--      definer cannot read a hidden row it reports 'absent' — both map to
--      404, so no oracle leaks.

BEGIN;

CREATE OR REPLACE FUNCTION public.provider_is_visible(
  p_review_status     public.review_status,
  p_user_created_id   uuid,
  p_provider_owner_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_review_status = 'approved'::public.review_status
      OR (
        (SELECT auth.uid()) IS NOT NULL
        AND (
             (SELECT auth.uid()) = p_user_created_id
          OR (SELECT auth.uid()) = p_provider_owner_id
          OR EXISTS (
            SELECT 1
            FROM public.users
            WHERE users.user_id = (SELECT auth.uid())
              AND users.role = ANY (ARRAY['admin'::public.user_role, 'moderator'::public.user_role])
          )
        )
      );
$$;

GRANT EXECUTE ON FUNCTION public.provider_is_visible(public.review_status, uuid, uuid)
  TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view approved, users can view own, admins can view a"
  ON public.providers;

CREATE POLICY "Public can view approved, users can view own, admins can view a"
  ON public.providers FOR SELECT
  USING (public.provider_is_visible(review_status, user_created_id, provider_owner_id));

CREATE OR REPLACE FUNCTION public.provider_route_visibility(p_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT review_status, user_created_id, provider_owner_id
    INTO r
    FROM public.providers
    WHERE provider_id = p_provider_id;

  IF NOT FOUND THEN
    RETURN 'absent';
  END IF;

  IF public.provider_is_visible(r.review_status, r.user_created_id, r.provider_owner_id) THEN
    RETURN 'visible';
  ELSE
    RETURN 'hidden';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provider_route_visibility(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_route_visibility(uuid) TO anon, authenticated;

COMMIT;
