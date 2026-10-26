import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

// Executes migration 141 against a real (WASM) Postgres (#674 flow 2).
// The seeded schema mirrors the verified live UAT shape BEFORE the change:
// cities has no coordinate columns and no is_listed (migration 140 unapplied).

const MIGRATION = readFileSync(
  join(__dirname, '../../../supabase/migrations/141_issue674_city_coordinates.sql'),
  'utf-8',
);

const SCHEMA = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;
  CREATE TYPE public.review_status AS ENUM
    ('pending','approved','rejected','needs_revision','removed_by_owner');
  CREATE TABLE public.cities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city_name text NOT NULL UNIQUE,
    country text NOT NULL,
    updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    address_city text,
    review_status public.review_status NOT NULL DEFAULT 'pending'
  );
`;

type NearestRow = {
  city_name: string;
  provider_count: number;
  latitude: string;
  longitude: string;
  distance_km: string;
};

let db: PGlite;

async function seedProviders(city: string, count: number, status = 'approved') {
  for (let i = 0; i < count; i++) {
    await db.query(
      `INSERT INTO public.providers (address_city, review_status) VALUES ($1, $2::public.review_status)`,
      [city, status],
    );
  }
}

async function nearest(
  city: string | null,
  min = 6,
  lat: number | null = null,
  lon: number | null = null,
): Promise<NearestRow[]> {
  const { rows } = await db.query<NearestRow>(
    `SELECT * FROM public.get_nearest_city_with_providers($1, $2, $3, $4)`,
    [city, min, lat, lon],
  );
  return rows;
}

// Booting PGlite (WASM Postgres) can exceed the 10s hook default under full-suite load.
beforeAll(async () => {
  db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(`INSERT INTO public.cities (city_name, country) VALUES
    ('Berlin','Germany'), ('Hamburg','Germany'), ('Hannover','Germany'),
    ('Bielefeld','Germany'), ('Köln','Germany'), ('Atlantis','Nowhere')`);
  await seedProviders('Berlin', 7);
  await seedProviders('Hannover', 6);
  await seedProviders('Hamburg', 5);
  await seedProviders('Hamburg', 3, 'pending');
  await seedProviders('Bielefeld', 2);
  await seedProviders(' köln ', 3);
  await seedProviders('Köln', 3);
  await seedProviders('Atlantis', 10);
  await db.exec(MIGRATION);
}, 60_000);

describe('migration 141: city coordinates', () => {
  it('adds numeric latitude and longitude to cities', async () => {
    const { rows } = await db.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'cities' AND column_name IN ('latitude','longitude')
        ORDER BY column_name`,
    );
    expect(rows).toEqual([
      { column_name: 'latitude', data_type: 'numeric' },
      { column_name: 'longitude', data_type: 'numeric' },
    ]);
  });

  it('backfills city centers for known cities and leaves unknown ones empty', async () => {
    const { rows } = await db.query<{ city_name: string; latitude: string | null }>(
      `SELECT city_name, latitude FROM public.cities ORDER BY city_name`,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.city_name, r.latitude]));
    expect(Number(byName.Berlin)).toBeCloseTo(52.52, 1);
    expect(Number(byName.Hannover)).toBeCloseTo(52.37, 1);
    expect(byName.Atlantis).toBeNull();
  });

  it('runs on databases without migration 140 (no is_listed column)', () => {
    expect(MIGRATION).not.toMatch(/is_listed/);
  });
});

describe('migration 141: get_nearest_city_with_providers', () => {
  it('returns the nearest city with at least the threshold of approved providers', async () => {
    const [row] = await nearest('Bielefeld');
    expect(row?.city_name).toBe('Hannover');
    expect(row?.provider_count).toBe(6);
    expect(Number(row?.distance_km)).toBeGreaterThan(80);
    expect(Number(row?.distance_km)).toBeLessThan(120);
  });

  it('counts only approved providers against the threshold', async () => {
    const rows = await nearest('Hamburg', 6, 53.55, 10.0);
    expect(rows.map((r) => r.city_name)).not.toContain('Hamburg');
  });

  it('honours the threshold parameter', async () => {
    const [row] = await nearest('Bielefeld', 7);
    expect(row?.city_name).toBe('Berlin');
  });

  it('prefers passed coordinates over the stored city center', async () => {
    const [row] = await nearest('Somewhere', 6, 50.94, 6.96);
    expect(row?.city_name).toBe('Köln');
    expect(row?.provider_count).toBe(6);
  });

  it('never returns the origin city itself', async () => {
    const [row] = await nearest('Berlin');
    expect(row?.city_name).toBe('Hannover');
  });

  it('skips cities without coordinates', async () => {
    const rows = await nearest('Bielefeld', 10);
    expect(rows).toEqual([]);
  });

  it('returns nothing when the origin has no known position', async () => {
    expect(await nearest('Atlantis')).toEqual([]);
    expect(await nearest(null)).toEqual([]);
  });

  it('returns at most one row', async () => {
    expect(await nearest('Bielefeld', 1)).toHaveLength(1);
  });

  it('is callable by anon and authenticated', async () => {
    const { rows } = await db.query<{ anon: boolean; auth: boolean }>(
      `SELECT
         has_function_privilege('anon', 'public.get_nearest_city_with_providers(text, integer, numeric, numeric)', 'EXECUTE') AS anon,
         has_function_privilege('authenticated', 'public.get_nearest_city_with_providers(text, integer, numeric, numeric)', 'EXECUTE') AS auth`,
    );
    expect(rows[0]).toEqual({ anon: true, auth: true });
  });
});
