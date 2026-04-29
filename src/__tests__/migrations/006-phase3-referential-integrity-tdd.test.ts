import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 006 phase3 referential integrity', () => {
  const migrationPath = join(
    process.cwd(),
    'supabase',
    'migrations',
    '006_phase3_referential_integrity.sql'
  );
  const sql = readFileSync(migrationPath, 'utf8');

  it('creates provider/community-service offers and needs junction tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.provider_offers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.provider_needs');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.community_service_offers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.community_service_needs');
  });

  it('adds typed bookmark columns with mutual exclusion check', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS provider_id uuid');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS community_service_id uuid');
    expect(sql).toContain('num_nonnulls(provider_id, community_service_id) = 1');
  });

  it('adds typed provider_badges columns and drops polymorphic columns', () => {
    expect(sql).toContain('ALTER TABLE public.provider_badges');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS provider_id uuid');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS community_service_id uuid');
    expect(sql).toContain('DROP COLUMN IF EXISTS entity_id');
    expect(sql).toContain('DROP COLUMN IF EXISTS entity_type');
  });

  it('drops legacy array columns and polymorphic bookmark columns', () => {
    expect(sql).toContain('DROP COLUMN IF EXISTS offers_ids');
    expect(sql).toContain('DROP COLUMN IF EXISTS needs_ids');
    expect(sql).toContain('DROP COLUMN IF EXISTS bookmarkable_id');
    expect(sql).toContain('DROP COLUMN IF EXISTS bookmarkable_type');
  });
});
