import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Live PostgREST check for the #254 review finding: the provider_categories
 * junction gives providers -> categories a second (many-to-many)
 * relationship, so every unhinted `categories(...)` embed fails with
 * PGRST201. PGlite and the mocked query-builder tests cannot see this —
 * only real PostgREST computes relationship resolution.
 *
 * Seam: the live local Supabase stack. Skips entirely when it is not
 * running (e.g. CI without `supabase start`).
 *
 * The suite guarantees the ambiguity exists for the duration of the run:
 * if `public.provider_categories` is absent it creates it with the exact
 * migration signature (composite PK over two ON DELETE CASCADE FKs) and
 * drops it afterwards. It never drops a table the migration created.
 */

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = process.env.PGPORT || '54322';
const REST_BASE = (process.env.SUPABASE_REST_URL || 'http://127.0.0.1:54321') + '/rest/v1';

function runSql(sql: string) {
  const result = spawnSync('psql', ['-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'], {
    encoding: 'utf8',
    input: sql,
    env: {
      ...process.env,
      PGHOST,
      PGPORT,
      PGUSER: process.env.PGUSER || 'postgres',
      PGPASSWORD: process.env.PGPASSWORD || 'postgres',
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'psql failed');
  }
  return result.stdout.trim();
}

async function rest(path: string) {
  const res = await fetch(`${REST_BASE}${path}`);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const pgReady = spawnSync('pg_isready', ['-h', PGHOST, '-p', PGPORT], { encoding: 'utf8' });

// Sync REST probe — top-level await isn't available under this tsconfig.
const restReady =
  spawnSync(
    process.execPath,
    [
      '-e',
      `fetch('${REST_BASE}/providers?select=provider_id&limit=0').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))`,
    ],
    { encoding: 'utf8', timeout: 5000 },
  ).status === 0;

const LOCAL_STACK = pgReady.status === 0 && restReady;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll the PostgREST root spec until the junction table is visible. */
async function waitForSchemaReload(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${REST_BASE}/`);
      const spec = (await res.json()) as { definitions?: Record<string, unknown> };
      if (spec.definitions && 'provider_categories' in spec.definitions) return;
    } catch {
      /* keep polling */
    }
    await sleep(500);
  }
  throw new Error('PostgREST schema cache did not pick up provider_categories in time');
}

// Embeds look like `categories(name_de, ...)` or `category:categories(...)`.
// The lookbehind keeps `provider_categories(` from matching: `_` is a word
// character, so `categories` inside it never starts the match.
const EMBED_RE = /(?<![\w])((?:category:)?categories)(?:!(\w+))?\(([^)]*)\)/g;

function collectCategoryEmbeds(): { file: string; embed: string }[] {
  const srcDir = join(process.cwd(), 'src');
  const found: { file: string; embed: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.test.ts')) continue;
      const text = readFileSync(full, 'utf8');
      for (const m of Array.from(text.matchAll(EMBED_RE))) {
        found.push({ file: full.replace(`${srcDir}/`, ''), embed: m[0] });
      }
    }
  };
  walk(srcDir);
  return found;
}

describe.skipIf(!LOCAL_STACK)(
  'providers -> categories embeds under the junction m2m ambiguity',
  () => {
    let createdTable = false;
    let embeds: { file: string; embed: string }[] = [];

    beforeAll(async () => {
      const exists = runSql(`SELECT to_regclass('public.provider_categories') IS NOT NULL;`);
      if (exists !== 't') {
        // Same signature as migration 139: composite PK over two FKs is what
        // PostgREST reads as many-to-many and creates the ambiguity.
        runSql(`
        CREATE TABLE public.provider_categories (
          provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
          category_id uuid NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
          created_at  timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (provider_id, category_id)
        );
      `);
        createdTable = true;
      }
      await waitForSchemaReload();
      embeds = collectCategoryEmbeds();
    }, 30_000);

    afterAll(() => {
      if (createdTable) {
        spawnSync('psql', ['-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'], {
          encoding: 'utf8',
          input: 'DROP TABLE public.provider_categories;',
          env: {
            ...process.env,
            PGHOST,
            PGPORT,
            PGUSER: process.env.PGUSER || 'postgres',
            PGPASSWORD: process.env.PGPASSWORD || 'postgres',
          },
        });
      }
    });

    it('guard: an UNHINTED categories embed really is rejected while the junction exists', async () => {
      const { status, body } = await rest(
        '/providers?select=provider_id,category:categories(name_de)&limit=0',
      );
      // Proves the ambiguity is live during this suite, so the assertions
      // below are not vacuous. PostgREST answers 300 with code PGRST201.
      expect(status).not.toBe(200);
      expect((body as { code?: string })?.code).toBe('PGRST201');
    });

    it('every categories embed in src/ carries the !providers_category_id_fkey hint', () => {
      const unhinted = embeds.filter((e) => !e.embed.includes('!providers_category_id_fkey'));
      expect(
        unhinted,
        `unhinted categories embeds would 400 under PostgREST: ${unhinted
          .map((e) => `${e.file}: ${e.embed}`)
          .join('; ')}`,
      ).toEqual([]);
      expect(embeds.length).toBeGreaterThan(0);
    });

    it('no embed carries a duplicated column list (fkey(...)(...) artifact)', () => {
      // A past bulk edit produced `categories!fk(cols)(cols)` — PostgREST
      // tolerates it, so only a source scan can catch the regression.
      const DOUBLE_COLS = /(?:category:)?categories(?:!\w+)?\([^)]*\)\s*\(/;
      const srcDir = join(process.cwd(), 'src');
      const offenders: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '__tests__') walk(full);
            continue;
          }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue;
          if (DOUBLE_COLS.test(readFileSync(full, 'utf8')))
            offenders.push(full.replace(`${srcDir}/`, ''));
        }
      };
      walk(srcDir);
      expect(offenders).toEqual([]);
    });

    it('every hinted embed resolves live against PostgREST', async () => {
      const distinct = Array.from(new Set(embeds.map((e) => e.embed)));
      for (const embed of distinct) {
        const { status, body } = await rest(`/providers?select=provider_id,${embed}&limit=0`);
        expect(status, `${embed} -> ${status} ${JSON.stringify(body)}`).toBe(200);
      }
    });

    it('the search.ts composition resolves: hinted category embed + provider_categories!inner filter', async () => {
      const { status, body } = await rest(
        '/providers?select=*,category:categories!providers_category_id_fkey(name_de,name_en,category_images),provider_categories!inner(category_id)' +
          '&provider_categories.category_id=eq.00000000-0000-0000-0000-000000000000&limit=0',
      );
      expect(status, JSON.stringify(body)).toBe(200);
    });

    it('nested embeds resolve: map pins (locations -> providers!inner -> categories)', async () => {
      const { status, body } = await rest(
        '/locations?select=provider_id,providers!inner(provider_name,category_id,categories!providers_category_id_fkey(name_de,name_en,category_images))&limit=0',
      );
      expect(status, JSON.stringify(body)).toBe(200);
    });

    it('nested embeds resolve: bookmarks (bookmarks -> providers -> category)', async () => {
      const { status, body } = await rest(
        '/bookmarks?select=provider_id,providers(*,category:categories!providers_category_id_fkey(name_de,name_en,category_images),locations(*))&limit=0',
      );
      expect(status, JSON.stringify(body)).toBe(200);
    });

    it('the junction embed used by the edit-form loaders resolves', async () => {
      const { status, body } = await rest(
        '/providers?select=provider_id,provider_categories(category_id)&limit=0',
      );
      expect(status, JSON.stringify(body)).toBe(200);
    });
  },
);
