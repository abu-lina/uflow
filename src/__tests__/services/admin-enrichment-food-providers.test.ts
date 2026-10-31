/**
 * Issue #842 — approving a halal candidate immediately applies the value to
 * food_providers (no_alcohol, no_pork), not providers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { approveCandidate, bulkApproveByProvider } from '@/services/admin/enrichment';
import { isAdminField } from '@/lib/enrichment/enrichment-fields';

const PROVIDER_ID = 'prov-001';
const REVIEWER_ID = 'admin-001';

function candidate(id: string, fieldName: string, proposed: unknown = true) {
  return {
    id,
    provider_id: PROVIDER_ID,
    field_name: fieldName,
    proposed_value: proposed,
    current_value: null,
    status: 'pending',
    source: 'halal-compliance',
  };
}

/** Routes supabase calls and records every write by table. */
function setupSupabase(candidates: ReturnType<typeof candidate>[]) {
  const providerUpdates: unknown[] = [];
  const foodProviderUpdates: Array<{ payload: unknown; eqs: Array<[string, unknown]> }> = [];
  const candidateUpdates: Array<{ id: string; payload: Record<string, unknown> }> = [];

  mockFrom.mockImplementation((table: string) => {
    if (table === 'providers') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { provider_owner_id: null }, error: null }),
        update: vi.fn((payload: unknown) => {
          providerUpdates.push(payload);
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        }),
      };
    }
    if (table === 'food_providers') {
      return {
        update: vi.fn((payload: unknown) => {
          const record = { payload, eqs: [] as Array<[string, unknown]> };
          foodProviderUpdates.push(record);
          const chain = {
            eq: vi.fn((col: string, val: unknown) => {
              record.eqs.push([col, val]);
              return Promise.resolve({ error: null });
            }),
          };
          return chain;
        }),
      };
    }
    if (table === 'enrichment_candidates') {
      let selectedId: string | null = null;
      let isListQuery = false;
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn((cols: string) => {
        isListQuery = cols !== '*';
        return chain;
      });
      chain.eq = vi.fn((col: string, val: unknown) => {
        if (col === 'id') selectedId = val as string;
        if (isListQuery && col === 'status') {
          return Promise.resolve({ data: candidates, error: null });
        }
        return chain;
      });
      chain.single = vi.fn(() =>
        Promise.resolve({
          data: candidates.find((c) => c.id === selectedId) ?? null,
          error: null,
        }),
      );
      chain.update = vi.fn((payload: Record<string, unknown>) => ({
        eq: vi.fn((_col: string, val: string) => {
          candidateUpdates.push({ id: val, payload });
          return Promise.resolve({ error: null });
        }),
      }));
      return chain;
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { providerUpdates, foodProviderUpdates, candidateUpdates };
}

describe('#842 approve = apply for halal candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approving a no_alcohol candidate writes to food_providers and sets status applied', async () => {
    const writes = setupSupabase([candidate('c1', 'no_alcohol', true)]);

    const result = await approveCandidate('c1', REVIEWER_ID);

    expect(result.success).toBe(true);
    expect(writes.foodProviderUpdates).toHaveLength(1);
    expect(writes.foodProviderUpdates[0].payload).toEqual({ no_alcohol: true });
    expect(writes.foodProviderUpdates[0].eqs).toEqual([['provider_id', PROVIDER_ID]]);
    expect(writes.providerUpdates).toHaveLength(0);
    expect(writes.candidateUpdates[0].payload.status).toBe('applied');
  });

  it('approving a no_pork candidate writes to food_providers and sets status applied', async () => {
    const writes = setupSupabase([candidate('c2', 'no_pork', false)]);

    const result = await approveCandidate('c2', REVIEWER_ID);

    expect(result.success).toBe(true);
    expect(writes.foodProviderUpdates).toHaveLength(1);
    expect(writes.foodProviderUpdates[0].payload).toEqual({ no_pork: false });
    expect(writes.foodProviderUpdates[0].eqs).toEqual([['provider_id', PROVIDER_ID]]);
    expect(writes.providerUpdates).toHaveLength(0);
    expect(writes.candidateUpdates[0].payload.status).toBe('applied');
  });

  it('non-halal fields still write to providers', async () => {
    const writes = setupSupabase([candidate('c3', 'contact_phone', '+49 123')]);

    const result = await approveCandidate('c3', REVIEWER_ID);

    expect(result.success).toBe(true);
    expect(writes.foodProviderUpdates).toHaveLength(0);
    expect(writes.providerUpdates).toHaveLength(1);
  });

  it('leaves the candidate pending when the food_providers write fails', async () => {
    const writes = setupSupabase([candidate('c4', 'no_pork', true)]);
    const base = mockFrom.getMockImplementation()!;
    mockFrom.mockImplementation((table: string) =>
      table === 'food_providers'
        ? {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: { message: 'boom' } }),
            })),
          }
        : base(table),
    );

    const result = await approveCandidate('c4', REVIEWER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('boom');
    expect(writes.candidateUpdates).toHaveLength(0);
  });

  it('bulk approve applies all pending halal candidates for a provider to food_providers', async () => {
    const writes = setupSupabase([
      candidate('c5', 'no_alcohol', true),
      candidate('c6', 'no_pork', true),
    ]);

    const result = await bulkApproveByProvider(PROVIDER_ID, REVIEWER_ID);

    expect(result).toEqual({ approved: 2, skipped: 0, errors: [] });
    expect(writes.foodProviderUpdates.map((w) => w.payload)).toEqual([
      { no_alcohol: true },
      { no_pork: true },
    ]);
    expect(writes.candidateUpdates.map((u) => u.payload.status)).toEqual(['applied', 'applied']);
  });

  it('no_alcohol and no_pork are not treated as admin-controlled fields', () => {
    expect(isAdminField('no_alcohol')).toBe(false);
    expect(isAdminField('no_pork')).toBe(false);
  });
});
