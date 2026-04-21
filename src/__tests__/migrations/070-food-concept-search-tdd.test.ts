import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan 097 migration 070 contract', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/070_search_food_concepts_rpc.sql',
  );

  it('creates migration 070 with search_food_concepts RPC contract', () => {
    // TDD red gate: this should fail until migration 070 is implemented.
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_concepts');
    expect(sql).toContain('search_query TEXT DEFAULT');
    expect(sql).toContain('limit_count INTEGER DEFAULT 10');
    expect(sql).toContain('RETURNS TABLE');
    expect(sql).toContain('offer_id UUID');
    expect(sql).toContain('name_de TEXT');
    expect(sql).toContain('name_en TEXT');
    expect(sql).toContain('provider_count BIGINT');
    expect(sql).toContain("to_tsvector('german'");
    expect(sql).toContain("to_tsvector('english'");
    expect(sql).toMatch(/p\.offers_ids\s*@>\s*ARRAY\[[^\]]*offer_id\]/);
    expect(sql).toContain("p.listing_type = 'food'");
    expect(sql).toContain("p.review_status = 'approved'");
    expect(sql).toContain('COUNT(DISTINCT p.provider_id)');
    expect(sql).toContain('SECURITY INVOKER');
    expect(sql).toContain('COMMENT ON FUNCTION public.search_food_concepts');
  });
});
