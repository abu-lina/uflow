-- #764: automated pre-approval screening signals per provider.
-- Writes go through the service role (bypasses RLS); only admins can read.
CREATE TABLE IF NOT EXISTS public.provider_screenings (
  screening_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('google_maps_apify', 'delivery_menu', 'website')),
  status text NOT NULL CHECK (status IN ('clear', 'review', 'flagged')),
  -- array of {code, term, snippet, url, source}
  flags jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(flags) = 'array'),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_screenings_provider_created
  ON public.provider_screenings (provider_id, created_at DESC);

-- Supabase default privileges give anon and authenticated ALL on new public tables;
-- narrow them so RLS is not the only barrier (same exposure as #699).
REVOKE ALL ON public.provider_screenings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.provider_screenings TO authenticated;

ALTER TABLE public.provider_screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read provider screenings" ON public.provider_screenings;
CREATE POLICY "Admins can read provider screenings"
  ON public.provider_screenings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.user_id = (SELECT auth.uid())
        AND users.role = 'admin'::public.user_role
    )
  );
