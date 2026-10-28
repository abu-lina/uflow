import { describe, expect, it, vi } from 'vitest';

import {
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
    const lieferando = vi.fn(async () => [woltVenue()]);
    const searchers = { wolt, lieferando };

    await run({ providers, searchers });
    await run({ providers, searchers });

    expect(wolt).toHaveBeenCalledTimes(1);
    expect(lieferando).toHaveBeenCalledTimes(1);
  });

  it('5: a search failure logs a WARN, is not recorded and does not stop the run', async () => {
    const wolt = vi.fn(async () => {
      throw new Error('429 Too Many Requests');
    });
    const lieferando = vi.fn(async () => [
      woltVenue({
        platform_url: 'https://www.lieferando.de/speisekarte/bistro-salam',
        platform_slug: 'bistro-salam',
      }),
    ]);
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
    expect(logs.some((l) => l.includes('WOULD WRITE') && l.includes('bistro-salam'))).toBe(true);
    expect(logs.some((l) => l.includes('WOULD STAGE'))).toBe(true);
    expect(summary.written).toBe(0);
  });
});
