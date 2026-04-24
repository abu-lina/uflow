import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan 098 migration 075 contract', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/075_search_food_categories_add_images.sql',
  );

  it('creates migration 075 with category_images in search_food_categories RPC', () => {
    // TDD red gate: this should fail until migration 075 is implemented.
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_categories');
    expect(sql).toContain('RETURNS TABLE');
    expect(sql).toContain('category_images TEXT');
    expect(sql).toContain('c.category_images::TEXT');
    expect(sql).toContain('SECURITY INVOKER');
    expect(sql).toContain('COMMENT ON FUNCTION public.search_food_categories');
  });
});
