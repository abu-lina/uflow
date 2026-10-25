import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  ProviderScreening,
  ScreeningFlag,
  ScreeningFlagCode,
  ScreeningSource,
  ScreeningStatus,
} from '@/types/providerScreening';

// Executes migration 144 against a real (WASM) Postgres. Prior art:
// 139-provider-categories-rls.test.ts (SET LOCAL ROLE + JWT claim GUC).

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/144_issue764_provider_screenings.sql',
);
const TYPES_PATH = join(process.cwd(), 'src/types/providerScreening.ts');

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TYPE public.user_role AS ENUM ('user', 'owner', 'admin', 'moderator');
  CREATE TABLE public.users (user_id uuid PRIMARY KEY, email text, role public.user_role NOT NULL DEFAULT 'user');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $f$;
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL
  );
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "users self read" ON public.users FOR SELECT USING (true);
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  GRANT SELECT ON public.users, public.providers TO anon, authenticated;
  GRANT ALL ON public.providers TO service_role;
`;

const ADMIN = '22222222-2222-2222-2222-222222222222';
const USER = '11111111-1111-1111-1111-111111111111';
const PROVIDER = 'aaaaaaaa-0000-0000-0000-000000000001';
const PROVIDER_2 = 'aaaaaaaa-0000-0000-0000-000000000002';

let db: PGlite;

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Run `fn` as a PostgREST role + JWT identity in a rolled-back transaction. */
async function asCaller<T>(role: string, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec('BEGIN');
  await rows(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('ROLLBACK');
  }
}

const insertScreening = (providerId: string, source = 'website', status = 'clear') =>
  rows(`INSERT INTO public.provider_screenings (provider_id, source, status) VALUES ($1, $2, $3)`, [
    providerId,
    source,
    status,
  ]);

describe('migration 144: provider_screenings (#764)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await rows(
      `INSERT INTO public.users (user_id, email, role) VALUES ($1,'user@x','user'),($2,'admin@x','admin')`,
      [USER, ADMIN],
    );
    await rows(
      `INSERT INTO public.providers (provider_id, provider_name) VALUES ($1,'A'),($2,'B')`,
      [PROVIDER, PROVIDER_2],
    );
    expect(existsSync(MIGRATION_PATH), 'migration 144 file exists').toBe(true);
    await db.exec(readFileSync(MIGRATION_PATH, 'utf-8'));
    await db.exec('GRANT ALL ON public.provider_screenings TO anon, authenticated, service_role');
  });

  afterAll(async () => {
    await db?.close();
  });

  describe('1. table, columns, constraints and index', () => {
    it('creates the columns with the expected types, nullability and defaults', async () => {
      const cols = await rows<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'provider_screenings'
         ORDER BY column_name`,
      );
      const byName = Object.fromEntries(cols.map((c) => [c.column_name, c]));
      expect(Object.keys(byName).sort()).toEqual(
        ['created_at', 'flags', 'provider_id', 'raw', 'screening_id', 'source', 'status'].sort(),
      );
      expect(byName.screening_id).toMatchObject({ data_type: 'uuid', is_nullable: 'NO' });
      expect(byName.screening_id.column_default).toContain('gen_random_uuid');
      expect(byName.provider_id).toMatchObject({ data_type: 'uuid', is_nullable: 'NO' });
      expect(byName.source).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
      expect(byName.status).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
      expect(byName.flags).toMatchObject({ data_type: 'jsonb', is_nullable: 'NO' });
      expect(byName.flags.column_default).toContain("'[]'");
      expect(byName.raw).toMatchObject({ data_type: 'jsonb', is_nullable: 'YES' });
      expect(byName.created_at).toMatchObject({
        data_type: 'timestamp with time zone',
        is_nullable: 'NO',
      });
      expect(byName.created_at.column_default).toContain('now()');
    });

    it('uses screening_id as primary key and defaults flags to an empty array', async () => {
      const pk = await rows<{ column_name: string }>(
        `SELECT kcu.column_name FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
         WHERE tc.table_schema = 'public' AND tc.table_name = 'provider_screenings'
           AND tc.constraint_type = 'PRIMARY KEY'`,
      );
      expect(pk.map((r) => r.column_name)).toEqual(['screening_id']);
      const [row] = await rows<{ flags: unknown; created_at: string }>(
        `INSERT INTO public.provider_screenings (provider_id, source, status)
         VALUES ($1,'website','clear') RETURNING flags, created_at`,
        [PROVIDER],
      );
      expect(row.flags).toEqual([]);
      expect(row.created_at).toBeTruthy();
      await rows(`DELETE FROM public.provider_screenings`);
    });

    it('creates an index on (provider_id, created_at desc)', async () => {
      const idx = await rows<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'provider_screenings'`,
      );
      expect(idx.some((i) => /\(provider_id, created_at DESC\)/.test(i.indexdef))).toBe(true);
    });

    it('rejects a screening whose provider does not exist', async () => {
      await expect(insertScreening('bbbbbbbb-0000-0000-0000-000000000009')).rejects.toThrow(
        /foreign key/i,
      );
    });
  });

  describe('2. RLS: admins select, no write policies, role from public.users', () => {
    beforeAll(async () => {
      await insertScreening(PROVIDER, 'website', 'review');
    });

    it('enables row level security', async () => {
      const [t] = await rows<{ relrowsecurity: boolean }>(
        `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.provider_screenings'::regclass`,
      );
      expect(t.relrowsecurity).toBe(true);
    });

    it('lets an admin select rows', async () => {
      const res = await asCaller('authenticated', ADMIN, () =>
        rows('SELECT screening_id FROM public.provider_screenings'),
      );
      expect(res).toHaveLength(1);
    });

    it('hides rows from a regular user and from anon', async () => {
      const asUser = await asCaller('authenticated', USER, () =>
        rows('SELECT screening_id FROM public.provider_screenings'),
      );
      const asAnon = await asCaller('anon', null, () =>
        rows('SELECT screening_id FROM public.provider_screenings'),
      );
      expect(asUser).toEqual([]);
      expect(asAnon).toEqual([]);
    });

    it.each([
      ['regular user', USER],
      ['admin', ADMIN],
    ])('rejects insert, update and delete for an authenticated %s', async (_label, uid) => {
      await expect(asCaller('authenticated', uid, () => insertScreening(PROVIDER))).rejects.toThrow(
        /row-level security/i,
      );
      // UPDATE/DELETE with no policy match zero rows instead of raising.
      const updated = await asCaller('authenticated', uid, () =>
        db.query(`UPDATE public.provider_screenings SET status = 'flagged'`),
      );
      const deleted = await asCaller('authenticated', uid, () =>
        db.query(`DELETE FROM public.provider_screenings`),
      );
      expect(updated.affectedRows).toBe(0);
      expect(deleted.affectedRows).toBe(0);
    });

    it('lets the service role write', async () => {
      await asCaller('service_role', null, () =>
        insertScreening(PROVIDER, 'delivery_menu', 'clear'),
      );
    });

    it('defines no write policies and never reads JWT user_metadata', async () => {
      const policies = await rows<{ cmd: string; qual: string | null }>(
        `SELECT cmd, qual FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'provider_screenings'`,
      );
      expect(policies.map((p) => p.cmd)).toEqual(['SELECT']);
      const sql = readFileSync(MIGRATION_PATH, 'utf-8');
      expect(sql).not.toMatch(/user_metadata|raw_user_meta_data|auth\.jwt\(\)/i);
      expect(policies[0].qual).toMatch(/users/);
    });
  });

  describe('3. invalid source or status is rejected', () => {
    it.each(['google_maps_apify', 'delivery_menu', 'website'])('accepts source %s', async (s) => {
      await expect(insertScreening(PROVIDER, s, 'clear')).resolves.toBeDefined();
    });

    it.each(['clear', 'review', 'flagged'])('accepts status %s', async (s) => {
      await expect(insertScreening(PROVIDER, 'website', s)).resolves.toBeDefined();
    });

    it('rejects an invalid source', async () => {
      await expect(insertScreening(PROVIDER, 'instagram', 'clear')).rejects.toThrow(
        /check constraint/i,
      );
    });

    it('rejects an invalid status', async () => {
      await expect(insertScreening(PROVIDER, 'website', 'approved')).rejects.toThrow(
        /check constraint/i,
      );
    });
  });

  describe('4. TypeScript types', () => {
    it('exports the five names from src/types/providerScreening.ts', () => {
      expect(existsSync(TYPES_PATH), 'types file exists').toBe(true);
      const src = readFileSync(TYPES_PATH, 'utf-8');
      for (const name of [
        'ProviderScreening',
        'ScreeningFlag',
        'ScreeningFlagCode',
        'ScreeningSource',
        'ScreeningStatus',
      ]) {
        expect(src).toMatch(new RegExp(`export (type|interface) ${name}\\b`));
      }
    });

    it('matches the table shape', () => {
      const code: ScreeningFlagCode[] = [
        'alcohol',
        'pork',
        'not_halal',
        'halal_positive',
        'no_maps_match',
      ];
      const source: ScreeningSource[] = ['google_maps_apify', 'delivery_menu', 'website'];
      const status: ScreeningStatus[] = ['clear', 'review', 'flagged'];
      const flag: ScreeningFlag = {
        code: code[0],
        term: 'bier',
        snippet: 'Bier vom Fass',
        url: 'https://example.com',
        source: source[2],
      };
      const row: ProviderScreening = {
        screening_id: 's',
        provider_id: 'p',
        source: source[0],
        status: status[1],
        flags: [flag],
        raw: null,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(row.flags[0].code).toBe('alcohol');
    });
  });

  describe('5. deleting a provider cascades to its screenings', () => {
    it('removes screenings of the deleted provider only', async () => {
      await rows(`DELETE FROM public.provider_screenings`);
      await insertScreening(PROVIDER, 'website', 'clear');
      await insertScreening(PROVIDER, 'delivery_menu', 'review');
      await insertScreening(PROVIDER_2, 'website', 'flagged');
      await rows(`DELETE FROM public.providers WHERE provider_id = $1`, [PROVIDER]);
      const left = await rows<{ provider_id: string }>(
        `SELECT provider_id FROM public.provider_screenings`,
      );
      expect(left.map((r) => r.provider_id)).toEqual([PROVIDER_2]);
    });
  });
});
