-- Public reads limited to approved providers; admins and the provider
-- owner can still see pending/rejected rows via their own policies.
CREATE POLICY "Allow public read on approved food_providers"
  ON public.food_providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.provider_id = food_providers.provider_id
        AND p.review_status = 'approved'
    )
    OR (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.provider_id = food_providers.provider_id
        AND p.provider_owner_id = auth.uid()
    )
  );
