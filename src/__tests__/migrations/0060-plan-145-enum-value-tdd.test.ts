import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 0060 plan 145 enum value', () => {
  const migrationPath = join(
    process.cwd(),
    'supabase',
    'migrations',
    '0060_plan_145_enum_value.sql',
  );

  if (!existsSync(migrationPath)) {
    throw new Error('Migration 0060 file not found in active migrations path.');
  }

  const sql = readFileSync(migrationPath, 'utf8');

  it('adds ummah to listing_type_enum with idempotent guard', () => {
    expect(sql).toContain("'ummah'");
    expect(sql).toContain('listing_type_enum');
    expect(sql).toMatch(
      /IF NOT EXISTS \(\s*SELECT 1[\s\S]*pg_enum[\s\S]*listing_type_enum[\s\S]*'ummah'/i,
    );
    expect(sql).toContain('ALTER TYPE public.listing_type_enum ADD VALUE');
  });

  it('runs in its own DO block for transaction isolation', () => {
    expect(sql).toContain('DO $$');
    expect(sql).toContain('END\n$$;');
  });
});
