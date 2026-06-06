import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 101 multi-location support', () => {
  const migrationPath = [
    join(process.cwd(), 'supabase', 'migrations', '101_plan_151_multi_location.sql'),
    join(process.cwd(), 'supabase', 'migrations', 'archive', '101_plan_151_multi_location.sql'),
  ].find((candidate) => existsSync(candidate));
  if (!migrationPath) {
    throw new Error('Migration 101 file not found in active or archive path.');
  }
  const sql = readFileSync(migrationPath, 'utf8');

  it('wraps everything in a transaction', () => {
    expect(sql).toContain('BEGIN;');
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
  });

  it('creates locations table with all required columns', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.locations');
    expect(sql).toContain('location_id UUID PRIMARY KEY');
    expect(sql).toContain('provider_id UUID NOT NULL');
    expect(sql).toContain('REFERENCES public.providers(provider_id)');
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql).toContain('location_name TEXT');
    expect(sql).toContain('address_street TEXT');
    expect(sql).toContain('address_zip TEXT');
    expect(sql).toContain('address_city TEXT');
    expect(sql).toContain('address_country TEXT DEFAULT');
    expect(sql).toContain('location_latitude NUMERIC');
    expect(sql).toContain('location_longitude NUMERIC');
    expect(sql).toContain('opening_hours JSONB');
    expect(sql).toContain('show_address BOOLEAN DEFAULT TRUE');
    expect(sql).toContain('contact_phone TEXT');
    expect(sql).toContain('is_primary BOOLEAN DEFAULT FALSE');
    expect(sql).toContain('created_at TIMESTAMPTZ DEFAULT now()');
    expect(sql).toContain('updated_at TIMESTAMPTZ DEFAULT now()');
  });

  it('creates indexes on provider_id and address_city', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_locations_provider_id');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_locations_city');
  });

  it('creates partial unique index for exactly one primary per provider', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_unique_primary');
    expect(sql).toContain('WHERE is_primary = TRUE');
  });

  it('creates sync trigger function for providers.address_city', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION sync_primary_location_city()');
    expect(sql).toContain('RETURNS TRIGGER');
    expect(sql).toContain('UPDATE providers p SET address_city');
    expect(sql).toContain('TG_OP = \'DELETE\'');
    expect(sql).toContain('OLD.is_primary');
    expect(sql).toContain('NEW.is_primary = TRUE');
  });

  it('creates trigger on locations table', () => {
    expect(sql).toContain('CREATE TRIGGER trg_sync_primary_city');
    expect(sql).toContain('AFTER INSERT OR UPDATE OR DELETE ON public.locations');
  });

  it('enables RLS and adds policies', () => {
    expect(sql).toContain('ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY "Locations are publicly readable"');
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('CREATE POLICY "Provider owners can insert locations"');
    expect(sql).toContain('FOR INSERT');
    expect(sql).toContain('CREATE POLICY "Provider owners can update their locations"');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('CREATE POLICY "Provider owners can delete their locations"');
    expect(sql).toContain('FOR DELETE');
  });

  it('has idempotent backfill with WHERE NOT EXISTS', () => {
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain('SELECT 1 FROM public.locations WHERE locations.provider_id = providers.provider_id');
    expect(sql).toContain('show_address, contact_phone, TRUE');
  });
});
