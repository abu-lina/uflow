/**
 * Issue #987 — applying a halal enrichment candidate that is not `true` drops
 * an approved food provider to needs_revision.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Call {
  table: string;
  op: string;
  args: unknown[];
}

const calls: Call[] = [];
// An array is a queue of results, one per awaited query on that table.
let results: Record<string, unknown[]> = {};

function chain(table: string) {
  const c: unknown = new Proxy(
    {},
    {
      get(_, op: string) {
        if (op === 'then') {
          return (resolve: (v: unknown) => void) =>
            resolve(results[table]?.shift() ?? { data: null, error: null });
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

import { approveCandidate } from '@/services/admin/enrichment';

const PROVIDER_ID = '11111111-1111-4111-8111-111111111111';

function setup(proposed: unknown, flipResult: unknown = { data: null, error: null }) {
  results = {
    enrichment_candidates: [
      {
        data: {
          id: 'c1',
          provider_id: PROVIDER_ID,
          field_name: 'no_alcohol',
          proposed_value: proposed,
          current_value: null,
          status: 'pending',
        },
        error: null,
      },
      { data: null, error: null },
    ],
    providers: [{ data: { provider_owner_id: null }, error: null }, flipResult],
    food_providers: [{ data: null, error: null }],
  };
}

const flips = () =>
  calls.filter(
    (c) =>
      c.table === 'providers' &&
      c.op === 'update' &&
      (c.args[0] as Record<string, unknown>).review_status === 'needs_revision',
  );
const markedApplied = () =>
  calls.some(
    (c) =>
      c.table === 'enrichment_candidates' &&
      c.op === 'update' &&
      (c.args[0] as Record<string, unknown>).status === 'applied',
  );

beforeEach(() => {
  calls.length = 0;
  results = {};
});

describe('approveCandidate post-approval flip (#987)', () => {
  it('when I apply a false enrichment candidate, the approved provider becomes needs_revision', async () => {
    setup(false);

    const result = await approveCandidate('c1', 'admin-1');

    expect(result).toEqual({ success: true });
    expect(flips()).toHaveLength(1);
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: 'providers',
        op: 'eq',
        args: ['review_status', 'approved'],
      }),
    );
    expect(markedApplied()).toBe(true);
  });

  it('when I apply a true enrichment candidate, status is not touched', async () => {
    setup(true);

    const result = await approveCandidate('c1', 'admin-1');

    expect(result).toEqual({ success: true });
    expect(flips()).toHaveLength(0);
  });

  it('when the flip fails, it returns an error and does not mark the candidate applied', async () => {
    setup(false, { data: null, error: { message: 'boom' } });

    const result = await approveCandidate('c1', 'admin-1');

    expect(result.success).toBe(false);
    expect(markedApplied()).toBe(false);
  });
});
