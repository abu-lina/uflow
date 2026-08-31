import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 120 search_food_near_me RPC', () => {
  const migrationPath = join(
    process.cwd(),
    'supabase',
    'migrations',
    '120_plan_196_search_food_near_me.sql',
  );

  if (!existsSync(migrationPath)) {
    throw new Error('Migration 120 file not found.');
  }
  const sql = readFileSync(migrationPath, 'utf8');

  it('wraps everything in a transaction', () => {
    expect(sql).toContain('BEGIN;');
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
  });

  it('creates the search_food_near_me function with expected signature', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_near_me');
    expect(sql).toContain('p_lat NUMERIC');
    expect(sql).toContain('p_lon NUMERIC');
    expect(sql).toContain('p_radius_km NUMERIC');
    expect(sql).toContain('p_limit INT');
  });

  it('does not modify the existing find_nearby_food_providers function', () => {
    expect(sql).not.toContain('DROP FUNCTION IF EXISTS public.find_nearby_food_providers');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION public.find_nearby_food_providers');
  });

  it('clamps p_radius_km to a server-side maximum (Critic F1)', () => {
    expect(sql).toMatch(/LEAST\(\s*p_radius_km\s*,\s*\d+/);
  });

  it('applies a hard server-side LIMIT (Critic F1)', () => {
    expect(sql).toMatch(/LIMIT\s+GREATEST\(LEAST\(p_limit/);
  });

  it('validates coordinate ranges server-side (Critic F2)', () => {
    expect(sql).toContain('p_lat BETWEEN -90 AND 90');
    expect(sql).toContain('p_lon BETWEEN -180 AND 180');
  });

  it('queries the locations table with nearest-location-per-provider semantics (Analysis #4)', () => {
    expect(sql).toContain('FROM public.locations l');
    expect(sql).toContain('DISTINCT ON (l.provider_id)');
  });

  it('filters to approved food providers with non-null coordinates', () => {
    expect(sql).toContain("listing_type = 'food'");
    expect(sql).toContain("review_status = 'approved'");
    expect(sql).toContain('l.location_latitude IS NOT NULL');
    expect(sql).toContain('l.location_longitude IS NOT NULL');
  });

  it('orders the final result set by ascending distance (Critic F4)', () => {
    // The outer query must re-sort by distance_km after the DISTINCT ON step
    const outerOrderMatch = sql.match(/\)\s*SELECT[\s\S]*?ORDER BY\s+distance_km\s+ASC/);
    expect(outerOrderMatch).not.toBeNull();
  });

  it('returns opening_hours as raw JSONB for client-side open-now filtering', () => {
    expect(sql).toContain('opening_hours');
  });

  it('creates a partial index on locations for the approved-food + coords predicate (Critic F3)', () => {
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_locations_food_approved_coords');
    expect(sql).toContain('ON public.locations');
  });

  it('grants EXECUTE to anon, authenticated, and service_role', () => {
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_near_me TO anon');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_near_me TO authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_near_me TO service_role');
  });

  it('is SECURITY INVOKER (read-only, no privilege escalation)', () => {
    expect(sql).toContain('SECURITY INVOKER');
  });
});
