CREATE TABLE IF NOT EXISTS public.provider_delivery_links (
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wolt', 'lieferando', 'ubereats')),
  platform_url TEXT NOT NULL,
  platform_slug TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_provider_delivery_links_platform
  ON public.provider_delivery_links(platform);

CREATE INDEX IF NOT EXISTS idx_provider_delivery_links_active
  ON public.provider_delivery_links(provider_id) WHERE is_active = true;

ALTER TABLE public.provider_delivery_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON public.provider_delivery_links
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service role all"
  ON public.provider_delivery_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_provider_delivery_links_updated_at
    BEFORE UPDATE ON public.provider_delivery_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
