import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Plan 095 migration 069 contract', () => {
  const migrationPath = [
    'supabase/migrations/069_community_projects_category_scoping.sql',
    'supabase/migrations/archive/069_community_projects_category_scoping.sql',
  ]
    .map((candidate) => path.resolve(process.cwd(), candidate))
    .find((candidate) => existsSync(candidate));
  const adrPath = path.resolve(
    process.cwd(),
    'agent-output/architecture/095-unified-catalog-adr.md',
  );

  it('creates migration 069 and ADR-095 with required schema contracts', () => {
    // TDD red gate: this should fail until migration 069 and ADR-095 are implemented.
    expect(migrationPath).toBeDefined();
    expect(existsSync(adrPath)).toBe(true);
    if (!migrationPath) {
      throw new Error('Migration 069 file not found in active or archive path.');
    }

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.community_projects');
    expect(sql).toContain('community_service_id UUID NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE');
    expect(sql).toContain('price_currency TEXT NOT NULL DEFAULT');
    expect(sql).toMatch(/is_active\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+true/i);
    expect(sql).toContain('GENERATED ALWAYS AS');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.search_community_projects');
    expect(sql).toContain('SECURITY INVOKER');
    expect(sql).toMatch(/ALTER TABLE\s+public\.categories\s+ADD COLUMN IF NOT EXISTS\s+applicable_section/i);
    expect(sql).toContain('community_project_count');
    expect(sql).toContain('RAISE NOTICE');
  });
});
