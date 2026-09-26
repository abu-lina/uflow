-- Migration 133: Location inserts and pending deletes for recommendations (#415)
--
-- UAT failure: recommendations failed at POST /rest/v1/locations with 42501.
-- The locations INSERT policy (migration 101) allowed only
-- provider_owner_id = auth.uid() via an IN-subquery. Recommendations have
-- provider_owner_id = NULL, so the subquery produced NULL and the check never
-- passed. Every recommendation died after its providers row was already
-- inserted, leaving an orphan the 228 gate can never approve — and the
-- compensating delete could not remove it either, because the providers
-- DELETE policy also keys on provider_owner_id only.
--
-- 1. locations INSERT now permits the provider's creator as well as its
--    owner, expressed as EXISTS (...) rather than IN (SELECT ...) so a
--    NULL-producing subquery can never silently evaluate to NULL again.
--    Admin location upserts are unaffected: they run through the SECURITY
--    DEFINER admin_update_provider RPC (migration 102). UPDATE/DELETE on
--    locations stay owner-only — no submission path uses them.
--
-- 2. providers DELETE additionally permits the creator to remove their own
--    row while it is still 'pending', so submission cleanup can actually run
--    for recommendations. The pending condition is deliberate: creating a
--    row must not grant deletion of an approved provider.

BEGIN;

DROP POLICY IF EXISTS "Provider owners can insert locations" ON "public"."locations";
CREATE POLICY "Provider owners and creators can insert locations" ON "public"."locations" FOR INSERT TO "public" WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "public"."providers" "p"
    WHERE (("p"."provider_id" = "locations"."provider_id")
      AND (("p"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))
        OR ("p"."user_created_id" = ( SELECT "auth"."uid"() AS "uid"))))
  )
);

DROP POLICY IF EXISTS "Users can delete their own or admins can delete any providers" ON "public"."providers";
CREATE POLICY "Users can delete their own or admins can delete any providers" ON "public"."providers" FOR DELETE USING (
  (("provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))
    OR (("user_created_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("review_status" = 'pending'::"public"."review_status"))
    OR (EXISTS ( SELECT 1
      FROM "public"."users"
      WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))))
);

COMMIT;
