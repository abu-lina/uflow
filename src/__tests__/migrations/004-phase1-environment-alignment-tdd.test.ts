import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 1 environment alignment migration contract', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/004_phase1_environment_alignment.sql'
  );

  it('creates migration 004 for consent_logs/deletion_logs schema parity', () => {
    // TDD red gate: must fail until migration 004 is implemented.
    expect(existsSync(migrationPath)).toBe(true);

    if (!existsSync(migrationPath)) {
      throw new Error('Migration 004 file not found in active migration path.');
    }

    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('consent_type');
    expect(sql).toContain('consent_logs');
    expect(sql).toContain('deletion_logs');

    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('GRANT ALL ON TABLE public.consent_logs TO anon, authenticated, service_role');
    expect(sql).toContain('GRANT ALL ON TABLE public.deletion_logs TO anon, authenticated, service_role');
  });
});
