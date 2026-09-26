import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 133 location upsert supplied id', () => {
  const migrationPath = join(
    process.cwd(),
    'supabase',
    'migrations',
    '133_fix_location_upsert_supplied_id.sql',
  );
  if (!existsSync(migrationPath)) {
    throw new Error('Migration 133 file not found.');
  }
  const sql = readFileSync(migrationPath, 'utf8');

  it('wraps everything in a transaction', () => {
    expect(sql).toContain('BEGIN;');
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
  });

  it('recreates admin_update_provider', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.admin_update_provider');
  });

  it('honours a caller-supplied location_id on insert (defect A)', () => {
    expect(sql).toContain('location_id, provider_id, location_name');
    expect(sql).toContain('COALESCE(v_location_id, gen_random_uuid())');
  });

  it('tries UPDATE first, then falls through to INSERT', () => {
    expect(sql).toContain('IF FOUND THEN');
    expect(sql).toContain('CONTINUE;');
  });

  it('appends the inserted id so the row survives the delete-sweep (defect B)', () => {
    expect(sql).toContain('RETURNING location_id INTO v_location_id');
    const returningIndex = sql.indexOf('RETURNING location_id INTO v_location_id');
    const appendIndex = sql.indexOf('array_append(v_existing_ids, v_location_id)', returningIndex);
    expect(appendIndex).toBeGreaterThan(returningIndex);
  });

  it('retains the tenancy guard on UPDATE', () => {
    expect(sql).toContain('WHERE location_id = v_location_id AND provider_id = p_provider_id');
  });

  it('raises when a supplied id belongs to another provider', () => {
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).toContain('belongs to another provider');
  });

  it("carries forward 131's tri-state halal attestation handling", () => {
    expect(sql).toContain(
      "CASE WHEN v_food_providers ? 'no_alcohol' THEN (v_food_providers->>'no_alcohol')::boolean ELSE NULL END",
    );
    expect(sql).toContain(
      "CASE WHEN v_store_providers ? 'no_gambling' THEN (v_store_providers->>'no_gambling')::boolean ELSE store_providers.no_gambling END",
    );
  });

  it('guards the delete-sweep inside the non-empty-array check', () => {
    expect(sql).toContain('      DELETE FROM public.locations');
    expect(sql).not.toContain('\n    DELETE FROM public.locations');
    expect(sql.indexOf('END LOOP;')).toBeLessThan(sql.indexOf('DELETE FROM public.locations'));
    expect(sql).toContain('Prune only when the caller actually sent a list');
  });

  it('retains function permissions', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION');
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.admin_update_provider(UUID, JSONB) TO service_role',
    );
  });
});
