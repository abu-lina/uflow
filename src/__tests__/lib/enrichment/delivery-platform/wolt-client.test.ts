import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createWoltClient, type WoltClient } from '@/lib/enrichment/delivery-platform/wolt-client';
import { StaticCityGeocoder } from '@/lib/enrichment/delivery-platform/geocoder';

const mockGeocoder = new StaticCityGeocoder();

describe('createWoltClient', () => {
  it('throws without geocoder', () => {
    expect(() => createWoltClient({})).toThrow('Geocoder is required');
  });

  it('creates a client with default config', () => {
    const client = createWoltClient(undefined, mockGeocoder);
    expect(client).toBeDefined();
    expect(typeof client.searchVenuesByLocation).toBe('function');
  });
});

describe('WoltClient', () => {
  let client: WoltClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    client = createWoltClient(
      { requestDelayMs: 0, maxRetries: 0 },
      mockGeocoder
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchVenuesByLocation', () => {
    it('constructs correct URL with lat/lon', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ sections: [] }), { status: 200 })
      );
      await client.searchVenuesByLocation(52.52, 13.405);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://consumer-api.wolt.com/v1/pages/restaurants?lat=52.52&lon=13.405',
        expect.objectContaining({
          headers: { 'User-Agent': expect.any(String) },
        })
      );
    });

    it('returns venues from sections', async () => {
      const responsePayload = {
        sections: [
          {
            items: [
              {
                type: 'restaurant',
                venue: { slug: 'test-venue', name: 'Test Venue', city: 'Berlin' },
              },
            ],
          },
        ],
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(responsePayload), { status: 200 })
      );
      const result = await client.searchVenuesByLocation(52.52, 13.405);
      expect(result.venues).toHaveLength(1);
      expect(result.venues[0].slug).toBe('test-venue');
    });

    it('returns empty venues for empty response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ sections: [] }), { status: 200 })
      );
      const result = await client.searchVenuesByLocation(52.52, 13.405);
      expect(result.venues).toHaveLength(0);
    });

    it('returns empty venues when no sections key', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );
      const result = await client.searchVenuesByLocation(52.52, 13.405);
      expect(result.venues).toHaveLength(0);
    });
  });

  describe('fetchMenuData', () => {
    it('constructs correct URL with venue slug', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ categories: [] }), { status: 200 })
      );
      await client.fetchMenuData('test-venue');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://restaurant-api.wolt.com/v4/venues/slug/test-venue/menu/data?unit_prices=true&show_weighted_items=true&show_subcategories=true',
        expect.any(Object)
      );
    });

    it('parses menu categories and items', async () => {
      const responsePayload = {
        categories: [
          {
            name: 'Pizza',
            items: [{ name: 'Margherita' }, { name: 'Salami' }],
          },
          {
            name: 'Getränke',
            items: [{ name: 'Cola', description: '0.5L' }],
          },
        ],
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(responsePayload), { status: 200 })
      );
      const result = await client.fetchMenuData('test-venue');
      expect(result.items).toHaveLength(3);
      expect(result.categories).toHaveLength(2);
      expect(result.items[0].name).toBe('Margherita');
      expect(result.items[0].category).toBe('Pizza');
    });

    it('handles empty menu', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ categories: [] }), { status: 200 })
      );
      const result = await client.fetchMenuData('test-venue');
      expect(result.items).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('throws on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Not Found', { status: 404 })
      );
      await expect(client.searchVenuesByLocation(52.52, 13.405)).rejects.toThrow(
        'Wolt API 404'
      );
    });

    it('retries on 429 with backoff', async () => {
      const clientWithRetry = createWoltClient(
        { requestDelayMs: 0, maxRetries: 2 },
        mockGeocoder
      );
      fetchMock
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ sections: [] }), { status: 200 }));

      const result = await clientWithRetry.searchVenuesByLocation(52.52, 13.405);
      expect(result.venues).toHaveLength(0);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting retries on 429', async () => {
      const clientWithRetry = createWoltClient(
        { requestDelayMs: 0, maxRetries: 1 },
        mockGeocoder
      );
      fetchMock.mockResolvedValue(new Response('Too Many Requests', { status: 429 }));

      await expect(clientWithRetry.searchVenuesByLocation(52.52, 13.405)).rejects.toThrow(
        'Wolt API error: HTTP 429 after 1 retries'
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('handles network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));
      await expect(client.searchVenuesByLocation(52.52, 13.405)).rejects.toThrow(
        'Network failure'
      );
    });
  });

  describe('geocodeCity', () => {
    it('geocodes known city', async () => {
      const coords = await client.geocodeCity('Berlin');
      expect(coords).not.toBeNull();
      expect(coords!.lat).toBeCloseTo(52.52, 1);
    });

    it('returns null for unknown city', async () => {
      const coords = await client.geocodeCity('NonExistentCity');
      expect(coords).toBeNull();
    });
  });
});
