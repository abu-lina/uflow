import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LIEFERANDO_ACTOR_ID,
  buildLieferandoInput,
  fetchLieferandoMenu,
  toLieferandoMenuUrl,
} from '@/lib/enrichment/delivery-platform/apify-lieferando-client';
import { LIEFERANDO_PAGE_FUNCTION } from '@/lib/enrichment/delivery-platform/apify-lieferando-page-function';
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

describe('Lieferando menu fetching uses apify/web-scraper with a custom page function', () => {
  const SLUG_URL = 'https://www.lieferando.de/speisekarte/doner-house';

  it('builds a single-URL web-scraper input with a German residential proxy and no crawling', () => {
    expect(LIEFERANDO_ACTOR_ID).toBe('apify~web-scraper');
    const input = buildLieferandoInput(SLUG_URL);
    expect(input).toMatchObject({
      startUrls: [{ url: SLUG_URL }],
      pageFunction: LIEFERANDO_PAGE_FUNCTION,
      linkSelector: '',
      maxPagesPerCrawl: 1,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'DE',
      },
    });
    expect(input).not.toHaveProperty('postalCodes');
    expect(input).not.toHaveProperty('restaurantUrls');
  });

  it('normalises any Lieferando menu URL to its /speisekarte/<slug> form', () => {
    expect(toLieferandoMenuUrl('https://www.lieferando.de/en/menu/doner-house?c_id=1')).toBe(
      SLUG_URL,
    );
    expect(toLieferandoMenuUrl(`${SLUG_URL}/`)).toBe(SLUG_URL);
    expect(() => toLieferandoMenuUrl('https://www.lieferando.de/lieferservice/berlin')).toThrow(
      /Lieferando restaurant URL/,
    );
  });

  it('posts to the Apify sync endpoint with a bearer token and flattens menuCategories', async () => {
    stubFetch();
    respondWith([
      {
        url: SLUG_URL,
        menuCategories: [
          {
            name: 'Starters',
            items: [
              { name: 'Spring Rolls', description: 'Sweet chili', priceCents: 370 },
              { name: 'Soup', description: null, priceCents: null },
              { name: 'Free Bread', description: null, priceCents: 0 },
            ],
          },
          { name: 'Drinks', items: [{ name: 'Beer', description: null, priceCents: 350 }] },
        ],
      },
    ]);

    const items = await fetchLieferandoMenu(SLUG_URL, 'tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/acts/${LIEFERANDO_ACTOR_ID}/run-sync-get-dataset-items`);
    expect(url).not.toContain('tok');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body).startUrls).toEqual([{ url: SLUG_URL }]);
    expect(items).toEqual([
      {
        name_de: 'Spring Rolls',
        description_de: 'Sweet chili',
        category: 'Starters',
        price_cents: 370,
        is_available: true,
        sort_order: 0,
      },
      {
        name_de: 'Soup',
        description_de: null,
        category: 'Starters',
        price_cents: null,
        is_available: true,
        sort_order: 1,
      },
      {
        name_de: 'Free Bread',
        description_de: null,
        category: 'Starters',
        price_cents: 0,
        is_available: true,
        sort_order: 2,
      },
      {
        name_de: 'Beer',
        description_de: null,
        category: 'Drinks',
        price_cents: 350,
        is_available: true,
        sort_order: 3,
      },
    ]);
  });

  it('returns an empty list when the page has no menu categories', async () => {
    stubFetch();
    respondWith([{ url: SLUG_URL, menuCategories: [] }]);
    await expect(fetchLieferandoMenu(SLUG_URL, 'tok')).resolves.toEqual([]);
  });

  it('throws on an HTTP error so a failed call is not mistaken for an empty menu', async () => {
    stubFetch();
    respondWith('boom', { ok: false, status: 500 });
    await expect(fetchLieferandoMenu(SLUG_URL, 'tok')).rejects.toThrow(/HTTP 500/);
  });
});

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
