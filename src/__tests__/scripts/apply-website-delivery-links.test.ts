import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseLinkStore,
  PAGE_SIZE,
  runApplyLinks,
  type LinkProvider,
  type LinkStore,
} from '../../../scripts/apply-website-delivery-links';

const SITE = 'https://tevhid.example/';
const PAGE_HTML = [
  'https://www.lieferando.de/speisekarte/tevhid',
  'https://www.ubereats.com/de/store/tevhid/abc123',
  'https://wolt.com/de/deu/berlin/restaurant/tevhid',
  'https://www.instagram.com/tevhid',
]
  .map((h) => `<a href="${h}">x</a>`)
  .join('');

const provider = (over: Partial<LinkProvider> = {}): LinkProvider => ({
  provider_id: 'p1',
  provider_name: 'Bistro Salam',
  social_website: SITE,
  held: new Set<string>(),
  ...over,
});

type FetchPage = (url: string) => Promise<{ html: string; url: string }>;

interface Opts {
  providers?: LinkProvider[];
  apply?: boolean;
  fetchPage?: FetchPage;
}

async function run(opts: Opts = {}) {
  const writeLink = vi.fn(async () => undefined);
  const store: LinkStore = {
    listProviders: vi.fn(async () => opts.providers ?? [provider()]),
    writeLink,
  };
  const fetchPage = vi.fn(opts.fetchPage ?? (async () => ({ html: PAGE_HTML, url: SITE })));
  const logs: string[] = [];
  const summary = await runApplyLinks({
    store,
    fetchPage,
    log: (m) => logs.push(m),
    options: { apply: opts.apply ?? true, limit: 10 },
  });
  return { store, summary, fetchPage, writeLink, logs };
}

const written = (writeLink: ReturnType<typeof vi.fn>) =>
  writeLink.mock.calls.map((c) => c[0] as Record<string, unknown>);

describe('apply website delivery links (#806)', () => {
  it('2: writes known-platform links straight to the provider delivery links', async () => {
    const { writeLink, summary } = await run();

    expect(written(writeLink)).toEqual(
      expect.arrayContaining([
        {
          provider_id: 'p1',
          platform: 'lieferando',
          platform_url: 'https://www.lieferando.de/speisekarte/tevhid',
          platform_slug: 'tevhid',
          is_active: true,
        },
        {
          provider_id: 'p1',
          platform: 'wolt',
          platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
          platform_slug: 'tevhid',
          is_active: true,
        },
      ]),
    );
    expect(written(writeLink)).toContainEqual({
      provider_id: 'p1',
      platform: 'ubereats',
      platform_url: 'https://www.ubereats.com/de/store/tevhid/abc123',
      platform_slug: 'tevhid',
      is_active: true,
    });
    expect(writeLink).toHaveBeenCalledTimes(3);
    expect(summary.written).toBe(3);
  });

  it('2: ignores links the existing URL checks reject', async () => {
    const fetchPage = vi.fn<FetchPage>(async () => ({
      html: '<a href="http://wolt.com/de/deu/berlin/restaurant/x">x</a><a href="https://evil.example/wolt.com">y</a>',
      url: SITE,
    }));
    const { writeLink } = await run({ fetchPage });

    expect(writeLink).not.toHaveBeenCalled();
  });

  it('4: skips a platform the provider already has a link or candidate for', async () => {
    const { writeLink } = await run({ providers: [provider({ held: new Set(['wolt']) })] });

    expect(
      written(writeLink)
        .map((r) => r.platform)
        .sort(),
    ).toEqual(['lieferando', 'ubereats']);
  });

  it('4: a rerun after everything is held writes nothing and never fetches the site', async () => {
    const { writeLink, fetchPage, summary } = await run({
      providers: [provider({ held: new Set(['wolt', 'lieferando', 'ubereats']) })],
    });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(writeLink).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ processed: 0, written: 0, skipped: 1, warned: 0 });
  });

  it('1: reads the provider website and skips providers without a usable one', async () => {
    const { fetchPage, writeLink, summary } = await run({
      providers: [
        provider({ provider_id: 'p1' }),
        provider({ provider_id: 'p2', social_website: null }),
        provider({ provider_id: 'p3', social_website: '  ' }),
      ],
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(SITE);
    expect(written(writeLink).every((r) => r.provider_id === 'p1')).toBe(true);
    expect(summary).toMatchObject({ processed: 1, written: 3, skipped: 2, warned: 0 });
  });

  it('1: a page without delivery links writes nothing and is not a warning', async () => {
    const fetchPage = vi.fn<FetchPage>(async () => ({ html: '<html>no links</html>', url: SITE }));
    const { writeLink, summary } = await run({ fetchPage });

    expect(writeLink).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ processed: 1, written: 0, warned: 0 });
  });

  it('7: a fetch failure logs a WARN and does not fail the run', async () => {
    const fetchPage = vi
      .fn<FetchPage>()
      .mockRejectedValueOnce(new Error('unable to verify the first certificate'))
      .mockResolvedValueOnce({ html: PAGE_HTML, url: SITE });
    const { summary, logs, writeLink } = await run({
      providers: [provider({ provider_id: 'p1' }), provider({ provider_id: 'p2' })],
      fetchPage,
    });

    expect(logs.some((l) => l.startsWith('WARN') && l.includes('unable to verify'))).toBe(true);
    expect(summary.warned).toBe(1);
    expect(written(writeLink).every((r) => r.provider_id === 'p2')).toBe(true);
    expect(writeLink).toHaveBeenCalledTimes(3);
  });

  it('7: a write failure logs a WARN and does not fail the run', async () => {
    const store: LinkStore = {
      listProviders: async () => [provider()],
      writeLink: vi.fn().mockRejectedValue(new Error('insert failed')),
    };
    const logs: string[] = [];
    const summary = await runApplyLinks({
      store,
      fetchPage: async () => ({ html: PAGE_HTML, url: SITE }),
      log: (m) => logs.push(m),
      options: { apply: true, limit: 10 },
    });

    expect(logs.some((l) => l.startsWith('WARN') && l.includes('insert failed'))).toBe(true);
    expect(summary.warned).toBe(1);
  });

  it('8: dry run logs what it would write and writes nothing', async () => {
    const { writeLink, logs } = await run({ apply: false });

    expect(writeLink).not.toHaveBeenCalled();
    expect(logs.filter((l) => l.includes('WOULD WRITE')).length).toBe(3);
  });

  it('a store error while listing providers fails the run instead of writing blind', async () => {
    const store: LinkStore = {
      listProviders: vi.fn().mockRejectedValue(new Error('links down')),
      writeLink: vi.fn(),
    };

    await expect(
      runApplyLinks({
        store,
        fetchPage: vi.fn(),
        options: { apply: true },
      }),
    ).rejects.toThrow('links down');
  });
});

type Row = Record<string, unknown>;

// Chainable fake: providers come from a page queue, link/candidate rows are matched on provider_id.
function fakeClient(opts: { providerPages?: Row[][]; rows?: Record<string, Row[]> }) {
  const pages = [...(opts.providerPages ?? [])];
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const client = {
    from(table: string) {
      let providerId: unknown;
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) => {
          if (table === 'providers') return resolve({ data: pages.shift() ?? [], error: null });
          const rows = (opts.rows?.[table] ?? []).filter(
            (r) => providerId === undefined || r.provider_id === providerId,
          );
          return resolve({ data: rows, error: null });
        },
      };
      for (const method of ['select', 'eq', 'not', 'gt', 'order', 'limit', 'upsert']) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          if (method === 'eq' && args[0] === 'provider_id') providerId = args[1];
          return builder;
        };
      }
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const providerRow = (n: number) => ({
  provider_id: `p${String(n).padStart(4, '0')}`,
  provider_name: `Provider ${n}`,
  social_website: SITE,
});

describe('apply website delivery links store (#806)', () => {
  it('5: only loads approved providers that have a website', async () => {
    const { client, calls } = fakeClient({ providerPages: [[providerRow(1)]] });

    const list = await createSupabaseLinkStore(client).listProviders({ limit: 10 });

    expect(list.map((p) => p.provider_id)).toEqual(['p0001']);
    expect(calls).toContainEqual({
      table: 'providers',
      method: 'eq',
      args: ['review_status', 'approved'],
    });
    expect(calls).toContainEqual({
      table: 'providers',
      method: 'not',
      args: ['social_website', 'is', null],
    });
  });

  it('4: --limit counts providers still to do, so held providers never use up the limit', async () => {
    const firstPage = Array.from({ length: PAGE_SIZE }, (_, i) => providerRow(i));
    const heldRows = firstPage.slice(0, PAGE_SIZE - 1).flatMap((p) =>
      ['wolt', 'lieferando', 'ubereats'].map((platform) => ({
        provider_id: p.provider_id,
        platform,
      })),
    );
    const { client, calls } = fakeClient({
      providerPages: [firstPage, [providerRow(PAGE_SIZE), providerRow(PAGE_SIZE + 1)]],
      rows: { provider_delivery_links: heldRows },
    });

    const list = await createSupabaseLinkStore(client).listProviders({ limit: 2 });

    expect(list.map((p) => p.provider_id)).toEqual([
      providerRow(PAGE_SIZE - 1).provider_id,
      providerRow(PAGE_SIZE).provider_id,
    ]);
    const cursors = calls.filter((c) => c.method === 'gt').map((c) => c.args);
    expect(cursors).toEqual([['provider_id', providerRow(PAGE_SIZE - 1).provider_id]]);
    expect(calls.filter((c) => c.method === 'limit').map((c) => c.args[0])).toEqual([
      PAGE_SIZE,
      PAGE_SIZE,
    ]);
  });

  it('4: stops after a short page and returns what each provider already holds', async () => {
    const { client, calls } = fakeClient({
      providerPages: [[providerRow(1)]],
      rows: {
        provider_delivery_links: [{ provider_id: 'p0001', platform: 'wolt' }],
        enrichment_candidates: [
          { provider_id: 'p0001', source: 'provider_website:lieferando', proposed_value: null },
        ],
      },
    });

    const list = await createSupabaseLinkStore(client).listProviders({});

    expect(Array.from(list[0].held).sort()).toEqual(['lieferando', 'wolt']);
    expect(calls.filter((c) => c.table === 'providers' && c.method === 'limit')).toHaveLength(1);
  });

  it('1: a single provider id is looked up directly', async () => {
    const { client, calls } = fakeClient({ providerPages: [[providerRow(1)]] });

    await createSupabaseLinkStore(client).listProviders({ providerId: 'p0001' });

    expect(calls).toContainEqual({
      table: 'providers',
      method: 'eq',
      args: ['provider_id', 'p0001'],
    });
  });

  it('4: writes without overwriting an existing link row', async () => {
    const { client, calls } = fakeClient({});
    const row = {
      provider_id: 'p1',
      platform: 'wolt',
      platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
      platform_slug: 'tevhid',
      is_active: true,
    };

    await createSupabaseLinkStore(client).writeLink(row);

    expect(calls).toContainEqual({
      table: 'provider_delivery_links',
      method: 'upsert',
      args: [row, { onConflict: 'provider_id,platform', ignoreDuplicates: true }],
    });
  });
});
