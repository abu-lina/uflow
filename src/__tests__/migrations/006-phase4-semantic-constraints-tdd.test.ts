import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 006 phase4 semantic constraints', () => {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '0061_phase4_semantic_constraints.sql');

  if (!existsSync(migrationPath)) {
    throw new Error('Migration 006 file not found in active migrations path.');
  }

  const sql = readFileSync(migrationPath, 'utf8');

  it('has the idempotent enum guard moved to 0060', () => {
    expect(sql).toContain('MOVED to 0060_plan_145_enum_value.sql');
  });

  it('backfills null listing_type and enforces not null', () => {
    expect(sql).toContain("SET listing_type = 'ummah'::public.listing_type_enum");
    expect(sql).toContain('WHERE listing_type IS NULL');
    expect(sql).toContain('ALTER COLUMN listing_type SET NOT NULL');
  });

  it('adds section-scoped check constraints for food/business/ummah', () => {
    expect(sql).toContain('providers_listing_type_food_only_ck');
    expect(sql).toContain('providers_listing_type_business_only_ck');
    expect(sql).toContain('providers_listing_type_ummah_only_ck');

    expect(sql).toContain("listing_type = 'food'::public.listing_type_enum");
    expect(sql).toContain('no_alcohol = FALSE');
    expect(sql).toContain('no_pork = FALSE');
    expect(sql).toContain('halal_level IS NULL');

    expect(sql).toContain("listing_type = 'business'::public.listing_type_enum");
    expect(sql).toContain('no_gambling = FALSE');
    expect(sql).toContain('solidarity_pricing = FALSE');

    expect(sql).toContain("listing_type = 'ummah'::public.listing_type_enum");
    expect(sql).toContain('accepts_donations = FALSE');
  });

  it('audits and raises if violations remain before constraints', () => {
    expect(sql).toContain('phase4_semantic_violations');
    expect(sql).toContain('RAISE EXCEPTION');
  });
});
