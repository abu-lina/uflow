import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAvailableFilters } from '@/services/providers/filters';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Helpers – build a chainable mock that records every method call
// ---------------------------------------------------------------------------
type ChainRecorder = {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  _resolve: (data: Record<string, unknown>[] | null, error?: unknown) => void;
};

function createChainableClient(): { client: SupabaseClient; chain: ChainRecorder } {
  let resolveData: Record<string, unknown>[] | null = [];
  let resolveError: unknown = null;

  const terminal = {
    then(onFulfilled: (val: { data: unknown; error: unknown }) => void) {
      onFulfilled({ data: resolveData, error: resolveError });
    },
  };

  const chain: ChainRecorder = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    _resolve(data, error = null) {
      resolveData = data;
      resolveError = error;
    },
  };

  // Each method returns the builder so calls can keep chaining
  const builder = new Proxy(terminal, {
    get(target, prop) {
      if (prop === 'then') return target.then.bind(target);
      if (prop in chain) {
        return (...args: unknown[]) => {
          (chain as unknown as Record<string, ReturnType<typeof vi.fn>>)[prop as string](...args);
          return builder;
        };
      }
      // fallback – return self for any unknown chain call
      return () => builder;
    },
  });

  chain.from.mockImplementation(() => builder);

  const client = { from: chain.from } as unknown as SupabaseClient;
  return { client, chain };
}

// ---------------------------------------------------------------------------
// Mock the client module so the default client is never used
// ---------------------------------------------------------------------------
vi.mock('@/services/providers/client', () => ({
  getSupabaseClient: vi.fn((c?: SupabaseClient) => c),
}));

describe('fetchAvailableFilters', () => {
  let client: SupabaseClient;
  let chain: ChainRecorder;

  beforeEach(() => {
    vi.clearAllMocks();
    const created = createChainableClient();
    client = created.client;
    chain = created.chain;
  });

  // ------------------------------------------------------------------
  // 1. Return type: { key, count }[] instead of string[]
  // ------------------------------------------------------------------
  it('returns objects with key and count (not bare strings)', async () => {
    chain._resolve([
      {
        muslim_owned: true,
        makes_donations: false,
        economic_solidarity: false,
        has_parking: true,
        has_prayer_space: false,
        family_friendly: false,
        women_friendly: false,
        children_friendly: false,
      },
      {
        muslim_owned: true,
        makes_donations: false,
        economic_solidarity: false,
        has_parking: false,
        has_prayer_space: false,
        family_friendly: false,
        women_friendly: false,
        children_friendly: false,
      },
    ]);

    const result = await fetchAvailableFilters(undefined, undefined, client);

    // Should return { key, count } objects
    expect(result).toEqual(
      expect.arrayContaining([
        { key: 'muslim', count: 2 },
        { key: 'parken', count: 1 },
      ]),
    );
    // Should NOT contain any bare strings
    for (const item of result) {
      expect(typeof item).toBe('object');
      expect(item).toHaveProperty('key');
      expect(item).toHaveProperty('count');
    }
  });

  // ------------------------------------------------------------------
  // 2. Counts: each count = number of rows where that column is true
  // ------------------------------------------------------------------
  it('counts the number of rows where each boolean column is true', async () => {
    chain._resolve([
      {
        muslim_owned: true,
        makes_donations: true,
        economic_solidarity: false,
        has_parking: false,
        has_prayer_space: false,
        family_friendly: true,
        women_friendly: false,
        children_friendly: false,
      },
      {
        muslim_owned: true,
        makes_donations: false,
        economic_solidarity: false,
        has_parking: false,
        has_prayer_space: false,
        family_friendly: true,
        women_friendly: false,
        children_friendly: false,
      },
      {
        muslim_owned: false,
        makes_donations: true,
        economic_solidarity: false,
        has_parking: false,
        has_prayer_space: false,
        family_friendly: false,
        women_friendly: false,
        children_friendly: false,
      },
    ]);

    const result = await fetchAvailableFilters(undefined, undefined, client);

    const byKey = Object.fromEntries(result.map((r) => [r.key, r.count]));
    expect(byKey.muslim).toBe(2);
    expect(byKey.spenden).toBe(2);
    expect(byKey.familien).toBe(2);
    // Keys with 0 count should also appear (so UI can gray them out)
    expect(byKey.parken).toBe(0);
  });

  // ------------------------------------------------------------------
  // 3. All filter keys returned even when count is 0
  // ------------------------------------------------------------------
  it('includes all filter keys even when none have true values', async () => {
    chain._resolve([
      {
        muslim_owned: false,
        makes_donations: false,
        economic_solidarity: false,
        has_parking: false,
        has_prayer_space: false,
        family_friendly: false,
        women_friendly: false,
        children_friendly: false,
      },
    ]);

    const result = await fetchAvailableFilters(undefined, undefined, client);

    const keys = result.map((r) => r.key);
    expect(keys).toContain('muslim');
    expect(keys).toContain('spenden');
    expect(keys).toContain('solidaritaet');
    expect(keys).toContain('parken');
    expect(keys).toContain('gebet');
    expect(keys).toContain('familien');
    expect(keys).toContain('frauen');
    expect(keys).toContain('kinder');
    // All counts should be 0
    for (const item of result) {
      expect(item.count).toBe(0);
    }
  });

  // ------------------------------------------------------------------
  // 4. City scoping: adds ilike filter when city is provided
  // ------------------------------------------------------------------
  it('adds ilike filter on address_city when city is provided', async () => {
    chain._resolve([]);

    await fetchAvailableFilters(undefined, 'Berlin', client);

    expect(chain.ilike).toHaveBeenCalledWith('address_city', 'Berlin');
  });

  it('does NOT add ilike filter when city is undefined', async () => {
    chain._resolve([]);

    await fetchAvailableFilters(undefined, undefined, client);

    expect(chain.ilike).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 5. Section scoping still works
  // ------------------------------------------------------------------
  it('adds section filter when section is provided', async () => {
    chain._resolve([]);

    await fetchAvailableFilters('food', undefined, client);

    expect(chain.eq).toHaveBeenCalledWith('listing_type', 'food');
  });

  // ------------------------------------------------------------------
  // 6. Combined: section + city
  // ------------------------------------------------------------------
  it('applies both section and city filters together', async () => {
    chain._resolve([]);

    await fetchAvailableFilters('food', 'Berlin', client);

    expect(chain.eq).toHaveBeenCalledWith('listing_type', 'food');
    expect(chain.ilike).toHaveBeenCalledWith('address_city', 'Berlin');
  });

  // ------------------------------------------------------------------
  // 7. Error handling: returns empty array on error
  // ------------------------------------------------------------------
  it('returns empty array when query errors', async () => {
    chain._resolve(null, { message: 'network error' });

    const result = await fetchAvailableFilters(undefined, undefined, client);

    expect(result).toEqual([]);
  });

  // ------------------------------------------------------------------
  // 8. Empty data: returns empty array
  // ------------------------------------------------------------------
  it('returns empty array when no providers exist', async () => {
    chain._resolve([]);

    const result = await fetchAvailableFilters(undefined, undefined, client);

    expect(result).toEqual([]);
  });
});
