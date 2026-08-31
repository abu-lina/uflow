import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan 094 migration 068 contract', () => {
  const migrationPath = [
    'supabase/migrations/068_provider_catalog_tables.sql',
    'supabase/migrations/archive/068_provider_catalog_tables.sql',
  ]
    .map((candidate) => path.resolve(process.cwd(), candidate))
    .find((candidate) => existsSync(candidate));

  it('creates migration 068 with catalog tables and RPC', () => {
    // TDD red gate: this should fail until migration 068 is implemented.
    expect(migrationPath).toBeDefined();
    if (!migrationPath) {
      throw new Error('Migration 068 file not found in active or archive path.');
    }

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.provider_menu_items');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.provider_service_offers');
    expect(sql).toContain('GENERATED ALWAYS AS');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_provider_items');
    expect(sql).toContain('UNION ALL');

    // ADR-094 D4 hard gate: ordering-critical fields must be typed columns (no JSONB)
    expect(sql).toMatch(/price_cents\s+INTEGER/);
    expect(sql).toMatch(/is_available\s+BOOLEAN/);

    // ADR-094 D6: RPC must use SECURITY INVOKER to prevent privilege escalation
    expect(sql).toContain('SECURITY INVOKER');

    // RLS must be enabled on both new tables
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');

    // ADR-094 D8: provider_stats MV must include catalog count columns
    expect(sql).toContain('menu_item_count');
  });
});
