import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/services/badges', () => ({
  getBadgesForEntities: vi.fn().mockResolvedValue(new Map()),
}));

import { searchProviders, searchProvidersAndCommunityServices } from '@/services/providers/search';
import { fetchFilteredCities } from '@/services/providers/cities';

type RankRow = { provider_id: string; provider_name: string };

/** supabase/config.toml max_rows: PostgREST never returns more rows per request. */
const MAX_ROWS = 1000;
const CATEGORY_ID = '11111111-2222-3333-4444-555555555555';

/**
 * Minimal Supabase fake with PostgREST's max_rows clamp. `rank` is what the
 * default-order RPC holds (already in population order). `matching` narrows the
 * id-only providers select, standing in for category/tier/barakah filters. A
 * full select returns the rows named by `.in('provider_id')`, reversed, so the
 * service has to restore the ranked order itself.
 */
function makeClient(rank: RankRow[], opts: { matching?: Set<string>; rpcError?: boolean } = {}) {
  const calls = {
    rpc: [] as Array<{ name: string; args: Record<string, unknown> }>,
    orders: [] as Array<{ column: string; ascending: boolean }>,
    eqs: [] as Array<[string, unknown]>,
    selects: [] as string[],
  };
  const providerRow = (r: RankRow) => ({
    provider_id: r.provider_id,
    provider_name: r.provider_name,
    address_city: 'X',
    created_at: '2026-01-01T00:00:00Z',
  });
  const clamp = <T>(rows: T[], range: [number, number] | null): T[] => {
    const [from, to] = range ?? [0, MAX_ROWS - 1];
    return rows.slice(from, Math.min(to, from + MAX_ROWS - 1) + 1);
  };

  const from = (table: string) => {
    let idOnly = false;
    let pageIds: string[] | null = null;
    let range: [number, number] | null = null;
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const m of ['not', 'or', 'limit', 'gte', 'lte', 'neq', 'is', 'ilike']) {
      builder[m] = chain;
    }
    builder.range = (a: number, b: number) => {
      range = [a, b];
      return builder;
    };
    builder.select = (fields: string) => {
      calls.selects.push(fields);
      idOnly = fields.startsWith('provider_id');
      return builder;
    };
    builder.eq = (col: string, val: unknown) => {
      calls.eqs.push([col, val]);
      return builder;
    };
    builder.order = (column: string, o?: { ascending?: boolean }) => {
      calls.orders.push({ column, ascending: o?.ascending ?? true });
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
        const all = rank
          .filter((r) => !opts.matching || opts.matching.has(r.provider_id))
          .map((r) => ({ provider_id: r.provider_id }))
          .sort((a, b) => a.provider_id.localeCompare(b.provider_id));
        return resolve({ data: clamp(all, range), error: null, count: all.length });
      }
      const rows = pageIds
        ? rank
            .filter((r) => pageIds?.includes(r.provider_id))
            .map(providerRow)
            .reverse()
        : rank.map(providerRow);
      return resolve({ data: rows, error: null, count: rows.length });
    };
    return builder;
  };

  const rpc = (name: string, args: Record<string, unknown>) => {
    calls.rpc.push({ name, args });
    let range: [number, number] | null = null;
    const b: Record<string, unknown> = {};
    b.range = (x: number, y: number) => {
      range = [x, y];
      return b;
    };
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve(
        opts.rpcError
          ? { data: null, error: { message: 'function does not exist' } }
          : { data: clamp(rank, range), error: null },
      );
    return b;
  };

  return { client: { from, rpc } as unknown as SupabaseClient, calls };
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

type Extra = {
  q?: string;
  category?: string;
  location?: string;
  admin?: Parameters<typeof searchProviders>[5];
  barakah?: Parameters<typeof searchProviders>[7];
};
const page = (c: SupabaseClient, limit: number, offset: number, x: Extra = {}) =>
  searchProviders(
    x.q ?? '',
    x.category ?? '',
    x.location ?? '',
    limit,
    offset,
    x.admin,
    'food',
    x.barakah,
    c,
  );

describe('#953 default order without a city, paged through the database', () => {
  beforeEach(() => vi.clearAllMocks());

  it('page 1 holds at most 2 of one brand among its first 12', async () => {
    const { client } = makeClient(RANK);
    const { providers } = await page(client, 13, 0);
    const brandCount = providers
      .slice(0, 12)
      .filter((p) => p.provider_name.startsWith('Loco Chicken')).length;
    expect(brandCount).toBe(2);
  });

  it('page 2 continues page 1 without duplicates or gaps', async () => {
    const { client } = makeClient(RANK);
    const page1 = await page(client, 13, 0);
    const page2 = await page(client, 13, 12);
    const seen = [...ids(page1.providers).slice(0, 12), ...ids(page2.providers).slice(0, 12)];
    expect(new Set(seen).size).toBe(seen.length);
    // Past the 12-row cap window the list is plain population order again.
    expect(seen.slice(12, 14)).toEqual(['a-loco-2', 'a-loco-3']);
  });

  it('keeps totalCount equal to the number of matching providers', async () => {
    const { client } = makeClient(RANK);
    expect((await page(client, 13, 0)).totalCount).toBe(RANK.length);
  });

  it('asks the RPC for the food section and approved status', async () => {
    const { client, calls } = makeClient(RANK);
    await page(client, 13, 0);
    expect(calls.rpc[0]).toMatchObject({
      name: 'get_default_order_providers',
      args: { section_filter: 'food', review_status_filter: 'approved' },
    });
  });

  it('admin callers get population order for the status they asked for', async () => {
    const { client, calls } = makeClient(RANK);
    await page(client, 13, 0, { admin: { status: 'all', isAdmin: true } });
    expect(calls.rpc[0].args.review_status_filter).toBe('all');
  });
});

describe('#953 more providers than PostgREST max_rows (1000)', () => {
  const BIG: RankRow[] = Array.from({ length: 1500 }, (_, i) => ({
    provider_id: `p-${String(i).padStart(4, '0')}`,
    provider_name: `Name ${i}`,
  }));

  it('reports the true totalCount and serves a page past row 1000', async () => {
    const { client } = makeClient(BIG);
    const { providers, totalCount } = await page(client, 13, 1200);
    expect(totalCount).toBe(1500);
    expect(ids(providers).slice(0, 12)).toEqual(BIG.slice(1200, 1212).map((r) => r.provider_id));
  });

  it('keeps ranked order when a filter forces the id-only query too', async () => {
    const { client } = makeClient(BIG, { matching: new Set(BIG.map((r) => r.provider_id)) });
    const { providers, totalCount } = await page(client, 13, 1100, { category: CATEGORY_ID });
    expect(totalCount).toBe(1500);
    expect(ids(providers)[0]).toBe('p-1100');
  });
});

describe('#953 filters combine with the ranking', () => {
  it('keeps only matching providers, in ranked order', async () => {
    const matching = new Set(['b-other-05', 'a-loco-3', 'b-other-01', 'a-loco-0', 'b-other-19']);
    const { client, calls } = makeClient(RANK, { matching });
    const { providers, totalCount } = await page(client, 13, 0, { category: CATEGORY_ID });
    expect(totalCount).toBe(5);
    expect(ids(providers)).toEqual([
      'a-loco-0',
      'a-loco-3',
      'b-other-01',
      'b-other-05',
      'b-other-19',
    ]);
    expect(calls.selects[0]).toContain('provider_categories!inner(category_id)');
    expect(calls.eqs).toContainEqual(['provider_categories.category_id', CATEGORY_ID]);
  });

  it('runs the id-only query for barakah filters', async () => {
    const { client, calls } = makeClient(RANK, { matching: new Set(['b-other-01']) });
    const { providers } = await page(client, 13, 0, { barakah: ['muslim_owned' as never] });
    expect(ids(providers)).toEqual(['b-other-01']);
    expect(calls.selects[0].startsWith('provider_id')).toBe(true);
  });
});

describe('#953 every no-city caller uses the population order', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['food', 'store', 'ummah'] as const)(
    'the %s section calls the RPC with its section and reports hasMore correctly',
    async (section) => {
      const { client, calls } = makeClient(RANK);
      const first = await searchProvidersAndCommunityServices(
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
      const last = await searchProvidersAndCommunityServices(
        '',
        '',
        '',
        2,
        12,
        undefined,
        section,
        undefined,
        client,
      );
      expect(calls.rpc[0].args.section_filter).toBe(section);
      expect(first.hasMore).toBe(true);
      expect(last.results).toHaveLength(RANK.length - 24);
      expect(last.hasMore).toBe(false);
    },
  );

  it('the unpaged cities.ts caller does not need the ranking (it only collects city names)', async () => {
    const { client, calls } = makeClient(RANK);
    await fetchFilteredCities(null, 'pizza', client);
    expect(calls.rpc.map((c) => c.name)).not.toContain('get_default_order_providers');
  });
});

describe('#953 stays on created_at order where the owner did not ask for the new one', () => {
  it('AC3: choosing a city orders by created_at desc and skips the ranking RPC', async () => {
    const { client, calls } = makeClient(RANK);
    await page(client, 13, 0, { location: 'Berlin' });
    expect(calls.orders).toEqual([{ column: 'created_at', ascending: false }]);
    expect(calls.rpc.map((c) => c.name)).not.toContain('get_default_order_providers');
    expect(calls.eqs).toContainEqual(['address_city', 'Berlin']);
  });

  it('free-text search keeps created_at order and skips the ranking RPC', async () => {
    const { client, calls } = makeClient(RANK);
    await page(client, 13, 0, { q: 'pizza' });
    expect(calls.orders).toEqual([{ column: 'created_at', ascending: false }]);
    expect(calls.rpc.map((c) => c.name)).not.toContain('get_default_order_providers');
  });

  it('falls back to created_at order and logs when the RPC is missing (migration not applied yet)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { client, calls } = makeClient(RANK, { rpcError: true });
    const { providers } = await page(client, 13, 0);
    expect(providers.length).toBeGreaterThan(0);
    expect(calls.orders).toEqual([{ column: 'created_at', ascending: false }]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('get_default_order_providers'),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });
});
