import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan 129 migration 089 contract', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/089_fix_search_food_concepts_junction.sql',
  );

  it('creates migration 089 to replace dropped offers_ids join with provider_offers junction', () => {
    // TDD red gate: this should fail until migration 089 is implemented.
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) {
      throw new Error('Migration 089 file not found at supabase/migrations/089_fix_search_food_concepts_junction.sql.');
    }

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('DROP FUNCTION IF EXISTS public.search_food_concepts(TEXT, INTEGER);');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_concepts');

    // Must use normalized relation table introduced in phase 3.
    expect(sql).toContain('INNER JOIN public.provider_offers po');
    expect(sql).toContain('ON po.offer_id = mo.offer_id');
    expect(sql).toContain('ON p.provider_id = po.provider_id');

    // Regression guard: no legacy array-column join remains.
    expect(sql).not.toContain('p.offers_ids');

    // Permission parity must be preserved after function recreation.
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.search_food_concepts(TEXT, INTEGER) FROM PUBLIC;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_concepts(TEXT, INTEGER) TO anon;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_concepts(TEXT, INTEGER) TO authenticated;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_concepts(TEXT, INTEGER) TO service_role;');
  });
});
