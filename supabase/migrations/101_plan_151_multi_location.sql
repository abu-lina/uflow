-- Migration: Multi-location support for providers
-- Plan 151: Creates locations table, indexes, sync trigger, RLS, and backfill
BEGIN;

-- 1. Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  location_name TEXT,
  address_street TEXT,
  address_zip TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'DE',
  location_latitude NUMERIC(10,8),
  location_longitude NUMERIC(11,8),
  opening_hours JSONB,
  show_address BOOLEAN DEFAULT TRUE,
  contact_phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_locations_provider_id ON public.locations (provider_id);
CREATE INDEX IF NOT EXISTS idx_locations_city ON public.locations (address_city);

-- 3. Partial unique index: only one primary location per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_unique_primary
  ON public.locations (provider_id)
  WHERE is_primary = TRUE;

-- 4. Sync trigger to keep providers.address_city in sync with primary location
CREATE OR REPLACE FUNCTION sync_primary_location_city()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_primary THEN
      UPDATE providers p SET address_city = (
        SELECT l.address_city FROM locations l
        WHERE l.provider_id = OLD.provider_id AND l.is_primary = TRUE
        LIMIT 1
      ) WHERE p.provider_id = OLD.provider_id;
    END IF;
    RETURN OLD;
  ELSE
    UPDATE providers p SET address_city = NEW.address_city
    WHERE p.provider_id = NEW.provider_id AND NEW.is_primary = TRUE;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_primary_city ON public.locations;
CREATE TRIGGER trg_sync_primary_city
  AFTER INSERT OR UPDATE OR DELETE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION sync_primary_location_city();

-- 5. RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations are publicly readable"
  ON public.locations
  FOR SELECT
  TO public
  USING (TRUE);

CREATE POLICY "Provider owners can insert locations"
  ON public.locations
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IN (
      SELECT provider_owner_id FROM public.providers
      WHERE provider_id = locations.provider_id
    )
  );

CREATE POLICY "Provider owners can update their locations"
  ON public.locations
  FOR UPDATE
  TO public
  USING (
    auth.uid() IN (
      SELECT provider_owner_id FROM public.providers
      WHERE provider_id = locations.provider_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT provider_owner_id FROM public.providers
      WHERE provider_id = locations.provider_id
    )
  );

CREATE POLICY "Provider owners can delete their locations"
  ON public.locations
  FOR DELETE
  TO public
  USING (
    auth.uid() IN (
      SELECT provider_owner_id FROM public.providers
      WHERE provider_id = locations.provider_id
    )
  );

-- 6. Idempotent backfill: one location per existing provider
INSERT INTO public.locations (
  provider_id, location_name, address_street, address_zip, address_city,
  address_country, location_latitude, location_longitude, opening_hours,
  show_address, contact_phone, is_primary
)
SELECT
  provider_id, NULL, address_street, address_zip, address_city,
  address_country, location_latitude, location_longitude, opening_hours,
  show_address, contact_phone, TRUE
FROM public.providers
WHERE NOT EXISTS (
  SELECT 1 FROM public.locations WHERE locations.provider_id = providers.provider_id
);

COMMIT;
