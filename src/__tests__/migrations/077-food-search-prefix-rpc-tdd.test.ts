import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Food search prefix matching migration contract', () => {
  const migrationPath = [
    'supabase/migrations/077_food_search_prefix_matching.sql',
    'supabase/migrations/archive/077_food_search_prefix_matching.sql',
  ]
    .map((candidate) => path.resolve(process.cwd(), candidate))
    .find((candidate) => existsSync(candidate));

  it('creates migration 077 to enable prefix matching for food RPC search', () => {
    // TDD red gate: this should fail until migration 077 is implemented.
    expect(migrationPath).toBeDefined();
    if (!migrationPath) {
      throw new Error('Migration 077 file not found in active or archive path.');
    }

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_categories');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_concepts');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_food_menu_items');

    // Backward-compat gate: environments with older OUT parameter shapes
    // require an explicit drop before CREATE OR REPLACE.
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.search_food_categories(TEXT, INTEGER);');

    // Explicit function privileges must be restored after drop/recreate.
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.search_food_categories(TEXT, INTEGER) FROM PUBLIC;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_categories(TEXT, INTEGER) TO anon;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_categories(TEXT, INTEGER) TO authenticated;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.search_food_categories(TEXT, INTEGER) TO service_role;');

    // Category names should be normalized for UI display:
    // - remove trailing "Küche"
    // - normalize trailing adjective from "-ische" to "-isch"
    expect(sql).toContain("regexp_replace(c.name_de, '\\\\s*Küche\\\\s*$', '', 'i')");
    expect(sql).toContain("'ische$'");
    expect(sql).toContain("'isch'");

    // Prefix search (`:*`) must be present to support inputs like "Afgh".
    expect(sql).toContain(":*'");

    // Ensure we still use tsvector matching semantics and not ILIKE.
    expect(sql).toContain("to_tsvector('german'");
    expect(sql).toContain("to_tsvector('english'");
    expect(sql).not.toContain('.ilike.');

    // GROUP BY safety: menu-item rank ordering must aggregate the rank expression.
    expect(sql).toContain("MAX(\n      GREATEST(\n        ts_rank(to_tsvector('german', mi.name_de), plainto_tsquery('german', qt.normalized))");
  });
});
