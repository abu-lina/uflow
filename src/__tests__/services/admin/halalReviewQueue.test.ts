import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHalalReviewQueue, confirmHalalReview } from '@/services/admin/halalReviewQueue';

interface Call {
  table: string;
  op: string;
  args: unknown[];
}

const calls: Call[] = [];
let results: Record<string, unknown> = {};

// Chainable, awaitable stand-in for a Supabase query builder; records every call.
function chain(table: string) {
  const c: unknown = new Proxy(
    {},
    {
      get(_, op: string) {
        if (op === 'then') {
          return (resolve: (v: unknown) => void) =>
            resolve(results[table] ?? { data: [], error: null });
        }
        return (...args: unknown[]) => {
          calls.push({ table, op, args });
          return c;
        };
      },
    },
  );
  return c;
}

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => chain(table) }),
}));

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  calls.length = 0;
  results = {};
});

describe('getHalalReviewQueue', () => {
  it('lists each provider with pending halal candidates once, oldest pending first', async () => {
    results.enrichment_candidates = {
      error: null,
      data: [
        {
          id: 'c3',
          provider_id: P2,
          field_name: 'no_pork',
          proposed_value: false,
          source_url: null,
          evidence: { matched_items: ['Schinken Pizza'] },
          enriched_at: '2026-01-01T00:00:00Z',
          providers: { provider_name: 'Older Place' },
        },
        {
          id: 'c1',
          provider_id: P1,
          field_name: 'no_alcohol',
          proposed_value: true,
          source_url: null,
          evidence: {},
          enriched_at: '2026-02-01T00:00:00Z',
          providers: { provider_name: 'Newer Place' },
        },
        {
          id: 'c2',
          provider_id: P1,
          field_name: 'no_gambling',
          proposed_value: true,
          source_url: null,
          evidence: {},
          enriched_at: '2026-03-01T00:00:00Z',
          providers: { provider_name: 'Newer Place' },
        },
      ],
    };

    const queue = await getHalalReviewQueue();

    expect(queue.map((q) => q.providerId)).toEqual([P2, P1]);
    const pendingQuery = calls.filter((c) => c.table === 'enrichment_candidates');
    expect(pendingQuery).toContainEqual(
      expect.objectContaining({ op: 'eq', args: ['status', 'pending'] }),
    );
    expect(pendingQuery).toContainEqual(
      expect.objectContaining({
        op: 'in',
        args: ['field_name', ['no_alcohol', 'no_pork', 'no_gambling']],
      }),
    );
  });

  it('leaves owned providers out of the queue, since they cannot be confirmed', async () => {
    await getHalalReviewQueue();
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: 'enrichment_candidates',
        op: 'is',
        args: ['providers.provider_owner_id', null],
      }),
    );
  });

  it('returns an empty queue when nothing is pending', async () => {
    expect(await getHalalReviewQueue()).toEqual([]);
  });

  it('exposes maps match, delivery links, flagged items and prefilled toggles', async () => {
    results.enrichment_candidates = {
      error: null,
      data: [
        {
          id: 'c1',
          provider_id: P1,
          field_name: 'no_alcohol',
          proposed_value: false,
          source_url: 'https://maps.example/place',
          evidence: {
            source_platform: 'google_maps',
            maps_category: 'Bar',
            matched_items: ['Beer'],
          },
          enriched_at: '2026-01-01T00:00:00Z',
          providers: { provider_name: 'Place' },
        },
        {
          id: 'c2',
          provider_id: P1,
          field_name: 'no_pork',
          proposed_value: false,
          source_url: 'https://wolt.example/x',
          evidence: { source_platform: 'wolt', matched_items: ['Bacon Burger'] },
          enriched_at: '2026-01-02T00:00:00Z',
          providers: { provider_name: 'Place' },
        },
      ],
    };
    results.food_providers = {
      error: null,
      data: [{ provider_id: P1, no_alcohol: true, no_pork: true, no_gambling: true }],
    };
    results.provider_delivery_links = {
      error: null,
      data: [{ provider_id: P1, platform: 'wolt', platform_url: 'https://wolt.example/x' }],
    };

    const [item] = await getHalalReviewQueue();

    expect(item.mapsMatch).toEqual({ url: 'https://maps.example/place', category: 'Bar' });
    expect(item.deliveryLinks).toEqual([{ platform: 'wolt', url: 'https://wolt.example/x' }]);
    expect(item.flaggedItems).toEqual([
      { name: 'Beer', substance: 'alcohol' },
      { name: 'Bacon Burger', substance: 'pork' },
    ]);
    // pending candidates win; the field without a candidate keeps the stored value
    expect(item.toggles).toEqual({ no_alcohol: false, no_pork: false, no_gambling: true });
  });
});

describe('confirmHalalReview', () => {
  const values = { no_alcohol: true, no_pork: false, no_gambling: true };

  it('writes all three values to food_providers and marks pending halal candidates applied', async () => {
    results.providers = { data: { provider_owner_id: null }, error: null };
    results.food_providers = { data: [{ provider_id: P1 }], error: null };

    const result = await confirmHalalReview(P1, values, 'admin-1');

    expect(result).toEqual({ success: true });
    const fpUpdate = calls.find((c) => c.table === 'food_providers' && c.op === 'update');
    expect(fpUpdate?.args[0]).toEqual(values);
    const candUpdate = calls.find((c) => c.table === 'enrichment_candidates' && c.op === 'update');
    expect(candUpdate?.args[0]).toMatchObject({ status: 'applied', reviewer_id: 'admin-1' });
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: 'enrichment_candidates',
        op: 'in',
        args: ['field_name', ['no_alcohol', 'no_pork', 'no_gambling']],
      }),
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: 'enrichment_candidates',
        op: 'eq',
        args: ['status', 'pending'],
      }),
    );
  });

  it('fails without touching candidates when no food_providers row was updated', async () => {
    results.providers = { data: { provider_owner_id: null }, error: null };
    results.food_providers = { data: [], error: null };

    const result = await confirmHalalReview(P1, values, 'admin-1');

    expect(result.success).toBe(false);
    expect(calls.some((c) => c.table === 'enrichment_candidates' && c.op === 'update')).toBe(false);
  });

  it('refuses owned providers and changes nothing', async () => {
    results.providers = { data: { provider_owner_id: 'owner-1' }, error: null };

    const result = await confirmHalalReview(P1, values, 'admin-1');

    expect(result.success).toBe(false);
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('rejects a malformed provider id', async () => {
    const result = await confirmHalalReview('nope', values, 'admin-1');
    expect(result.success).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('[TDD gate] sets last_verified_at and next_audit_due when confirming review (#886)', async () => {
    results.providers = { data: { provider_owner_id: null }, error: null };
    results.food_providers = { data: [{ provider_id: P1 }], error: null };

    const before = Date.now();
    await confirmHalalReview(P1, values, 'admin-1');
    const after = Date.now();

    const fpUpdate = calls.find((c) => c.table === 'food_providers' && c.op === 'update');
    const payload = fpUpdate?.args[0] as Record<string, unknown>;
    expect(payload.last_verified_at).toBeDefined();
    expect(payload.next_audit_due).toBeDefined();

    const verifiedAt = new Date(payload.last_verified_at as string).getTime();
    expect(verifiedAt).toBeGreaterThanOrEqual(before);
    expect(verifiedAt).toBeLessThanOrEqual(after);

    const auditDue = new Date(payload.next_audit_due as string).getTime();
    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
    expect(auditDue).toBeGreaterThanOrEqual(before + sixMonthsMs - 5000);
    expect(auditDue).toBeLessThanOrEqual(after + sixMonthsMs + 5000);
  });
});
