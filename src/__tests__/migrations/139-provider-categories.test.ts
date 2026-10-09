import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Executes migration 139 (provider_categories junction for #254) against a
// real (WASM) Postgres. Triggers, deferred constraint triggers, FK cascade
// ordering and EXISTS semantics cannot be faked with mocks.
//
// Fixture mirrors the production shape that matters: the categories /
// providers columns both replaced RPCs read, the migration-121 body of
// search_providers_chat as the pre-change baseline, the 134/135 search
// stack search_providers_for_query depends on, and provider_is_visible +
// auth.uid() so the new RLS policies can be created.

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

const ID = {
  // categories
  turk: '00000000-0000-0000-0000-0000000000c1', // 'Türkisch', food
  doner: '00000000-0000-0000-0000-0000000000c2', // 'Kebab / Döner', food
  pizza: '00000000-0000-0000-0000-0000000000c3', // 'Pizza', food
  arab: '00000000-0000-0000-0000-0000000000c4', // 'Arabisch', food
  pers: '00000000-0000-0000-0000-0000000000c5', // 'Persisch', food
  balk: '00000000-0000-0000-0000-0000000000c6', // 'Balkan', food (6th-category probe)
  turkHaus: '00000000-0000-0000-0000-0000000000c7', // 'Türkisch Haus', food (case 29)
  mode: '00000000-0000-0000-0000-0000000000c8', // 'Kleidung & Mode', store
  gem: '00000000-0000-0000-0000-0000000000c9', // 'Gemeinschaft & Spenden', 'all'
  // providers
  p1: '00000000-0000-0000-0000-0000000000a1', // primary Türkisch (pre-migration)
  pNull: '00000000-0000-0000-0000-0000000000a2', // category_id NULL (pre-migration)
  pB: '00000000-0000-0000-0000-0000000000a3', // primary Döner + secondary Türkisch
  pC: '00000000-0000-0000-0000-0000000000a4', // primary Türkisch + secondary Türkisch Haus
};

// Categories exist before the migration so the backfill and the FK wiring
// behave exactly like production.
const PRE_MIGRATION_FIXTURE = `
  INSERT INTO public.categories (category_id, name_de, name_en, applicable_section) VALUES
    ('${ID.turk}', 'Türkisch', 'Turkish', 'food'),
    ('${ID.doner}', 'Kebab / Döner', 'Kebab / Doner', 'food'),
    ('${ID.pizza}', 'Pizza', 'Pizza', 'food'),
    ('${ID.arab}', 'Arabisch', 'Arabic', 'food'),
    ('${ID.pers}', 'Persisch', 'Persian', 'food'),
    ('${ID.balk}', 'Balkan', 'Balkan', 'food'),
    ('${ID.turkHaus}', 'Türkisch Haus', 'Turkish House', 'food'),
    ('${ID.mode}', 'Kleidung & Mode', 'Clothing & Fashion', 'store'),
    ('${ID.gem}', 'Gemeinschaft & Spenden', 'Community & Donations', 'all');
  INSERT INTO public.providers (provider_id, provider_name, category_id, address_city, review_status, listing_type, created_at) VALUES
    ('${ID.p1}', 'Anatolia Grill', '${ID.turk}', 'Berlin', 'approved', 'food', '2024-01-01T00:00:00Z'),
    ('${ID.pNull}', 'No Category Place', NULL, 'Berlin', 'approved', 'food', '2024-02-01T00:00:00Z');
`;

// After the migration: pB holds Döner as Primary and Türkisch as Secondary
// (the user's literal scenario), pC holds two categories whose names both
// match the query 'türk'.
const POST_MIGRATION_FIXTURE = `
  INSERT INTO public.providers (provider_id, provider_name, category_id, address_city, review_status, listing_type, created_at) VALUES
    ('${ID.pB}', 'Bosphorus Imbiss', '${ID.doner}', 'Berlin', 'approved', 'food', '2024-06-01T00:00:00Z'),
    ('${ID.pC}', 'Orient Eck', '${ID.turk}', 'Berlin', 'approved', 'food', '2024-03-01T00:00:00Z');
  INSERT INTO public.provider_categories (provider_id, category_id) VALUES
    ('${ID.pB}', '${ID.turk}'),
    ('${ID.pC}', '${ID.turkHaus}');
  INSERT INTO public.food_menu (provider_id, name_de, name_en, is_available) VALUES
    ('${ID.p1}', 'Lahmacun', 'Lahmacun', true);
`;

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const readMigration = (suffix: string) => {
  const name = readdirSync(migrationDir).find((file) => file.endsWith(suffix));
  if (!name) throw new Error(`migration file matching ${suffix} not found`);
  return readFileSync(join(migrationDir, name), 'utf8');
};

const sql121 = readMigration('_plan_199_chatbot_open_now.sql');
const sql134 = readMigration('_plan_266_desktop_search_partial.sql');
const sql135 = readMigration('_plan_267_admin_all_status_scope.sql');
const sql137 = readMigration('_issue547_provider_route_visibility.sql');
const sql139 = readMigration('_issue254_provider_categories.sql');

let db: PGlite;

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Runs fn inside a transaction and forces the deferred constraint triggers.
 * Returns the raised error, or undefined when everything validated clean. */
async function inCheckedTx(
  fn: () => Promise<unknown>,
): Promise<{ code?: string; message?: string } | undefined> {
  await db.exec('BEGIN');
  let error: { code?: string; message?: string } | undefined;
  try {
    await fn();
    await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
  } catch (e) {
    error = e as { code?: string; message?: string };
  }
  await db.exec('ROLLBACK');
  return error;
}

async function expectCheckViolation(fn: () => Promise<unknown>, messagePart: string) {
  const error = await inCheckedTx(fn);
  expect(error, `expected a 23514 rejection containing '${messagePart}'`).toBeDefined();
  if (!error) return;
  expect(error.code).toBe('23514');
  expect(error.message).toContain(messagePart);
}

async function junctionRows(providerId: string) {
  return rows<{ category_id: string }>(
    'SELECT category_id FROM public.provider_categories WHERE provider_id = $1 ORDER BY category_id',
    [providerId],
  );
}

type ChatRow = { provider_id: string; category_name: string | null };
const chatSearch = (query: string, category: string | null) =>
  rows<ChatRow>(
    'SELECT * FROM public.search_providers_chat(p_search_query := $1, p_category_filter := $2, p_limit_count := 50)',
    [query, category],
  );

const querySearch = (q: string) =>
  rows<{ provider_id: string; matched_menu_items: string[] }>(
    'SELECT * FROM public.search_providers_for_query($1, $2, $3)',
    [q, 'food', null],
  );

describe('migration 139 — provider_categories (executed against Postgres)', () => {
  let chatBaseline: ChatRow[];

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(sql134);
    await db.exec(sql135);
    await db.exec(sql137);
    await db.exec(sql121);
    await db.exec(PRE_MIGRATION_FIXTURE);
    // Baseline snapshot for the no-change regression (case 24).
    chatBaseline = await chatSearch('', null);
    await db.exec(sql139);
    await db.exec(POST_MIGRATION_FIXTURE);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  describe('backfill', () => {
    it('backfills one junction row equal to the primary category (case 1)', async () => {
      expect(await junctionRows(ID.p1)).toEqual([{ category_id: ID.turk }]);
    });

    it('leaves a provider with NULL category_id without junction rows (case 2)', async () => {
      expect(await junctionRows(ID.pNull)).toEqual([]);
    });

    it('applies cleanly against zero providers (case 3)', async () => {
      const empty = new PGlite();
      try {
        await empty.exec(SCHEMA);
        await empty.exec(sql134);
        await empty.exec(sql135);
        await empty.exec(sql137);
        await empty.exec(sql121);
        await expect(empty.exec(sql139)).resolves.toBeDefined();
      } finally {
        await empty.close();
      }
    });

    it('backfill statement is idempotent (case 4)', async () => {
      const before = (
        await rows<{ n: number }>('SELECT count(*)::int AS n FROM public.provider_categories')
      )[0].n;
      await db.exec(`
        INSERT INTO public.provider_categories (provider_id, category_id)
        SELECT p.provider_id, p.category_id FROM public.providers p
        WHERE p.category_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      `);
      const after = (
        await rows<{ n: number }>('SELECT count(*)::int AS n FROM public.provider_categories')
      )[0].n;
      expect(after).toBe(before);
    });

    it('leaves no provider whose primary is missing from the junction (case 5)', async () => {
      const [{ n }] = await rows<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.providers p
         WHERE p.category_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM public.provider_categories pc
                           WHERE pc.provider_id = p.provider_id
                             AND pc.category_id = p.category_id)`,
      );
      expect(n).toBe(0);
    });
  });

  describe('invariant enforcement (R1-R3, deferred triggers)', () => {
    it('rejects a 6th category with 23514 (case 6)', async () => {
      // pB currently has 2 rows; add 3 more (total 5), then a 6th.
      await expectCheckViolation(
        () =>
          db.query(
            `INSERT INTO public.provider_categories (provider_id, category_id) VALUES
               ($1, $2), ($1, $3), ($1, $4), ($1, $5)`,
            [ID.pB, ID.pizza, ID.arab, ID.pers, ID.balk],
          ),
        'maximum is 5',
      );
    });

    it('accepts a 4th secondary category (5 total, case 7)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query(
          `INSERT INTO public.provider_categories (provider_id, category_id) VALUES
             ($1, $2), ($1, $3), ($1, $4)`,
          [ID.pB, ID.pizza, ID.arab, ID.pers],
        );
        const [{ n }] = await rows<{ n: number }>(
          'SELECT count(*)::int AS n FROM public.provider_categories WHERE provider_id = $1',
          [ID.pB],
        );
        expect(n).toBe(5);
      });
      expect(error).toBeUndefined();
    });

    it('rejects a store category as secondary on a food primary (case 8)', async () => {
      await expectCheckViolation(
        () =>
          db.query(
            'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
            [ID.pB, ID.mode],
          ),
        'Kleidung & Mode',
      );
    });

    it("rejects an 'all' category as secondary (case 9)", async () => {
      await expectCheckViolation(
        () =>
          db.query(
            'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
            [ID.pB, ID.gem],
          ),
        'Gemeinschaft & Spenden',
      );
    });

    it('rejects deleting the primary row from the junction (case 10)', async () => {
      await expectCheckViolation(
        () =>
          db.query(
            'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
            [ID.pB, ID.doner],
          ),
        'missing from provider_categories',
      );
    });

    it('rejects a secondary for a provider with NULL category_id (case 11)', async () => {
      await expectCheckViolation(
        () =>
          db.query(
            'INSERT INTO public.provider_categories (provider_id, category_id) VALUES ($1, $2)',
            [ID.pNull, ID.doner],
          ),
        'no primary category_id',
      );
    });

    it('allows deleting a secondary row (case 12)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query(
          'DELETE FROM public.provider_categories WHERE provider_id = $1 AND category_id = $2',
          [ID.pB, ID.turk],
        );
        expect(await junctionRows(ID.pB)).toEqual([{ category_id: ID.doner }]);
      });
      expect(error).toBeUndefined();
    });

    it('changing the primary resets the set to just the new primary (case 13)', async () => {
      const error = await inCheckedTx(async () => {
        // grow pB to 5 rows first
        await db.query(
          `INSERT INTO public.provider_categories (provider_id, category_id) VALUES
             ($1, $2), ($1, $3), ($1, $4)`,
          [ID.pB, ID.pizza, ID.arab, ID.pers],
        );
        await db.query('UPDATE public.providers SET category_id = $2 WHERE provider_id = $1', [
          ID.pB,
          ID.balk,
        ]);
        expect(await junctionRows(ID.pB)).toEqual([{ category_id: ID.balk }]);
      });
      expect(error).toBeUndefined();
    });

    it('clearing the primary empties the set (case 14)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query('UPDATE public.providers SET category_id = NULL WHERE provider_id = $1', [
          ID.pB,
        ]);
        expect(await junctionRows(ID.pB)).toEqual([]);
      });
      expect(error).toBeUndefined();
    });

    it('inserting a provider with a category auto-creates the junction row (case 15)', async () => {
      const pid = '00000000-0000-0000-0000-0000000000a9';
      const error = await inCheckedTx(async () => {
        await db.query(
          `INSERT INTO public.providers (provider_id, provider_name, category_id, review_status, listing_type)
           VALUES ($1, 'New Place', $2, 'approved', 'food')`,
          [pid, ID.turk],
        );
        expect(await junctionRows(pid)).toEqual([{ category_id: ID.turk }]);
      });
      expect(error).toBeUndefined();
    });

    it('deleting a secondary category removes only that junction row (case 16)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query('DELETE FROM public.categories WHERE category_id = $1', [ID.turkHaus]);
        // pC keeps its primary junction row; the Türkisch Haus row is gone.
        expect(await junctionRows(ID.pC)).toEqual([{ category_id: ID.turk }]);
        // p1 is untouched
        expect(await junctionRows(ID.p1)).toEqual([{ category_id: ID.turk }]);
      });
      expect(error).toBeUndefined();
    });

    it('deleting the primary category nulls category_id and empties the junction (case 17)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query('DELETE FROM public.categories WHERE category_id = $1', [ID.doner]);
        const [{ category_id }] = await rows<{ category_id: string | null }>(
          'SELECT category_id FROM public.providers WHERE provider_id = $1',
          [ID.pB],
        );
        expect(category_id).toBeNull();
        expect(await junctionRows(ID.pB)).toEqual([]);
      });
      expect(error).toBeUndefined();
    });

    it('primary-then-secondaries in one transaction validates clean (case 18)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query('UPDATE public.providers SET category_id = $2 WHERE provider_id = $1', [
          ID.pB,
          ID.arab,
        ]);
        await db.query(
          `INSERT INTO public.provider_categories (provider_id, category_id) VALUES
             ($1, $2), ($1, $3)`,
          [ID.pB, ID.doner, ID.turk],
        );
        expect((await junctionRows(ID.pB)).map((r) => r.category_id).sort()).toEqual(
          [ID.arab, ID.doner, ID.turk].sort(),
        );
      });
      expect(error).toBeUndefined();
    });

    it('deleting a provider cascades its junction rows without error (case 19)', async () => {
      const error = await inCheckedTx(async () => {
        await db.query('DELETE FROM public.providers WHERE provider_id = $1', [ID.pB]);
        expect(await junctionRows(ID.pB)).toEqual([]);
      });
      expect(error).toBeUndefined();
    });
  });

  describe('search_providers_chat', () => {
    it('returns providers matching on primary AND on secondary (case 20)', async () => {
      const ids = (await chatSearch('', ID.turk)).map((r) => r.provider_id);
      expect(ids).toContain(ID.p1); // primary Türkisch
      expect(ids).toContain(ID.pB); // secondary Türkisch
      expect(ids).toContain(ID.pC); // primary Türkisch
    });

    it('returns each matching provider exactly once (case 21)', async () => {
      const ids = (await chatSearch('', ID.turk)).map((r) => r.provider_id);
      expect(new Set(ids).size).toBe(ids.length);
      // p1, pB, pC all hold Türkisch; pNull does not.
      expect(ids.sort()).toEqual([ID.p1, ID.pB, ID.pC].sort());
    });

    it('ranks a primary match above a secondary match at equal rank (case 22)', async () => {
      // pB is newer than p1: without the new tiebreak, created_at DESC would
      // put the secondary match first.
      const ids = (await chatSearch('', ID.turk)).map((r) => r.provider_id);
      expect(ids.indexOf(ID.p1)).toBeLessThan(ids.indexOf(ID.pB));
    });

    it('returns the provider’s own primary category name, not the matched secondary (case 23)', async () => {
      const row = (await chatSearch('', ID.turk)).find((r) => r.provider_id === ID.pB);
      expect(row?.category_name).toBe('Kebab / Döner');
    });

    it('returns identical rows in identical order for pre-migration data (case 24)', async () => {
      // Same arguments as the pre-migration snapshot; filtering the result
      // preserves the function's internal ordering for the surviving rows.
      const after = (await chatSearch('', null)).filter((r) =>
        [ID.p1, ID.pNull].includes(r.provider_id),
      );
      const baselineSubset = chatBaseline.filter((r) => [ID.p1, ID.pNull].includes(r.provider_id));
      expect(after).toEqual(baselineSubset);
    });

    it('returns all approved providers when the category filter is NULL (case 25)', async () => {
      const ids = (await chatSearch('', null)).map((r) => r.provider_id);
      expect(ids.sort()).toEqual([ID.p1, ID.pNull, ID.pB, ID.pC].sort());
    });

    it('never returns a category-less provider for a category filter (case 26)', async () => {
      for (const cat of [ID.turk, ID.doner, ID.mode, ID.gem]) {
        const ids = (await chatSearch('', cat)).map((r) => r.provider_id);
        expect(ids).not.toContain(ID.pNull);
      }
    });

    it('returns the same 16 columns in the same order (case 27)', async () => {
      const res = await db.query(
        `SELECT * FROM public.search_providers_chat(p_search_query := '', p_limit_count := 5) LIMIT 0`,
      );
      expect(res.fields.map((f) => f.name)).toEqual([
        'provider_id',
        'provider_name',
        'provider_description',
        'address_city',
        'category_name',
        'listing_type',
        'muslim_owned',
        'has_prayer_space',
        'family_friendly',
        'women_friendly',
        'children_friendly',
        'has_parking',
        'economic_solidarity',
        'makes_donations',
        'opening_hours',
        'rank',
      ]);
    });
  });

  describe('search_providers_for_query', () => {
    it('matches a secondary category name in free-text search (case 28)', async () => {
      const ids = (await querySearch('Türkisch')).map((r) => r.provider_id);
      expect(ids).toContain(ID.pB); // matched via secondary Türkisch
      expect(ids).toContain(ID.p1); // matched via primary Türkisch
    });

    it('returns a provider once when primary and secondary names both match (case 29)', async () => {
      const ids = (await querySearch('türk')).map((r) => r.provider_id);
      expect(ids.filter((id) => id === ID.pC)).toHaveLength(1);
    });

    it('still returns matched_menu_items for a menu-item query (case 30)', async () => {
      expect(await querySearch('Lahmacun')).toEqual([
        { provider_id: ID.p1, matched_menu_items: ['Lahmacun'] },
      ]);
    });

    // Case 31: the 134 test file remains green unchanged; the assertions
    // below re-check its core behaviours against the post-139 body.
    it('keeps 134 behaviours: name prefix, section scope, hostile input (case 31)', async () => {
      expect((await querySearch('Anatolia')).map((r) => r.provider_id)).toEqual([ID.p1]);
      expect(
        (
          await rows<{ provider_id: string }>(
            'SELECT provider_id FROM public.search_providers_for_query($1, $2, $3)',
            ['Anatolia', 'store', null],
          )
        ).map((r) => r.provider_id),
      ).toEqual([]);
      await expect(querySearch("' OR 1=1 --")).resolves.toBeDefined();
    });
  });
});
