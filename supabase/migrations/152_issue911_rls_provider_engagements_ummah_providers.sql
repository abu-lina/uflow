-- Migration 152: RLS SELECT/INSERT/DELETE policies for provider_engagements
-- and ummah_providers (#911).
--
-- Both tables had RLS enabled in migration 083 but zero policies, blocking
-- all anon/authenticated access through PostgREST.

BEGIN;

-- ummah_providers: public read via join on providers (providers RLS already
-- gates visibility of pending rows to owners/admins).
CREATE POLICY "ummah_providers_select"
  ON public.ummah_providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.provider_id = ummah_providers.provider_id
    )
  );

-- provider_engagements: public read (engagement data is non-sensitive;
-- the joined providers table's own RLS gates which providers are visible).
CREATE POLICY "provider_engagements_select"
  ON public.provider_engagements FOR SELECT
  USING (true);

-- provider_engagements INSERT: owner of the initiating provider, or admin/moderator.
CREATE POLICY "provider_engagements_insert"
  ON public.provider_engagements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.provider_id = provider_engagements.initiating_provider_id
        AND p.provider_owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'moderator')
    )
  );

-- provider_engagements DELETE: owner of the initiating provider, or admin/moderator.
CREATE POLICY "provider_engagements_delete"
  ON public.provider_engagements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.provider_id = provider_engagements.initiating_provider_id
        AND p.provider_owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'moderator')
    )
  );

COMMIT;
