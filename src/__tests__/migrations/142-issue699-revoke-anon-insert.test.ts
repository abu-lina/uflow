import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const MIGRATION = readFileSync(
  join(__dirname, '../../../supabase/migrations/142_issue699_revoke_anon_insert.sql'),
  'utf-8',
);

const SCHEMA = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;
  CREATE TABLE public.offers (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.needs (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY offers_select ON public.offers FOR SELECT USING (true);
  GRANT SELECT, INSERT, UPDATE ON public.offers, public.needs TO anon, authenticated, service_role;
`;

const grants = (db: PGlite, grantee: string) =>
  db.query<{ table_name: string; privilege_type: string }>(
    `SELECT table_name, privilege_type FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name IN ('offers','needs') AND grantee = $1
     ORDER BY table_name, privilege_type`,
    [grantee],
  );

describe('migration 142: revoke anon INSERT on offers and needs (#699)', () => {
  let db: PGlite;
  let before: { authenticated: unknown; service_role: unknown; policies: unknown };

  // Booting PGlite (WASM Postgres) can exceed the 10s hook default under full-suite load.
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    const policies = () => db.query(`SELECT * FROM pg_policies ORDER BY policyname`);
    before = {
      authenticated: (await grants(db, 'authenticated')).rows,
      service_role: (await grants(db, 'service_role')).rows,
      policies: (await policies()).rows,
    };
    await db.exec(MIGRATION);
  }, 60_000);

  it('1. anon has no INSERT grant on offers or needs', async () => {
    const res = await db.query(
      `SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND table_name IN ('offers','needs')
       AND grantee = 'anon' AND privilege_type = 'INSERT'`,
    );
    expect(res.rows).toEqual([]);
  });

  it('2. authenticated and service_role grants and RLS policies are unchanged', async () => {
    expect((await grants(db, 'authenticated')).rows).toEqual(before.authenticated);
    expect((await grants(db, 'service_role')).rows).toEqual(before.service_role);
    expect((await db.query(`SELECT * FROM pg_policies ORDER BY policyname`)).rows).toEqual(
      before.policies,
    );
    expect((await grants(db, 'anon')).rows.map((r) => r.privilege_type)).toContain('SELECT');
  });

  it('3. the migration can be re-run without errors', async () => {
    await expect(db.exec(MIGRATION)).resolves.toBeDefined();
  });

  it('4. the migration documents the post-deploy verification query', () => {
    expect(MIGRATION).toContain(
      "SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('offers','needs') AND grantee = 'anon' AND privilege_type = 'INSERT';",
    );
  });
});
