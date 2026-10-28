-- #807: records which delivery platforms were searched by name and address per provider,
-- so a rerun never searches the same platform twice. Failed requests are not recorded and retry.
-- Writes go through the service role (bypasses RLS); no other role gets access.
CREATE TABLE IF NOT EXISTS public.provider_platform_searches (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('wolt', 'lieferando', 'ubereats')),
  searched_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL CHECK (outcome IN ('accepted', 'staged', 'no_match')),
  PRIMARY KEY (provider_id, platform)
);

-- Supabase default privileges give anon and authenticated ALL on new public tables;
-- narrow them so RLS is not the only barrier (same exposure as #699).
REVOKE ALL ON public.provider_platform_searches FROM PUBLIC, anon, authenticated;

ALTER TABLE public.provider_platform_searches ENABLE ROW LEVEL SECURITY;
