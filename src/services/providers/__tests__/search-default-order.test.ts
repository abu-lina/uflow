import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/services/badges', () => ({
  getBadgesForEntities: vi.fn().mockResolvedValue(new Map()),
}));

import { searchProviders, searchProvidersAndCommunityServices } from '@/services/providers/search';
import { fetchFilteredCities } from '@/services/providers/cities';

type RankRow = { provider_id: string; provider_name: string };

/**
 * Minimal Supabase fake. `rank` is what the default-order RPC returns (already
 * in population order). The providers table answers an id-only select with
 * every id (phase A) and a full select with the rows named by `.in('provider_id')`,
 * in reverse order so the service has to restore the ranked order itself.
 */
function makeClient(rank: RankRow[]) {
  const calls = {
    rpc: [] as Array<{ name: string; args: Record<string, unknown> }>,
    orders: [] as Array<{ column: string; ascending: boolean }>,
    eqs: [] as Array<[string, unknown]>,
  };
  const providerRow = (r: RankRow) => ({
    provider_id: r.provider_id,
    provider_name: r.provider_name,
    address_city: 'X',
    created_at: '2026-01-01T00:00:00Z',
  });

  const from = (table: string) => {
    let idOnly = false;
    let pageIds: string[] | null = null;
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const m of ['not', 'or', 'limit', 'range', 'gte', 'lte', 'neq', 'is', 'ilike']) {
      builder[m] = chain;
    }
    builder.select = (fields: string) => {
      idOnly = fields.startsWith('provider_id');
      return builder;
    };
    builder.eq = (col: string, val: unknown) => {
      calls.eqs.push([col, val]);
      return builder;
    };
    builder.order = (column: string, opts?: { ascending?: boolean }) => {
      calls.orders.push({ column, ascending: opts?.ascending ?? true });
      return builder;
    };
    builder.in = (col: string, ids: string[]) => {
      if (table === 'providers' && col === 'provider_id') pageIds = ids;
      return builder;
    };
    builder.returns = chain;
    builder.then = (resolve: (v: unknown) => unknown) => {
      if (table !== 'providers') return resolve({ data: [], error: null, count: 0 });
      if (idOnly) {
        return resolve({
          data: rank.map((r) => ({ provider_id: r.provider_id })),
          error: null,
          count: rank.length,
        });
      }
      const rows = rank
        .filter((r) => pageIds?.includes(r.provider_id))
        .map(providerRow)
        .reverse();
      return resolve({ data: rows, error: null, count: rows.length });
    };
    return builder;
  };

  const client = {
    from,
    rpc: (name: string, args: Record<string, unknown>) => {
      calls.rpc.push({ name, args });
      return Promise.resolve({ data: rank, error: null });
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const loco = Array.from({ length: 9 }, (_, i) => ({
  provider_id: `a-loco-${i}`,
  provider_name: `Loco Chicken | City${i}`,
}));
const others = Array.from({ length: 20 }, (_, i) => ({
  provider_id: `b-other-${String(i).padStart(2, '0')}`,
  provider_name: `Place ${i}`,
}));
// Loco rows lead the RPC order, as when a small-city bulk import sorts first.
const RANK: RankRow[] = [...loco, ...others];

const ids = (providers: Array<{ provider_id: string }>) => providers.map((p) => p.provider_id);

describe('#953 default order without a city, paged through the database', () => {
  beforeEach(() => vi.clearAllMocks());

  it('page 1 holds at most 2 of one brand among its first 12', async () => {
    const { client } = makeClient(RANK);
    const { providers } = await searchProviders(
      '',
      '',
      '',
      13,
      0,
      undefined,
      'food',
      undefined,
      client,
    );
    const brandCount = providers
      .slice(0, 12)
      .filter((p) => p.provider_name.startsWith('Loco Chicken')).length;
    expect(brandCount).toBe(2);
  });

  it('page 2 continues page 1 without duplicates or gaps', async () => {
    const { client } = makeClient(RANK);
    const page1 = await searchProviders('', '', '', 13, 0, undefined, 'food', undefined, client);
    const page2 = await searchProviders('', '', '', 13, 12, undefined, 'food', undefined, client);
    const seen = [...ids(page1.providers).slice(0, 12), ...ids(page2.providers).slice(0, 12)];
    expect(new Set(seen).size).toBe(seen.length);
    // Past the 12-row cap window the list is plain population order again.
    expect(seen.slice(12, 14)).toEqual(['a-loco-2', 'a-loco-3']);
  });

  it('keeps totalCount equal to the number of matching providers', async () => {
    const { client } = makeClient(RANK);
    const { totalCount } = await searchProviders(
      '',
      '',
      '',
      13,
      0,
      undefined,
      'food',
      undefined,
      client,
    );
    expect(totalCount).toBe(RANK.length);
  });

  it('asks the RPC for the food section', async () => {
    const { client, calls } = makeClient(RANK);
    await searchProviders('', '', '', 13, 0, undefined, 'food', undefined, client);
    expect(calls.rpc[0]).toMatchObject({
      name: 'get_default_order_providers',
      args: { section_filter: 'food', review_status_filter: 'approved' },
    });
  });
});

describe('#953 every no-city caller uses the population order', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['food', 'store', 'ummah'] as const)(
    'the %s section calls the RPC with its section',
    async (section) => {
      const { client, calls } = makeClient(RANK);
      const res = await searchProvidersAndCommunityServices(
        '',
        '',
        '',
        0,
        12,
        undefined,
        section,
        undefined,
        client,
      );
      expect(calls.rpc[0].args.section_filter).toBe(section);
      expect(res.results.length).toBeGreaterThan(0);
    },
  );

  it('the unpaged cities.ts caller does not need the ranking (it only collects city names)', async () => {
    const { client, calls } = makeClient(RANK);
    await fetchFilteredCities(null, 'pizza', client);
    expect(calls.rpc.map((c) => c.name)).not.toContain('get_default_order_providers');
  });
});

describe("#953 AC3: choosing a city keeps today's order", () => {
  it('orders by created_at desc and does not call the ranking RPC', async () => {
    const { client, calls } = makeClient(RANK);
    await searchProviders('', '', 'Berlin', 13, 0, undefined, 'food', undefined, client);
    expect(calls.orders).toEqual([{ column: 'created_at', ascending: false }]);
    expect(calls.rpc.map((c) => c.name)).not.toContain('get_default_order_providers');
    expect(calls.eqs).toContainEqual(['address_city', 'Berlin']);
  });
});
