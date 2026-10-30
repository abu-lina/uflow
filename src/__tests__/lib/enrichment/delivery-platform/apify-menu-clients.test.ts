import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  UBEREATS_ACTOR_ID,
  buildUberEatsInput,
  fetchUberEatsMenu,
} from '@/lib/enrichment/delivery-platform/apify-ubereats-client';

const fetchMock = vi.fn();

function respondWith(items: unknown, init: { ok?: boolean; status?: number } = {}) {
  fetchMock.mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 201,
    json: async () => items,
    text: async () => JSON.stringify(items),
  });
}

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function stubFetch() {
  vi.stubGlobal('fetch', fetchMock);
}

describe('UberEats menu fetching uses an Apify actor', () => {
  it('runs memo23/uber-eats-scraper with one store URL', () => {
    expect(UBEREATS_ACTOR_ID).toBe('memo23~uber-eats-scraper');
    const input = buildUberEatsInput('https://www.ubereats.com/de/store/foo/abc');
    expect(input).toMatchObject({
      startUrls: [{ url: 'https://www.ubereats.com/de/store/foo/abc' }],
      maxItems: 1,
    });
  });

  it('maps menuItems of the store row', async () => {
    stubFetch();
    respondWith([
      {
        title: 'Doner House',
        menuItems: [
          { name: 'Doner Teller', description: 'mit Salat', section: 'Teller', price: 9.5 },
          { name: 'Ayran', description: '', section: 'Getraenke', price: 2 },
        ],
      },
    ]);

    const items = await fetchUberEatsMenu('https://www.ubereats.com/de/store/foo/abc', 'tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/acts/${UBEREATS_ACTOR_ID}/run-sync-get-dataset-items`);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(items).toEqual([
      {
        name_de: 'Doner Teller',
        description_de: 'mit Salat',
        category: 'Teller',
        price_cents: 950,
        is_available: true,
        sort_order: 0,
      },
      {
        name_de: 'Ayran',
        description_de: null,
        category: 'Getraenke',
        price_cents: 200,
        is_available: true,
        sort_order: 1,
      },
    ]);
  });

  it('returns an empty list when the store row has no menu items', async () => {
    stubFetch();
    respondWith([{ title: 'Empty', menuItems: [] }]);
    await expect(
      fetchUberEatsMenu('https://www.ubereats.com/de/store/foo/abc', 'tok'),
    ).resolves.toEqual([]);
  });

  it('throws on an HTTP error', async () => {
    stubFetch();
    respondWith('nope', { ok: false, status: 403 });
    await expect(
      fetchUberEatsMenu('https://www.ubereats.com/de/store/foo/abc', 'tok'),
    ).rejects.toThrow(/HTTP 403/);
  });
});
