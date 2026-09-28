import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Executes migration 134 against a real (WASM) Postgres. SQL-text assertions are
// what let F4 ship in migration 077, so these tests check behaviour instead.

// Mirrors production columns after migration 006 (providers.offers_ids dropped).
const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TYPE public.listing_type_enum AS ENUM ('food', 'store', 'ummah');
  CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');
  CREATE TABLE public.categories (
    category_id uuid PRIMARY KEY, name_de text, name_en text,
    description_de text, description_en text, category_images jsonb, applicable_section text
  );
  CREATE TABLE public.offers (offer_id uuid PRIMARY KEY, name_de text NOT NULL, name_en text, category_id uuid NOT NULL);
  CREATE TABLE public.needs (need_id uuid PRIMARY KEY, name_de text NOT NULL, name_en text, category_id uuid NOT NULL);
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY, provider_name text NOT NULL, category_id uuid, address_city text,
    review_status public.review_status DEFAULT 'pending', listing_type public.listing_type_enum,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.provider_offers (provider_id uuid NOT NULL, offer_id uuid NOT NULL);
  CREATE TABLE public.provider_needs (provider_id uuid NOT NULL, need_id uuid NOT NULL);
  CREATE TABLE public.food_menu (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL,
    name_de text, name_en text, is_available boolean DEFAULT true
  );
`;

const ID = {
  turk: '00000000-0000-0000-0000-0000000000c1',
  afgh: '00000000-0000-0000-0000-0000000000c2',
  pers: '00000000-0000-0000-0000-0000000000c3',
  doner: '00000000-0000-0000-0000-0000000000a1',
  manti: '00000000-0000-0000-0000-0000000000a2',
  ist: '00000000-0000-0000-0000-0000000000b1',
  kab: '00000000-0000-0000-0000-0000000000b2',
  istMuc: '00000000-0000-0000-0000-0000000000b3',
  store: '00000000-0000-0000-0000-0000000000b4',
  pending: '00000000-0000-0000-0000-0000000000b5',
};

const FIXTURE = `
  INSERT INTO public.categories VALUES
    ('${ID.turk}', 'Türkische Küche', 'Turkish Cuisine', 'Döner, Kebab und mehr', NULL, NULL, 'food'),
    ('${ID.afgh}', 'Afghanische Küche', 'Afghan Cuisine', NULL, NULL, NULL, 'food'),
    ('${ID.pers}', 'Persische Küche', 'Persian Cuisine', NULL, NULL, NULL, 'food');
  INSERT INTO public.offers VALUES
    ('${ID.doner}', 'Döner Kebab', 'Doner Kebab', '${ID.turk}'),
    ('${ID.manti}', 'Mantı', 'Manti', '${ID.turk}');
  INSERT INTO public.providers (provider_id, provider_name, category_id, address_city, review_status, listing_type) VALUES
    ('${ID.ist}', 'Istanbul Grill', '${ID.turk}', 'Berlin', 'approved', 'food'),
    ('${ID.kab}', 'Kabul Kitchen', '${ID.afgh}', 'Berlin', 'approved', 'food'),
    ('${ID.istMuc}', 'Istanbul Imbiss', '${ID.turk}', 'Muenchen', 'approved', 'food'),
    ('${ID.store}', 'Istanbul Markt', NULL, 'Berlin', 'approved', 'store'),
    ('${ID.pending}', 'Istanbul Pending', '${ID.turk}', 'Berlin', 'pending', 'food');
  INSERT INTO public.provider_offers VALUES
    ('${ID.ist}', '${ID.doner}'), ('${ID.istMuc}', '${ID.doner}'), ('${ID.pending}', '${ID.doner}');
  INSERT INTO public.food_menu (provider_id, name_de, name_en, is_available) VALUES
    ('${ID.ist}', 'Lahmacun', 'Lahmacun', true),
    ('${ID.ist}', 'Döner Kebab', 'Doner Kebab', true),
    ('${ID.kab}', 'Lahmacun Alt', NULL, false),
    ('${ID.pending}', 'Lahmacun Spezial', NULL, true);
`;

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const migrationFile = readdirSync(migrationDir).find((name) =>
  name.endsWith('_plan_266_desktop_search_partial.sql'),
);

if (!migrationFile) {
  throw new Error('Plan 266 migration file not found in supabase/migrations');
}

const migrationSql = readFileSync(join(migrationDir, migrationFile), 'utf8');

let db: PGlite;

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

const providersFor = (q: string, section: string | null = 'food', city: string | null = 'Berlin') =>
  rows<{ provider_id: string; matched_menu_items: string[] }>(
    'SELECT * FROM public.search_providers_for_query($1, $2, $3)',
    [q, section, city],
  );

const suggestionsFor = (
  q: string,
  section: string | null = 'food',
  city: string | null = 'Berlin',
) =>
  rows<{ label: string; type: string }>(
    'SELECT * FROM public.search_scoped_suggestions($1, $2, $3, 10)',
    [q, section, city],
  );

describe('migration 134 (executed against Postgres)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(migrationSql);
    await db.exec(FIXTURE);
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('is idempotent (re-applies cleanly)', async () => {
    await expect(db.exec(migrationSql)).resolves.toBeDefined();
  });

  describe('search_prefix_query', () => {
    const prefix = async (q: string) =>
      (await rows<{ q: string | null }>('SELECT public.search_prefix_query($1)::text AS q', [q]))[0]
        .q;

    it('ANDs every whitespace-separated token as a prefix (F4)', async () => {
      expect(await prefix('döner   keb')).toBe("'döner':* & 'keb':*");
    });

    it('keeps stopword-shaped tokens', async () => {
      expect(await prefix('Ist')).toBe("'ist':*");
    });

    it('strips tsquery operators and punctuation', async () => {
      expect(await prefix('a & b | c:*')).toBe("'a':* & 'b':* & 'c':*");
    });

    it('returns NULL for empty or punctuation-only input', async () => {
      expect(await prefix('')).toBeNull();
      expect(await prefix('!!! &&& ***')).toBeNull();
    });
  });

  describe('search_providers_for_query', () => {
    it.each([
      ['Istan', ID.ist],
      ['Ist', ID.ist], // stopword-shaped under the german config
      ['Kab', ID.kab],
      ['Afgh', ID.kab], // category prefix
    ])('prefix %s matches the expected provider', async (q, expected) => {
      expect((await providersFor(q)).map((r) => r.provider_id)).toEqual([expected]);
    });

    it('matches multi-word partials and returns the matched dish (F4)', async () => {
      expect(await providersFor('döner keb')).toEqual([
        { provider_id: ID.ist, matched_menu_items: ['Döner Kebab'] },
      ]);
    });

    it('matches menu items by prefix, ignoring unavailable items', async () => {
      expect(await providersFor('Lahm')).toEqual([
        { provider_id: ID.ist, matched_menu_items: ['Lahmacun'] },
      ]);
    });

    it('scopes by section and city', async () => {
      expect((await providersFor('Istanbul', 'store')).map((r) => r.provider_id)).toEqual([
        ID.store,
      ]);
      expect(
        (await providersFor('Istanbul', 'food', null)).map((r) => r.provider_id).sort(),
      ).toEqual([ID.ist, ID.istMuc].sort());
    });

    it('never returns pending providers by default', async () => {
      const ids = (await providersFor('Istanbul', null, null)).map((r) => r.provider_id);
      expect(ids).not.toContain(ID.pending);
    });

    it.each(['', '!!! &&& ***', 'a & b | c ! d :* (x)', "' OR 1=1 --"])(
      'handles hostile input %j without error',
      async (q) => {
        expect(await providersFor(q, null, null)).toEqual([]);
      },
    );
  });

  describe('search_scoped_suggestions', () => {
    it('suggests a provider only when its name matches the query', async () => {
      const lahm = await suggestionsFor('Lahm');
      expect(lahm).toContainEqual({ label: 'Lahmacun', type: 'menuItem' });
      expect(lahm.filter((s) => s.type === 'provider')).toEqual([]);
    });

    it('suggests stopword-shaped provider prefixes within scope only', async () => {
      const providers = (await suggestionsFor('Ist')).filter((s) => s.type === 'provider');
      expect(providers).toEqual([{ label: 'Istanbul Grill', type: 'provider' }]);
    });

    it.each(['Ist', 'Lahm', 'türk', 'döner keb', 'Kab'])(
      'every suggestion for %j yields results in the same scope (D4)',
      async (q) => {
        const suggestions = await suggestionsFor(q);
        expect(suggestions.length).toBeGreaterThan(0);
        for (const s of suggestions) {
          expect((await providersFor(s.label)).length, s.label).toBeGreaterThan(0);
        }
      },
    );
  });

  describe('search_food_concepts (mobile /search)', () => {
    it('returns top concepts by approved-provider count for an empty query', async () => {
      expect(
        await rows('SELECT name_de, provider_count FROM public.search_food_concepts($1, 10)', ['']),
      ).toEqual([{ name_de: 'Döner Kebab', provider_count: 2 }]);
    });

    it('matches multi-word partials (F4)', async () => {
      const r = await rows<{ name_de: string }>(
        'SELECT name_de FROM public.search_food_concepts($1, 10)',
        ['döner keb'],
      );
      expect(r.map((x) => x.name_de)).toEqual(['Döner Kebab']);
    });
  });

  describe('search_food_categories (mobile /search)', () => {
    const categories = (q: string) =>
      rows<{ name_de: string; provider_count: number }>(
        'SELECT name_de, provider_count FROM public.search_food_categories($1, 8)',
        [q],
      );

    it('returns all food categories ranked by provider count for an empty query', async () => {
      expect(await categories('')).toEqual([
        { name_de: 'Türkische Küche', provider_count: 2 },
        { name_de: 'Afghanische Küche', provider_count: 1 },
        { name_de: 'Persische Küche', provider_count: 0 },
      ]);
    });

    it('matches multi-word partials (F4)', async () => {
      expect((await categories('türkische küche')).map((r) => r.name_de)).toEqual([
        'Türkische Küche',
      ]);
    });

    it('still matches on category description', async () => {
      expect((await categories('kebab')).map((r) => r.name_de)).toEqual(['Türkische Küche']);
    });

    it('keeps matching categories that have no providers yet', async () => {
      expect(await categories('pers')).toEqual([{ name_de: 'Persische Küche', provider_count: 0 }]);
    });

    it('[pre-fix FAILS] has an index matching the name + description predicate', async () => {
      await db.exec('SET enable_seqscan = off');
      try {
        const plan = await rows<{ 'QUERY PLAN': string }>(
          `EXPLAIN SELECT 1 FROM public.categories c
           WHERE to_tsvector('simple', coalesce(c.name_de, '') || ' ' || coalesce(c.name_en, '') || ' ' || coalesce(c.description_de, '') || ' ' || coalesce(c.description_en, '')) @@ public.search_prefix_query('kebab')`,
        );
        expect(plan.map((r) => r['QUERY PLAN']).join('\n')).toContain('Index Scan');
      } finally {
        await db.exec('RESET enable_seqscan');
      }
    });
  });
});
