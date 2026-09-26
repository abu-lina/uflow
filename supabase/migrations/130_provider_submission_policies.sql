-- Migration 130: Provider submission policies (Plan 255 / #415)
--
-- 1. Constrain review_status on client inserts. The previous insert policy
--    let a direct API caller submit review_status='approved'. Client inserts
--    now require an authenticated user submitting 'pending' as themselves —
--    anonymous submissions are no longer possible (Plan 255: recommending
--    requires login). Admin/moderator inserts keep the previous behaviour,
--    and service_role bypasses RLS entirely, so the admin review path and
--    backfill migrations are unaffected.
--
-- 2. Widen the self-read policy so a creator can read back their own
--    pending submission (OR user_created_id = auth.uid()). Pending rows
--    remain invisible to everyone else.

BEGIN;

DROP POLICY IF EXISTS "Allow provider inserts" ON "public"."providers";
CREATE POLICY "Allow provider inserts" ON "public"."providers" FOR INSERT WITH CHECK (
  (EXISTS ( SELECT 1
    FROM "public"."users"
    WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))
  OR (
    ("review_status" = 'pending'::"public"."review_status")
    AND
      ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND ("user_created_id" = ( SELECT "auth"."uid"() AS "uid")))
  )
);

DROP POLICY IF EXISTS "Public can view approved, users can view own, admins can view a" ON "public"."providers";
CREATE POLICY "Public can view approved, users can view own, admins can view a" ON "public"."providers" FOR SELECT USING (
  (("review_status" = 'approved'::"public"."review_status")
    OR ("provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))
    OR ("user_created_id" = ( SELECT "auth"."uid"() AS "uid"))
    OR (EXISTS ( SELECT 1
      FROM "public"."users"
      WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))))
);

COMMIT;
