import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseLinkStore,
  runApplyLinks,
  type LinkProvider,
  type LinkStore,
} from '../../../scripts/apply-website-delivery-links';

const SITE = 'https://tevhid.example/';
const PAGE_HTML = [
  'https://www.lieferando.de/speisekarte/tevhid',
  'https://wolt.com/de/deu/berlin/restaurant/tevhid',
  'https://www.instagram.com/tevhid',
]
  .map((h) => `<a href="${h}">x</a>`)
  .join('');

const provider = (over: Partial<LinkProvider> = {}): LinkProvider => ({
  provider_id: 'p1',
  provider_name: 'Bistro Salam',
  social_website: SITE,
  ...over,
});

type FetchPage = (url: string) => Promise<{ html: string; url: string }>;

interface Opts {
  providers?: LinkProvider[];
  held?: Record<string, string[]>;
  apply?: boolean;
  fetchPage?: FetchPage;
}

async function run(opts: Opts = {}) {
  const writeLink = vi.fn(async () => undefined);
  const store: LinkStore = {
    listProviders: vi.fn(async () => opts.providers ?? [provider()]),
    existingPlatforms: vi.fn(async (id: string) => new Set(opts.held?.[id] ?? [])),
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
    expect(writeLink).toHaveBeenCalledTimes(2);
    expect(summary.written).toBe(2);
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
    const { writeLink } = await run({ held: { p1: ['wolt'] } });

    expect(written(writeLink).map((r) => r.platform)).toEqual(['lieferando']);
  });

  it('4: a rerun after everything is held writes nothing and never fetches the site', async () => {
    const { writeLink, fetchPage, summary } = await run({
      held: { p1: ['wolt', 'lieferando', 'ubereats'] },
    });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(writeLink).not.toHaveBeenCalled();
    expect(summary.written).toBe(0);
  });

  it('4: skips providers without a website', async () => {
    const { fetchPage, writeLink } = await run({
      providers: [provider({ social_website: null })],
    });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(writeLink).not.toHaveBeenCalled();
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
    expect(writeLink).toHaveBeenCalledTimes(2);
  });

  it('7: a write failure logs a WARN and does not fail the run', async () => {
    const store: LinkStore = {
      listProviders: async () => [provider()],
      existingPlatforms: async () => new Set<string>(),
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
    expect(logs.filter((l) => l.includes('WOULD WRITE')).length).toBe(2);
  });
});

// Records every chained call and resolves with an empty result when awaited.
function recordingClient() {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const builder = (table: string): unknown => {
    const proxy: unknown = new Proxy(() => undefined, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: String(prop), args });
          return proxy;
        };
      },
    });
    return proxy;
  };
  const client = { from: (table: string) => builder(table) } as unknown as SupabaseClient;
  return { client, calls };
}

describe('apply website delivery links store (#806)', () => {
  it('5: only loads providers whose review_status is approved', async () => {
    const { client, calls } = recordingClient();

    await createSupabaseLinkStore(client).listProviders({ limit: 10 });

    expect(
      calls.some(
        (c) =>
          c.table === 'providers' &&
          c.method === 'eq' &&
          c.args[0] === 'review_status' &&
          c.args[1] === 'approved',
      ),
    ).toBe(true);
  });

  it('4: writes without overwriting an existing link row', async () => {
    const { client, calls } = recordingClient();

    await createSupabaseLinkStore(client).writeLink({
      provider_id: 'p1',
      platform: 'wolt',
      platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
      platform_slug: 'tevhid',
      is_active: true,
    });

    const write = calls.find((c) => c.table === 'provider_delivery_links');
    expect(write?.method).toBe('upsert');
    expect(write?.args[1]).toMatchObject({ ignoreDuplicates: true });
  });
});
