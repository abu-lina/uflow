import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseRestaurantsResponse,
  createTakeawayRestClient,
  type TakeawayRestaurant,
} from '../takeaway-rest-client';

// ── Sample API response fixture ──────────────────────────────────────────────

const SAMPLE_API_RESPONSE = {
  restaurants: {
    '10015773': {
      primarySlug: 'burger-vision-schoenhauser-allee',
      brand: { name: 'Burger Vision Schoenhauser Allee' },
      cuisineTypes: ['Burgers', '100% Halal'],
      rating: { votes: 2822, score: 4.3 },
      location: {
        lat: 52.529,
        lng: 13.409,
        streetAddress: 'Schoenhauser Allee 186a',
        city: 'Berlin',
      },
      shippingInfo: {
        delivery: {
          isOpenForOrder: true,
          minOrderValue: 1000,
          deliveryFeeDefault: 149,
        },
      },
      supports: { delivery: true },
    },
    '20038891': {
      primarySlug: 'kebab-haus-kreuzberg',
      brand: { name: 'Kebab Haus Kreuzberg' },
      cuisineTypes: ['Turkish', 'Kebab', 'Halal'],
      rating: { votes: 450, score: 3.9 },
      location: {
        lat: 52.497,
        lng: 13.431,
        streetAddress: 'Oranienstr. 42',
        city: 'Berlin',
      },
      shippingInfo: {
        delivery: {
          isOpenForOrder: false,
          minOrderValue: 800,
          deliveryFeeDefault: 99,
        },
      },
    },
    '30012345': {
      primarySlug: 'pizza-napoli-mitte',
      brand: { name: 'Pizza Napoli Mitte' },
      cuisineTypes: ['Italian', 'Pizza'],
      rating: { votes: 120, score: 4.7 },
      location: {
        lat: 52.52,
        lng: 13.405,
        streetAddress: 'Friedrichstr. 10',
        city: 'Berlin',
      },
      shippingInfo: {
        delivery: {
          isOpenForOrder: true,
          minOrderValue: 1200,
          deliveryFeeDefault: 199,
        },
      },
    },
  },
};

// ── parseRestaurantsResponse ─────────────────────────────────────────────────

describe('parseRestaurantsResponse', () => {
  it('parses a well-formed API response into TakeawayRestaurant[]', () => {
    const results = parseRestaurantsResponse(SAMPLE_API_RESPONSE);

    expect(results).toHaveLength(3);

    const burger = results.find((r) => r.id === '10015773');
    if (!burger) throw new Error('Expected burger restaurant to be found');
    expect(burger.slug).toBe('burger-vision-schoenhauser-allee');
    expect(burger.name).toBe('Burger Vision Schoenhauser Allee');
    expect(burger.cuisines).toEqual(['Burgers', '100% Halal']);
    expect(burger.rating).toBe(4.3);
    expect(burger.address).toBe('Schoenhauser Allee 186a');
    expect(burger.city).toBe('Berlin');
    expect(burger.latitude).toBe(52.529);
    expect(burger.longitude).toBe(13.409);
    expect(burger.isOpen).toBe(true);
    expect(burger.deliveryFee).toBe(1.49);
    expect(burger.minimumOrder).toBe(10);
  });

  it('converts delivery fee and min order from cents to EUR', () => {
    const results = parseRestaurantsResponse(SAMPLE_API_RESPONSE);
    const kebab = results.find((r) => r.id === '20038891');
    if (!kebab) throw new Error('Expected kebab restaurant to be found');

    expect(kebab.deliveryFee).toBe(0.99);
    expect(kebab.minimumOrder).toBe(8);
  });

  it('marks closed restaurants as isOpen=false', () => {
    const results = parseRestaurantsResponse(SAMPLE_API_RESPONSE);
    const kebab = results.find((r) => r.id === '20038891');
    if (!kebab) throw new Error('Expected kebab restaurant to be found');
    expect(kebab.isOpen).toBe(false);
  });

  it('returns empty array for null/undefined input', () => {
    expect(parseRestaurantsResponse(null)).toEqual([]);
    expect(parseRestaurantsResponse(undefined)).toEqual([]);
  });

  it('returns empty array when restaurants key is missing', () => {
    expect(parseRestaurantsResponse({})).toEqual([]);
    expect(parseRestaurantsResponse({ other: 'data' })).toEqual([]);
  });

  it('returns empty array when restaurants object is empty', () => {
    expect(parseRestaurantsResponse({ restaurants: {} })).toEqual([]);
  });

  it('handles entries with missing optional fields gracefully', () => {
    const sparse = {
      restaurants: {
        '99999': {
          primarySlug: 'sparse-place',
          brand: { name: 'Sparse Place' },
          // no cuisineTypes, rating, location, shippingInfo
        },
      },
    };

    const results = parseRestaurantsResponse(sparse);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Sparse Place');
    expect(results[0].cuisines).toEqual([]);
    expect(results[0].rating).toBeNull();
    expect(results[0].address).toBeNull();
    expect(results[0].city).toBeNull();
    expect(results[0].latitude).toBeNull();
    expect(results[0].longitude).toBeNull();
    expect(results[0].isOpen).toBe(false);
    expect(results[0].deliveryFee).toBeNull();
    expect(results[0].minimumOrder).toBeNull();
  });

  it('skips entries with no name and no slug', () => {
    const noIdentity = {
      restaurants: {
        '11111': { brand: {} },
        '22222': { primarySlug: 'has-slug', brand: {} },
      },
    };

    const results = parseRestaurantsResponse(noIdentity);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('has-slug');
  });

  it('filters non-string cuisine types', () => {
    const badCuisines = {
      restaurants: {
        '33333': {
          primarySlug: 'test',
          brand: { name: 'Test' },
          cuisineTypes: ['Pizza', 42, null, 'Halal', undefined],
        },
      },
    };

    const results = parseRestaurantsResponse(badCuisines);
    expect(results[0].cuisines).toEqual(['Pizza', 'Halal']);
  });
});

// ── Halal filtering (discovery script helper logic) ──────────────────────────

describe('halal filtering logic', () => {
  function isHalalRestaurant(r: TakeawayRestaurant): boolean {
    const nameHasHalal = r.name.toLowerCase().includes('halal');
    const cuisineHasHalal = r.cuisines.some((c) =>
      c.toLowerCase().includes('halal')
    );
    return nameHasHalal || cuisineHasHalal;
  }

  it('detects halal in cuisine types like "100% Halal"', () => {
    const restaurants = parseRestaurantsResponse(SAMPLE_API_RESPONSE);
    const halal = restaurants.filter(isHalalRestaurant);

    expect(halal).toHaveLength(2);
    expect(halal.map((r) => r.id).sort()).toEqual(['10015773', '20038891']);
  });

  it('detects halal in restaurant name', () => {
    const withHalalName = {
      restaurants: {
        '44444': {
          primarySlug: 'halal-chicken-spot',
          brand: { name: 'Halal Chicken Spot' },
          cuisineTypes: ['Chicken'],
        },
      },
    };

    const restaurants = parseRestaurantsResponse(withHalalName);
    const halal = restaurants.filter(isHalalRestaurant);
    expect(halal).toHaveLength(1);
  });

  it('does not false-positive on non-halal restaurants', () => {
    const restaurants = parseRestaurantsResponse(SAMPLE_API_RESPONSE);
    const pizza = restaurants.find((r) => r.id === '30012345');
    if (!pizza) throw new Error('Expected pizza restaurant to be found');

    const nameHasHalal = pizza.name.toLowerCase().includes('halal');
    const cuisineHasHalal = pizza.cuisines.some((c) =>
      c.toLowerCase().includes('halal')
    );
    expect(nameHasHalal || cuisineHasHalal).toBe(false);
  });
});

// ── createTakeawayRestClient (integration-style with mocked fetch) ───────────

describe('createTakeawayRestClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls the correct API URL with lat/lon', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ restaurants: {} }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = createTakeawayRestClient({ requestDelayMs: 0 });
    await client.searchRestaurants(52.52, 13.405);

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('lat=52.52');
    expect(calledUrl).toContain('lng=13.405');
    expect(calledUrl).toContain('limit=0');
    expect(calledUrl).toContain('isAccurate=true');
  });

  it('parses response and returns restaurants', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_API_RESPONSE),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = createTakeawayRestClient({ requestDelayMs: 0 });
    const results = await client.searchRestaurants(52.52, 13.405);

    expect(results).toHaveLength(3);
    expect(results[0].name).toBeTruthy();
  });

  it('sends correct User-Agent header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ restaurants: {} }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = createTakeawayRestClient({
      requestDelayMs: 0,
      userAgent: 'TestAgent/1.0',
    });
    await client.searchRestaurants(52.52, 13.405);

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('TestAgent/1.0');
  });

  it('retries on 429 with exponential backoff', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ restaurants: {} }),
      });
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    // Suppress console.warn during retry test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const client = createTakeawayRestClient({ requestDelayMs: 0, maxRetries: 3 });
    const results = await client.searchRestaurants(52.52, 13.405);

    expect(results).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  }, 15000);

  it('retries on 500 server errors', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(SAMPLE_API_RESPONSE),
      });
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const client = createTakeawayRestClient({ requestDelayMs: 0, maxRetries: 3 });
    const results = await client.searchRestaurants(52.52, 13.405);

    expect(results).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  }, 10000);

  it('throws after exhausting retries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const client = createTakeawayRestClient({ requestDelayMs: 0, maxRetries: 2 });

    await expect(client.searchRestaurants(52.52, 13.405)).rejects.toThrow('HTTP 429');
    // 1 initial + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  }, 15000);

  it('enforces rate limiting between calls', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ restaurants: {} }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = createTakeawayRestClient({ requestDelayMs: 100 });

    const start = Date.now();
    await client.searchRestaurants(52.52, 13.405);
    await client.searchRestaurants(48.13, 11.58);
    const elapsed = Date.now() - start;

    // Second call should have waited at least ~100ms
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
