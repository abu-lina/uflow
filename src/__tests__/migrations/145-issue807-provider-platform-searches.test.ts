import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Same harness as 144-issue764-provider-screenings.test.ts.
const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/145_issue807_provider_platform_searches.sql',
);

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL
  );
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  GRANT ALL ON public.providers TO service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
`;

const PROVIDER = 'aaaaaaaa-0000-0000-0000-000000000001';
let db: PGlite;

const rows = async <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
  (await db.query<T>(sql, params)).rows;

const insertSearch = (platform = 'wolt', outcome = 'no_match') =>
  rows(
    `INSERT INTO public.provider_platform_searches (provider_id, platform, outcome)
     VALUES ($1, $2, $3)`,
    [PROVIDER, platform, outcome],
  );

describe('migration 145: provider_platform_searches (#807, criterion 4)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await rows(`INSERT INTO public.providers (provider_id, provider_name) VALUES ($1,'A')`, [
      PROVIDER,
    ]);
    expect(existsSync(MIGRATION_PATH), 'migration 145 file exists').toBe(true);
    await db.exec(readFileSync(MIGRATION_PATH, 'utf-8'));
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('has provider_id, platform, searched_at and outcome', async () => {
    const cols = await rows<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'provider_platform_searches'`,
    );
    expect(cols.map((c) => c.column_name).sort()).toEqual(
      ['outcome', 'platform', 'provider_id', 'searched_at'].sort(),
    );
    expect(cols.every((c) => c.is_nullable === 'NO')).toBe(true);
  });

  it('allows one row per provider and platform', async () => {
    await insertSearch('wolt');
    await insertSearch('lieferando');
    await expect(insertSearch('wolt', 'accepted')).rejects.toThrow(/unique|duplicate/i);
    await rows(`DELETE FROM public.provider_platform_searches`);
  });

  it('accepts only the platforms and outcomes the script writes; errors are never recorded', async () => {
    await expect(insertSearch('doordash')).rejects.toThrow(/check constraint/i);
    await expect(insertSearch('wolt', 'error')).rejects.toThrow(/check constraint/i);
    for (const outcome of ['accepted', 'staged', 'no_match']) {
      await rows(`DELETE FROM public.provider_platform_searches`);
      await insertSearch('wolt', outcome);
    }
    await rows(`DELETE FROM public.provider_platform_searches`);
  });

  it('rejects a search for an unknown provider', async () => {
    await expect(
      rows(
        `INSERT INTO public.provider_platform_searches (provider_id, platform, outcome)
         VALUES ('bbbbbbbb-0000-0000-0000-000000000009','wolt','no_match')`,
      ),
    ).rejects.toThrow(/foreign key/i);
  });

  it('enables RLS with no policies and no anon or authenticated access; service role writes', async () => {
    const [t] = await rows<{ relrowsecurity: boolean }>(
      `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.provider_platform_searches'::regclass`,
    );
    expect(t.relrowsecurity).toBe(true);
    const policies = await rows(
      `SELECT 1 FROM pg_policies WHERE tablename = 'provider_platform_searches'`,
    );
    expect(policies).toEqual([]);

    for (const role of ['anon', 'authenticated']) {
      const [priv] = await rows<{ ok: boolean }>(
        `SELECT has_table_privilege($1, 'public.provider_platform_searches', 'SELECT,INSERT,UPDATE,DELETE') AS ok`,
        [role],
      );
      expect(priv.ok, `${role} has no table privileges`).toBe(false);
    }

    await db.exec('BEGIN; SET LOCAL ROLE service_role;');
    try {
      await insertSearch('wolt');
    } finally {
      await db.exec('ROLLBACK');
    }
  });
});
