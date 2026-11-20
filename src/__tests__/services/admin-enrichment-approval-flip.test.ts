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

vi.mock('@/lib/audit/adminAudit', () => ({ logAdminAction: vi.fn() }));

import { approveCandidate } from '@/services/admin/enrichment';

const PROVIDER_ID = '11111111-1111-4111-8111-111111111111';

const flipped = { data: [{ provider_id: PROVIDER_ID }], error: null };

function setup(
  proposed: unknown,
  flipResult: unknown = flipped,
  writeResult: unknown = { data: null, error: null },
) {
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
    food_providers: [writeResult],
  };
}

const idx = (pred: (c: Call) => boolean) => calls.findIndex(pred);
const isFlip = (c: Call) =>
  c.table === 'providers' &&
  c.op === 'update' &&
  (c.args[0] as Record<string, unknown>).review_status === 'needs_revision';
const isWrite = (c: Call) => c.table === 'food_providers' && c.op === 'update';
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
  it('when I apply a false candidate, the approved provider is flipped to needs_revision before the write', async () => {
    setup(false);

    const result = await approveCandidate('c1', 'admin-1');

    expect(result).toEqual({ success: true, flaggedForRevision: true });
    expect(idx(isFlip)).toBeGreaterThanOrEqual(0);
    expect(idx(isFlip)).toBeLessThan(idx(isWrite));
    const flip = calls.find(isFlip)?.args[0] as Record<string, unknown>;
    expect(flip).toMatchObject({ reviewed_by: 'admin-1' });
    expect(flip.review_feedback).toBeTruthy();
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: 'providers',
        op: 'eq',
        args: ['review_status', 'approved'],
      }),
    );
    expect(markedApplied()).toBe(true);
  });

  it('when the provider is no longer approved, nothing is flagged and the write still happens', async () => {
    setup(false, { data: [], error: null });

    const result = await approveCandidate('c1', 'admin-1');

    expect(result).toEqual({ success: true });
    expect(calls.some(isWrite)).toBe(true);
  });

  it('when I apply a true candidate, status is not touched', async () => {
    setup(true);

    const result = await approveCandidate('c1', 'admin-1');

    expect(result).toEqual({ success: true });
    expect(calls.some(isFlip)).toBe(false);
  });

  it('when the flip fails, the write is skipped and the candidate is not marked applied', async () => {
    setup(false, { data: null, error: { message: 'boom' } });

    const result = await approveCandidate('c1', 'admin-1');

    expect(result.success).toBe(false);
    expect(calls.some(isWrite)).toBe(false);
    expect(markedApplied()).toBe(false);
  });

  it('when the write fails after the flip, it returns an error and does not mark the candidate applied', async () => {
    setup(false, flipped, { data: null, error: { message: 'write failed' } });

    const result = await approveCandidate('c1', 'admin-1');

    expect(result.success).toBe(false);
    expect(calls.some(isFlip)).toBe(true);
    expect(markedApplied()).toBe(false);
  });
});
