import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createPlatformSearchers,
  DEFAULT_NO_MATCH_RETRY_DAYS,
  createSupabaseSearchStore,
  runPlatformSearch,
  type PlatformSearcher,
  type SearchOutcome,
  type SearchProviderRow,
  type SearchStore,
  type SearchVenueResult,
} from '../../../scripts/search-platform-delivery-links';

const provider = (over: Partial<SearchProviderRow> = {}): SearchProviderRow => ({
  provider_id: 'p1',
  provider_name: 'Bistro Salam',
  street: 'Hauptstraße 12',
  zip: '10115',
  city: 'Berlin',
  held: new Set<string>(),
  searched: new Set<string>(),
  ...over,
});

const woltVenue = (over: Partial<SearchVenueResult> = {}): SearchVenueResult => ({
  name: 'Bistro Salam',
  address: 'Hauptstraße 12, 10115 Berlin',
  city: 'Berlin',
  platform_url: 'https://wolt.com/de/deu/berlin/restaurant/bistro-salam',
  platform_slug: 'bistro-salam',
  ...over,
});

const lieferandoVenue = (over: Partial<SearchVenueResult> = {}): SearchVenueResult => ({
  ...woltVenue(),
  platform_url: 'https://www.lieferando.de/speisekarte/bistro-salam',
  platform_slug: 'bistro-salam',
  ...over,
});

interface Harness {
  providers: SearchProviderRow[];
  searchers: Partial<Record<'wolt' | 'lieferando' | 'ubereats', PlatformSearcher>>;
  apply?: boolean;
  sleep?: (ms: number) => Promise<void>;
}

function makeStore(providers: SearchProviderRow[]) {
  const writeLink = vi.fn(async () => undefined);
  const stageCandidate = vi.fn(async () => undefined);
  const recordSearch = vi.fn(
    async (r: { provider_id: string; platform: string; outcome: SearchOutcome }) => {
      const p = providers.find((x) => x.provider_id === r.provider_id);
      p?.searched.add(r.platform);
    },
  );
  const store: SearchStore = {
    listProviders: vi.fn(async () => providers.filter((p) => p.searched.size < 3)),
    writeLink,
    stageCandidate,
    recordSearch,
  };
  return { store, writeLink, stageCandidate, recordSearch };
}

async function run(h: Harness) {
  const fakes = makeStore(h.providers);
  const logs: string[] = [];
  const summary = await runPlatformSearch({
    store: fakes.store,
    searchers: h.searchers,
    sleep: h.sleep ?? (async () => undefined),
    log: (m) => logs.push(m),
    options: { apply: h.apply ?? true, delayMs: 1000 },
  });
  return { ...fakes, summary, logs };
}

const only = (platform: 'wolt' | 'lieferando' | 'ubereats', s: PlatformSearcher) => ({
  [platform]: s,
});

describe('platform delivery search (#807)', () => {
  it('1: searches only platforms where the provider has no link yet, by name and address', async () => {
    const wolt = vi.fn(async () => []);
    const lieferando = vi.fn(async () => []);
    await run({
      providers: [provider({ held: new Set(['lieferando']) })],
      searchers: { wolt, lieferando },
    });

    expect(wolt).toHaveBeenCalledTimes(1);
    expect(wolt).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_name: 'Bistro Salam',
        street: 'Hauptstraße 12',
        zip: '10115',
        city: 'Berlin',
      }),
    );
    expect(lieferando).not.toHaveBeenCalled();
  });

  it('3: writes a matching link directly and records the search as accepted', async () => {
    const { writeLink, stageCandidate, recordSearch } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => [woltVenue()]),
    });

    expect(writeLink).toHaveBeenCalledWith({
      provider_id: 'p1',
      platform: 'wolt',
      platform_url: 'https://wolt.com/de/deu/berlin/restaurant/bistro-salam',
      platform_slug: 'bistro-salam',
      is_active: true,
    });
    expect(stageCandidate).not.toHaveBeenCalled();
    expect(recordSearch).toHaveBeenCalledWith({
      provider_id: 'p1',
      platform: 'wolt',
      outcome: 'accepted',
    });
  });

  it('3: stages an ambiguous match as a pending candidate instead of writing it', async () => {
    const { writeLink, stageCandidate, recordSearch } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => [woltVenue({ address: undefined })]),
    });

    expect(writeLink).not.toHaveBeenCalled();
    expect(stageCandidate).toHaveBeenCalledTimes(1);
    const staged = (stageCandidate.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(staged).toMatchObject({
      provider_id: 'p1',
      source: 'platform_search:wolt',
      field_name: 'delivery_links',
      status: 'pending',
      proposed_value: [
        expect.objectContaining({
          platform: 'wolt',
          platform_url: 'https://wolt.com/de/deu/berlin/restaurant/bistro-salam',
        }),
      ],
    });
    expect(recordSearch).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'staged' }));
  });

  it('3: stages instead of writing when two venues match', async () => {
    const { writeLink, stageCandidate } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => [
        woltVenue(),
        woltVenue({
          platform_url: 'https://wolt.com/de/deu/berlin/restaurant/bistro-salam-2',
          platform_slug: 'bistro-salam-2',
        }),
      ]),
    });
    expect(writeLink).not.toHaveBeenCalled();
    expect(stageCandidate).toHaveBeenCalledTimes(1);
  });

  it('2: writes nothing for a wrong-city or near-miss result and records no_match', async () => {
    const { writeLink, stageCandidate, recordSearch } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => [
        woltVenue({ city: 'Hamburg' }),
        woltVenue({ address: 'Nebenweg 3, 10999 Berlin' }),
      ]),
    });
    expect(writeLink).not.toHaveBeenCalled();
    expect(stageCandidate).not.toHaveBeenCalled();
    expect(recordSearch).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'no_match' }));
  });

  it('2: ignores a matching venue whose URL fails the platform URL checks', async () => {
    const { writeLink, stageCandidate } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => [
        woltVenue({ platform_url: 'https://evil.example/restaurant/bistro-salam' }),
      ]),
    });
    expect(writeLink).not.toHaveBeenCalled();
    expect(stageCandidate).not.toHaveBeenCalled();
  });

  it('4: does not search a platform that was already searched', async () => {
    const wolt = vi.fn(async () => []);
    await run({
      providers: [provider({ searched: new Set(['wolt']) })],
      searchers: { wolt },
    });
    expect(wolt).not.toHaveBeenCalled();
  });

  it('4: does not search a platform that has a pending or rejected delivery candidate', async () => {
    const wolt = vi.fn(async () => []);
    await run({ providers: [provider({ held: new Set(['wolt']) })], searchers: { wolt } });
    expect(wolt).not.toHaveBeenCalled();
  });

  it('4: a rerun does not search again, whatever the first outcome was', async () => {
    const providers = [provider()];
    const wolt = vi.fn(async () => [] as SearchVenueResult[]);
    const lieferando = vi.fn(async () => [lieferandoVenue()]);
    const searchers = { wolt, lieferando };

    await run({ providers, searchers });
    await run({ providers, searchers });

    expect(wolt).toHaveBeenCalledTimes(1);
    expect(lieferando).toHaveBeenCalledTimes(1);
  });

  it('4: a platform whose search failed is searched again on the next run', async () => {
    const providers = [provider()];
    const wolt = vi
      .fn<PlatformSearcher>()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce([woltVenue()]);

    const first = await run({ providers, searchers: { wolt } });
    expect(first.writeLink).not.toHaveBeenCalled();
    expect(first.recordSearch).not.toHaveBeenCalled();

    const second = await run({ providers, searchers: { wolt } });
    expect(wolt).toHaveBeenCalledTimes(2);
    expect(second.writeLink).toHaveBeenCalledWith(expect.objectContaining({ platform: 'wolt' }));
  });

  it('4: records no_match for an empty result so the platform is not searched again', async () => {
    const providers = [provider()];
    const wolt = vi.fn(async () => [] as SearchVenueResult[]);
    const { recordSearch } = await run({ providers, searchers: { wolt } });
    expect(recordSearch).toHaveBeenCalledWith({
      provider_id: 'p1',
      platform: 'wolt',
      outcome: 'no_match',
    });
    await run({ providers, searchers: { wolt } });
    expect(wolt).toHaveBeenCalledTimes(1);
  });

  it('5: a failing store write logs a WARN, is not recorded and does not stop the run', async () => {
    const fakes = makeStore([provider()]);
    fakes.writeLink.mockRejectedValueOnce(new Error('permission denied'));
    const logs: string[] = [];
    const summary = await runPlatformSearch({
      store: fakes.store,
      searchers: {
        wolt: async () => [woltVenue()],
        lieferando: async () => [lieferandoVenue()],
      },
      sleep: async () => undefined,
      log: (m) => logs.push(m),
      options: { apply: true, delayMs: 1000 },
    });

    expect(logs.some((l) => l.startsWith('WARN') && l.includes('permission denied'))).toBe(true);
    expect(fakes.recordSearch).not.toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'wolt' }),
    );
    expect(fakes.recordSearch).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'lieferando', outcome: 'accepted' }),
    );
    expect(summary.warned).toBe(1);
  });

  it('5: truncates long error messages in the WARN log', async () => {
    const { logs } = await run({
      providers: [provider()],
      searchers: {
        wolt: async () => {
          throw new Error('x'.repeat(5000));
        },
      },
    });
    expect(logs.find((l) => l.startsWith('WARN'))?.length).toBeLessThan(500);
  });

  it('2: ignores a matching venue whose URL carries a query, fragment or mismatched slug', async () => {
    const { writeLink, stageCandidate } = await run({
      providers: [provider()],
      searchers: {
        wolt: async () => [
          woltVenue({
            platform_url: 'https://wolt.com/de/deu/berlin/venue/bistro-salam?utm_source=x',
          }),
        ],
        lieferando: async () => [lieferandoVenue({ platform_slug: 'another-slug' })],
      },
    });
    expect(writeLink).not.toHaveBeenCalled();
    expect(stageCandidate).not.toHaveBeenCalled();
  });

  it('5: a search failure logs a WARN, is not recorded and does not stop the run', async () => {
    const wolt = vi.fn(async () => {
      throw new Error('429 Too Many Requests');
    });
    const lieferando = vi.fn(async () => [lieferandoVenue()]);
    const { recordSearch, writeLink, summary, logs } = await run({
      providers: [provider()],
      searchers: { wolt, lieferando },
    });

    expect(logs.some((l) => l.startsWith('WARN') && l.includes('429 Too Many Requests'))).toBe(
      true,
    );
    expect(recordSearch).not.toHaveBeenCalledWith(expect.objectContaining({ platform: 'wolt' }));
    expect(writeLink).toHaveBeenCalledWith(expect.objectContaining({ platform: 'lieferando' }));
    expect(summary.warned).toBe(1);
  });

  it('5: waits between platform requests (rate limit)', async () => {
    const sleep = vi.fn(async () => undefined);
    await run({
      providers: [provider(), provider({ provider_id: 'p2' })],
      searchers: { wolt: async () => [], lieferando: async () => [] },
      sleep,
    });
    // 4 requests, so 3 waits of the configured delay
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it('7: dry run logs what it would write and writes and records nothing', async () => {
    const { writeLink, stageCandidate, recordSearch, logs, summary } = await run({
      providers: [provider(), provider({ provider_id: 'p2' })],
      searchers: only('wolt', async (p) =>
        p.provider_id === 'p1' ? [woltVenue()] : [woltVenue({ address: undefined })],
      ),
      apply: false,
    });

    expect(writeLink).not.toHaveBeenCalled();
    expect(stageCandidate).not.toHaveBeenCalled();
    expect(recordSearch).not.toHaveBeenCalled();
    expect(logs).toContain(
      '  WOULD WRITE p1 Bistro Salam: wolt https://wolt.com/de/deu/berlin/restaurant/bistro-salam',
    );
    expect(logs).toContain(
      '  WOULD STAGE p2 Bistro Salam: wolt https://wolt.com/de/deu/berlin/restaurant/bistro-salam',
    );
    expect(summary.written).toBe(0);
  });

  it('diagnostics: a no-match line says when the platform returned no venues', async () => {
    const { logs } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => []),
    });

    expect(logs).toContain('  RECORD p1 Bistro Salam: wolt no match (0 venues, 0 valid links)');
  });

  it.each(['lieferando', 'ubereats'] as const)(
    'empty scrape: %s returning no venues warns and is not recorded, so it retries',
    async (platform) => {
      const { recordSearch, summary, logs } = await run({
        providers: [provider()],
        searchers: only(platform, async () => []),
      });

      expect(recordSearch).not.toHaveBeenCalled();
      expect(summary.noMatch).toBe(0);
      expect(summary.searched).toBe(0);
      expect(summary.warned).toBe(1);
      expect(logs).toContain(
        `WARN p1 Bistro Salam: ${platform} returned no venues, not recorded (blocked or empty page)`,
      );
    },
  );

  it('empty scrape: a non-empty list with no match is still recorded for lieferando', async () => {
    const { recordSearch } = await run({
      providers: [provider()],
      searchers: only('lieferando', async () => [
        lieferandoVenue({ name: 'Pizza Roma', platform_slug: 'bistro-salam' }),
      ]),
    });

    expect(recordSearch).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'no_match' }));
  });

  it('diagnostics: a no-match line shows venue count, valid links and the closest name', async () => {
    const { logs } = await run({
      providers: [provider()],
      searchers: only('wolt', async () => [
        woltVenue({ name: 'Pizza Roma', address: 'Hauptstraße 12, 10115 Berlin' }),
        woltVenue({
          name: 'Bistro Salam',
          platform_url: 'https://evil.example/venue/bistro-salam',
        }),
      ]),
    });

    expect(logs).toContain(
      '  RECORD p1 Bistro Salam: wolt no match (2 venues, 1 valid links, closest "Bistro Salam")',
    );
  });
});

type Row = Record<string, unknown>;

/** Minimal chainable stand-in for the Supabase query builder used by the store. */
function fakeSupabase(tables: Record<string, Row[]>, failTable?: string) {
  const upserts: Array<{ table: string; row: Row; options: unknown }> = [];
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    const q: Record<string, unknown> = {};
    const chain = (fn: () => void) => () => {
      fn();
      return q;
    };
    q.select = chain(() => undefined);
    q.eq = (col: string, val: unknown) => {
      rows = rows.filter((r) => r[col] === val);
      return q;
    };
    q.not = (col: string) => {
      rows = rows.filter((r) => r[col] !== null && r[col] !== undefined);
      return q;
    };
    q.gt = (col: string, val: string) => {
      rows = rows.filter((r) => String(r[col]) > val);
      return q;
    };
    q.like = () => q;
    q.order = () => q;
    q.limit = (n: number) => {
      rows = rows.slice(0, n);
      return q;
    };
    q.upsert = async (row: Row, options: unknown) => {
      upserts.push({ table, row, options });
      return { error: failTable === table ? { message: 'boom' } : null };
    };
    q.then = (resolve: (v: unknown) => unknown) =>
      resolve(
        failTable === table
          ? { data: null, error: { message: 'boom' } }
          : { data: rows, error: null },
      );
    return q;
  };
  return { client: { from } as unknown as SupabaseClient, upserts };
}

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const providerRow = (id: string) => ({
  provider_id: id,
  provider_name: 'Bistro Salam',
  address_street: 'Hauptstraße 12',
  address_zip: '10115',
  address_city: 'Berlin',
  location_latitude: '52.5',
  location_longitude: '13.4',
  review_status: 'approved',
  listing_type: 'food',
});

describe('search store (#807)', () => {
  const PLATFORMS = ['wolt', 'lieferando', 'ubereats'] as const;

  it('only loads food providers, not stores or other listing types', async () => {
    const { client } = fakeSupabase({
      providers: [
        providerRow('p1'),
        { ...providerRow('p2'), listing_type: 'store' },
        { ...providerRow('p3'), listing_type: 'ummah' },
      ],
      provider_delivery_links: [],
      enrichment_candidates: [],
      provider_platform_searches: [],
    });
    const rows = await createSupabaseSearchStore(client).listProviders({
      platforms: [...PLATFORMS],
    });

    expect(rows.map((r) => r.provider_id)).toEqual(['p1']);
  });

  it('4: loads approved providers with held and searched platforms and skips finished ones', async () => {
    const { client } = fakeSupabase({
      providers: [providerRow('p1'), providerRow('p2')],
      provider_delivery_links: [{ provider_id: 'p1', platform: 'wolt' }],
      enrichment_candidates: [],
      provider_platform_searches: [
        { provider_id: 'p1', platform: 'lieferando', outcome: 'no_match', searched_at: daysAgo(1) },
        ...PLATFORMS.map((platform) => ({
          provider_id: 'p2',
          platform,
          outcome: 'accepted',
          searched_at: daysAgo(1),
        })),
      ],
    });
    const rows = await createSupabaseSearchStore(client).listProviders({
      platforms: [...PLATFORMS],
    });

    expect(rows.map((r) => r.provider_id)).toEqual(['p1']);
    expect(Array.from(rows[0].held)).toEqual(['wolt']);
    expect(Array.from(rows[0].searched)).toEqual(['lieferando']);
    expect(rows[0]).toMatchObject({ street: 'Hauptstraße 12', zip: '10115', latitude: 52.5 });
  });

  it('4: searches a no_match platform again after the default 30 days, never an accepted one', async () => {
    const tables = {
      providers: [providerRow('p1')],
      provider_delivery_links: [],
      enrichment_candidates: [],
      provider_platform_searches: [
        { provider_id: 'p1', platform: 'wolt', outcome: 'no_match', searched_at: daysAgo(31) },
        {
          provider_id: 'p1',
          platform: 'lieferando',
          outcome: 'no_match',
          searched_at: daysAgo(10),
        },
        { provider_id: 'p1', platform: 'ubereats', outcome: 'accepted', searched_at: daysAgo(400) },
      ],
    };
    const { client } = fakeSupabase(tables);
    const store = createSupabaseSearchStore(client);
    const platforms = [...PLATFORMS];

    expect(DEFAULT_NO_MATCH_RETRY_DAYS).toBe(30);
    const byDefault = await store.listProviders({ platforms });
    expect(Array.from(byDefault[0].searched).sort()).toEqual(['lieferando', 'ubereats']);

    const wider = await store.listProviders({ platforms, retryNoMatchAfterDays: 90 });
    // every platform counts as done again, so nothing is left to search
    expect(wider).toEqual([]);
  });

  it('5: throws when a store query fails', async () => {
    const { client } = fakeSupabase({ providers: [providerRow('p1')] }, 'providers');
    await expect(
      createSupabaseSearchStore(client).listProviders({ platforms: ['wolt'] }),
    ).rejects.toThrow(/Failed to load providers: boom/);
  });

  it('4: recordSearch refreshes searched_at when a platform is searched again', async () => {
    const { client, upserts } = fakeSupabase({});
    await createSupabaseSearchStore(client).recordSearch({
      provider_id: 'p1',
      platform: 'wolt',
      outcome: 'no_match',
    });
    expect(upserts[0].table).toBe('provider_platform_searches');
    expect(upserts[0].options).toEqual({ onConflict: 'provider_id,platform' });
    expect(upserts[0].row).toMatchObject({ provider_id: 'p1', platform: 'wolt' });
    expect(typeof upserts[0].row.searched_at).toBe('string');
  });

  it('5: recordSearch throws when the write fails', async () => {
    const { client } = fakeSupabase({}, 'provider_platform_searches');
    await expect(
      createSupabaseSearchStore(client).recordSearch({
        provider_id: 'p1',
        platform: 'wolt',
        outcome: 'no_match',
      }),
    ).rejects.toThrow(/Failed to record search/);
  });
});

describe('platform searchers (#807)', () => {
  const geocoder = { geocode: vi.fn(async () => ({ lat: 1, lon: 2 })) };
  const woltClient = {
    searchVenuesByLocation: vi.fn(async () => ({
      lat: 0,
      lon: 0,
      venues: [
        { name: 'Bistro Salam', slug: 'bistro-salam', address: 'Hauptstraße 12', city: 'Berlin' },
        { name: 'Evil', slug: '../x?y=1', address: 'Hauptstraße 12', city: 'Köln' },
      ],
    })),
  };
  const lieferandoClient = {
    searchRestaurants: vi.fn(async () => [
      {
        name: 'Bistro Salam',
        slug: 'bistro-salam',
        city: 'Berlin',
        address: 'Hauptstraße 12',
        isActive: true,
      },
    ]),
  };
  const ubereatsClient = {
    searchRestaurants: vi.fn(async () => [
      {
        name: 'Bistro Salam',
        slug: 'bistro-salam',
        rating: null,
        estimatedDeliveryMinutes: null,
        isActive: true,
      },
    ]),
  };
  const searchers = createPlatformSearchers({
    wolt: woltClient,
    lieferando: lieferandoClient,
    ubereats: ubereatsClient,
    geocoder,
  } as unknown as Parameters<typeof createPlatformSearchers>[0]);

  it('1: wolt searches around the provider coordinates and builds slugified, encoded URLs', async () => {
    const venues = await searchers.wolt(provider({ latitude: 52.5, longitude: 13.4 }));
    expect(woltClient.searchVenuesByLocation).toHaveBeenCalledWith(52.5, 13.4);
    expect(venues[0]).toMatchObject({
      name: 'Bistro Salam',
      address: 'Hauptstraße 12',
      platform_url: 'https://wolt.com/de/deu/berlin/venue/bistro-salam',
      platform_slug: 'bistro-salam',
    });
    expect(venues[1].platform_url).toBe('https://wolt.com/de/deu/koeln/venue/..%2Fx%3Fy%3D1');
  });

  it('1: wolt falls back to the city geocoder and fails when there are no coordinates', async () => {
    await searchers.wolt(provider());
    expect(geocoder.geocode).toHaveBeenCalledWith('Berlin');
    geocoder.geocode.mockResolvedValueOnce(null as never);
    await expect(searchers.wolt(provider())).rejects.toThrow(/no coordinates/);
  });

  it('1: lieferando searches the provider city and builds the speisekarte URL', async () => {
    const [venue] = await searchers.lieferando(provider());
    expect(lieferandoClient.searchRestaurants).toHaveBeenCalledWith('Berlin');
    expect(venue.platform_url).toBe('https://www.lieferando.de/speisekarte/bistro-salam');
  });

  it('2: ubereats results have no address, so an exact name match is staged, never written', async () => {
    const fakes = makeStore([provider({ latitude: 52.5, longitude: 13.4 })]);
    await runPlatformSearch({
      store: fakes.store,
      searchers: { ubereats: searchers.ubereats },
      sleep: async () => undefined,
      options: { apply: true, delayMs: 1000 },
    });
    expect(fakes.writeLink).not.toHaveBeenCalled();
    expect(fakes.stageCandidate).toHaveBeenCalledTimes(1);
    expect(fakes.recordSearch).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'staged' }));
  });
});
