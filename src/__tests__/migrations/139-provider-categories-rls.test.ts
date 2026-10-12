import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Executes migration 139 against a real (WASM) Postgres and exercises the
// provider_categories RLS policies as different PostgREST callers. Prior art:
// 137-provider-route-visibility.test.ts (SET LOCAL ROLE + JWT claim GUC).
//
// The write policies must mirror the providers UPDATE policy: the owner
// (provider_owner_id) and admins/moderators may write; a plain creator
// (user_created_id) may NOT — case 42 pins the spec's D7 decision.

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TYPE public.listing_type_enum AS ENUM ('food', 'store', 'ummah');
  CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_revision', 'removed_by_owner');
  CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator');
  CREATE TABLE public.users (user_id uuid PRIMARY KEY, email text, role public.user_role DEFAULT 'user');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $f$;
  CREATE TABLE public.categories (
    category_id uuid PRIMARY KEY, name_de text, name_en text,
    description_de text, description_en text, category_images jsonb,
    applicable_section text NOT NULL DEFAULT 'all'
  );
  CREATE TABLE public.offers (offer_id uuid PRIMARY KEY, name_de text NOT NULL, name_en text, category_id uuid NOT NULL);
  CREATE TABLE public.needs (need_id uuid PRIMARY KEY, name_de text NOT NULL, name_en text, category_id uuid NOT NULL);
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL,
    provider_description text,
    category_id uuid REFERENCES public.categories(category_id) ON DELETE SET NULL,
    address_city text,
    review_status public.review_status DEFAULT 'pending',
    listing_type public.listing_type_enum,
    user_created_id uuid,
    provider_owner_id uuid,
    muslim_owned boolean,
    has_prayer_space boolean,
    family_friendly boolean,
    women_friendly boolean,
    children_friendly boolean,
    has_parking boolean,
    economic_solidarity boolean,
    makes_donations boolean,
    opening_hours jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.provider_offers (provider_id uuid NOT NULL, offer_id uuid NOT NULL);
  CREATE TABLE public.provider_needs (provider_id uuid NOT NULL, need_id uuid NOT NULL);
  CREATE TABLE public.food_menu (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL,
    name_de text, name_en text, is_available boolean DEFAULT true
  );
  ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "users self read" ON public.users FOR SELECT USING (true);
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers, public.users, public.categories,
    public.provider_offers, public.provider_needs, public.offers, public.needs, public.food_menu
    TO anon, authenticated;
`;

const OWNER = '11111111-1111-1111-1111-111111111111';
const ADMIN = '22222222-2222-2222-2222-222222222222';
const CREATOR = '33333333-3333-3333-3333-333333333333'; // user_created_id only
const OTHER = '44444444-4444-4444-4444-444444444444';

const CAT = {
  turk: '00000000-0000-0000-0000-0000000000c1', // food
  doner: '00000000-0000-0000-0000-0000000000c2', // food
};
const APPROVED = 'aaaaaaaa-0000-0000-0000-000000000001';
const PENDING = 'aaaaaaaa-0000-0000-0000-000000000002';

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const readMigration = (suffix: string) => {
  const name = readdirSync(migrationDir).find((file) => file.endsWith(suffix));
  if (!name) throw new Error(`migration file matching ${suffix} not found`);
  return readFileSync(join(migrationDir, name), 'utf8');
};

const sql134 = readMigration('_plan_266_desktop_search_partial.sql');
const sql135 = readMigration('_plan_267_admin_all_status_scope.sql');
const sql137 = readMigration('_issue547_provider_route_visibility.sql');
const sql139 = readMigration('_issue254_provider_categories.sql');

let db: PGlite;

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Run `fn` as a PostgREST role + JWT identity, in a rolled-back transaction.
 * Forces deferred constraint triggers before rollback so a write that was
 * allowed by RLS but illegal under R1-R3 still surfaces. */
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

const junctionCount = (providerId: string) =>
  rows<{ n: number }>(
    'SELECT count(*)::int AS n FROM public.provider_categories WHERE provider_id = $1',
    [providerId],
  );

describe('migration 139 — provider_categories RLS (executed against Postgres)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(sql134);
    await db.exec(sql135);
    await db.exec(sql137);
    await rows(
      `INSERT INTO public.users (user_id, email, role) VALUES
        ($1,'owner@x','user'),($2,'admin@x','admin'),($3,'creator@x','user'),($4,'other@x','user')`,
      [OWNER, ADMIN, CREATOR, OTHER],
    );
    await rows(
      `INSERT INTO public.categories (category_id, name_de, applicable_section) VALUES
        ($1,'Türkisch','food'),($2,'Kebab / Döner','food')`,
      [CAT.turk, CAT.doner],
    );
    await db.exec(sql139);
    // Production gets these from the baseline ALTER DEFAULT PRIVILEGES
    // (GRANT ALL ON TABLES to anon/authenticated); the fixture grants them
    // explicitly so privileges, not grants, are what RLS tests observe.
    await db.exec(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_categories TO anon, authenticated',
    );
    // Seeded as superuser after the migration: the sync trigger writes the
    // primary junction row for each provider.
    await rows(
      `INSERT INTO public.providers (provider_id, provider_name, category_id, review_status, listing_type, user_created_id, provider_owner_id)
       VALUES
        ($1,'Approved Place',$3,'approved','food',$4,$5),
        ($2,'Pending Place',$3,'pending','food',$4,$5)`,
      [APPROVED, PENDING, CAT.turk, CREATOR, OWNER],
    );
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('anonymous can SELECT junction rows of an approved provider (case 37)', async () => {
    const n = await asCaller('anon', null, async () => (await junctionCount(APPROVED))[0].n);
    expect(n).toBe(1);
  });

  it('anonymous cannot SELECT junction rows of a pending provider (case 38)', async () => {
    const n = await asCaller('anon', null, async () => (await junctionCount(PENDING))[0].n);
    expect(n).toBe(0);
  });

  it('the owner can INSERT and DELETE junction rows (case 39)', async () => {
    await asCaller('authenticated', OWNER, async () => {
      await db.query(
        'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
        [APPROVED, CAT.doner],
      );
      await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
      expect((await junctionCount(APPROVED))[0].n).toBe(2);
      await db.query(
        'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
        [APPROVED, CAT.doner],
      );
      await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
      expect((await junctionCount(APPROVED))[0].n).toBe(1);
    });
  });

  it('a logged-in non-owner non-admin cannot write (case 40)', async () => {
    // A rejected statement aborts the transaction, so each write attempt
    // gets its own caller transaction.
    await asCaller('authenticated', OTHER, () =>
      expect(
        db.query(
          'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
          [APPROVED, CAT.doner],
        ),
      ).rejects.toThrow(/row-level security|row security/i),
    );
    await asCaller('authenticated', OTHER, async () => {
      // DELETE is silently a no-op under RLS: the row survives.
      const res = await db.query(
        'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
        [APPROVED, CAT.turk],
      );
      expect(res.affectedRows).toBe(0);
    });
    expect((await junctionCount(APPROVED))[0].n).toBe(1);
  });

  it('an admin can write junction rows on any provider (case 41)', async () => {
    await asCaller('authenticated', ADMIN, async () => {
      await db.query(
        'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
        [APPROVED, CAT.doner],
      );
      await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
      expect((await junctionCount(APPROVED))[0].n).toBe(2);
      await db.query(
        'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
        [APPROVED, CAT.doner],
      );
      await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
      expect((await junctionCount(APPROVED))[0].n).toBe(1);
    });
  });

  it('a creator (user_created_id) who is not the owner cannot write (case 42)', async () => {
    await asCaller('authenticated', CREATOR, () =>
      expect(
        db.query(
          'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
          [APPROVED, CAT.doner],
        ),
      ).rejects.toThrow(/row-level security|row security/i),
    );
    await asCaller('authenticated', CREATOR, async () => {
      const res = await db.query(
        'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
        [APPROVED, CAT.turk],
      );
      expect(res.affectedRows).toBe(0);
    });
    expect((await junctionCount(APPROVED))[0].n).toBe(1);
  });

  // #254 review MEDIUM 3: the owner save path used to run the junction
  // DELETE and INSERT as two separate PostgREST transactions, so a rejected
  // insert left the provider with zero secondaries.
  // owner_update_provider_categories wraps the replace in one transaction;
  // SECURITY DEFINER + an internal ownership check keeps write access at
  // provider_owner_id (decision 12), with no RLS policy widened.
  describe('owner_update_provider_categories RPC (owner-path atomic secondary writes)', () => {
    // Autocommit caller: a bare query is its own transaction, so the deferred
    // constraint trigger fires at its commit — exactly what a PostgREST rpc()
    // call does. Needed to observe rollback of the DELETE+INSERT pair.
    async function asCallerAutocommit<T>(
      role: string,
      uid: string | null,
      fn: () => Promise<T>,
    ): Promise<T> {
      await rows(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
      await db.exec(`SET ROLE ${role}`);
      try {
        return await fn();
      } finally {
        await db.exec('RESET ROLE');
        await rows(`SELECT set_config('request.jwt.claim.sub', '', false)`);
      }
    }

    it('lets the owner replace the secondary set in one call', async () => {
      await asCallerAutocommit('authenticated', OWNER, () =>
        db.query('SELECT public.owner_update_provider_categories($1, $2::uuid[])', [
          APPROVED,
          [CAT.doner],
        ]),
      );
      expect((await junctionCount(APPROVED))[0].n).toBe(2);
      // restore
      await db.query(
        'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
        [APPROVED, CAT.doner],
      );
    });

    it('an empty list clears the secondaries but keeps the primary row', async () => {
      await db.query(
        'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
        [APPROVED, CAT.doner],
      );
      await asCallerAutocommit('authenticated', OWNER, () =>
        db.query('SELECT public.owner_update_provider_categories($1, $2::uuid[])', [APPROVED, []]),
      );
      expect((await junctionCount(APPROVED))[0].n).toBe(1);
    });

    it('rejects a recommender (user_created_id, not the owner)', async () => {
      await asCallerAutocommit('authenticated', CREATOR, () =>
        expect(
          db.query('SELECT public.owner_update_provider_categories($1, $2::uuid[])', [
            APPROVED,
            [CAT.doner],
          ]),
        ).rejects.toMatchObject({ code: '42501' }),
      );
      expect((await junctionCount(APPROVED))[0].n).toBe(1);
    });

    it('rejects any other authenticated non-owner', async () => {
      await asCallerAutocommit('authenticated', OTHER, () =>
        expect(
          db.query('SELECT public.owner_update_provider_categories($1, $2::uuid[])', [
            APPROVED,
            [CAT.doner],
          ]),
        ).rejects.toMatchObject({ code: '42501' }),
      );
      expect((await junctionCount(APPROVED))[0].n).toBe(1);
    });

    it('a rejected insert rolls the delete back too — original secondaries survive', async () => {
      // Seed one legal secondary as superuser.
      await db.query(
        'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
        [APPROVED, CAT.doner],
      );
      // A cross-section category trips R3 at commit. The whole call is one
      // transaction, so the preceding DELETE of the old secondary must roll
      // back with it.
      await rows(
        `INSERT INTO public.categories (category_id, name_de, applicable_section)
       VALUES ('00000000-0000-0000-0000-0000000000cc', 'Store Cat', 'store')
       ON CONFLICT DO NOTHING`,
      );
      await asCallerAutocommit('authenticated', OWNER, () =>
        expect(
          db.query('SELECT public.owner_update_provider_categories($1, $2::uuid[])', [
            APPROVED,
            ['00000000-0000-0000-0000-0000000000cc'],
          ]),
        ).rejects.toMatchObject({ code: '23514' }),
      );
      const ids = await rows<{ category_id: string }>(
        'SELECT category_id FROM public.provider_categories WHERE provider_id = $1 ORDER BY category_id',
        [APPROVED],
      );
      expect(ids.map((r) => r.category_id).sort()).toEqual([CAT.turk, CAT.doner].sort());
      // restore
      await db.query(
        'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
        [APPROVED, CAT.doner],
      );
    });
  });
});
