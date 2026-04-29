import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 076 provider badge boolean sync trigger', () => {
  const migrationPath = [
    join(process.cwd(), 'supabase', 'migrations', '076_provider_badge_boolean_sync_trigger.sql'),
    join(process.cwd(), 'supabase', 'migrations', 'archive', '076_provider_badge_boolean_sync_trigger.sql'),
  ].find((candidate) => existsSync(candidate));
  if (!migrationPath) {
    throw new Error('Migration 076 file not found in active or archive path.');
  }
  const sql = readFileSync(migrationPath, 'utf8');

  it('defines provider-only guard and badge key resolution through badge_types join', () => {
    expect(sql).toContain('IF v_entity_type != \'provider\' THEN');
    expect(sql).toContain('FROM public.badge_types bt');
    expect(sql).toContain('WHERE bt.id = v_badge_type_id');
  });

  it('maps the three badge keys to provider filter booleans', () => {
    expect(sql).toContain("WHEN 'MUSLIM_OWNED' THEN");
    expect(sql).toContain('muslim_owned = TRUE');

    expect(sql).toContain("WHEN 'PRAYER_FRIENDLY' THEN");
    expect(sql).toContain('has_prayer_space = TRUE');

    expect(sql).toContain("WHEN 'SUPPORTS_SADAQAH' THEN");
    expect(sql).toContain('accepts_donations = TRUE');
  });

  it('creates AFTER INSERT OR DELETE trigger on provider_badges', () => {
    expect(sql).toContain('AFTER INSERT OR DELETE ON public.provider_badges');
    expect(sql).toContain('EXECUTE FUNCTION public.sync_provider_badge_to_boolean()');
  });

  it('only unsets booleans when no provider badge row of same type remains', () => {
    expect(sql).toContain('IF NOT EXISTS (');
    expect(sql).toContain('AND pb.entity_type = \'provider\'');
    expect(sql).toContain('AND pb.badge_type_id = v_badge_type_id');
  });
});
