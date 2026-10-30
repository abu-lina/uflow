import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LIEFERANDO_ACTOR_ID,
  buildLieferandoInput,
  fetchLieferandoMenu,
} from '@/lib/enrichment/delivery-platform/apify-lieferando-client';
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

describe('Lieferando menu fetching uses an Apify actor', () => {
  it('runs kamerozkan/german-delivery-menu-price-intelligence for one restaurant URL only', () => {
    expect(LIEFERANDO_ACTOR_ID).toBe('kamerozkan~german-delivery-menu-price-intelligence');
    const input = buildLieferandoInput('https://www.lieferando.de/en/menu/sushi-yana-moabit');
    expect(input).toMatchObject({
      postalCodes: [],
      restaurantUrls: ['https://www.lieferando.de/en/menu/sushi-yana-moabit'],
      includeMenus: true,
    });
  });

  it('posts to the Apify sync endpoint with a bearer token and maps menu_item rows', async () => {
    stubFetch();
    respondWith([
      { recordType: 'restaurant', restaurantName: 'Sushi Yana' },
      {
        recordType: 'menu_item',
        category: 'Starters',
        productName: 'Vegetarian Spring Rolls - 6 pieces',
        description: 'Served with sweet and sour sauce',
        price: 3.7,
        isAvailable: true,
      },
      {
        recordType: 'menu_item',
        category: 'Drinks',
        productName: 'Sake',
        description: null,
        price: null,
        isAvailable: false,
      },
      { recordType: 'postcode_price_matrix', productName: 'ignored' },
    ]);

    const items = await fetchLieferandoMenu('https://www.lieferando.de/en/menu/x', 'tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/acts/${LIEFERANDO_ACTOR_ID}/run-sync-get-dataset-items`);
    expect(url).not.toContain('tok');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(items).toEqual([
      {
        name_de: 'Vegetarian Spring Rolls - 6 pieces',
        description_de: 'Served with sweet and sour sauce',
        category: 'Starters',
        price_cents: 370,
        is_available: true,
        sort_order: 0,
      },
      {
        name_de: 'Sake',
        description_de: null,
        category: 'Drinks',
        price_cents: null,
        is_available: false,
        sort_order: 1,
      },
    ]);
  });

  it('returns an empty list when the actor returns no menu rows', async () => {
    stubFetch();
    respondWith([]);
    await expect(
      fetchLieferandoMenu('https://www.lieferando.de/en/menu/x', 'tok'),
    ).resolves.toEqual([]);
  });

  it('throws on an HTTP error so a failed call is not mistaken for an empty menu', async () => {
    stubFetch();
    respondWith('boom', { ok: false, status: 500 });
    await expect(fetchLieferandoMenu('https://www.lieferando.de/en/menu/x', 'tok')).rejects.toThrow(
      /HTTP 500/,
    );
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
