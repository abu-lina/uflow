/**
 * Issue #987 — route pre-check, 3x3x3 grid of stored answers for a food
 * provider. Uses the real halal-gate classifier; only storage is faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({ getUserFromCookie: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdminOrModerator: vi.fn() }));
vi.mock('@/services/admin/providers', () => ({
  updateProviderReview: vi.fn(),
  REVIEW_RPC_UNAVAILABLE_MESSAGE: 'unavailable',
}));
vi.mock('@/features/providers/services/geocode-on-approval.server', () => ({
  ensureProviderCoordinates: vi.fn(),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));
vi.mock('@/lib/audit/adminAudit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'test-agent'),
}));
vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  getRequestMetadata: vi.fn(() => ({})),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    adminReview: { perHour: vi.fn(() => true), perMinute: vi.fn(() => true) },
  },
  getClientIdentifier: vi.fn(() => 'user:admin'),
}));

let foodRow: Record<string, boolean | null> | null = null;

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const c: Record<string, unknown> = {};
      c.select = () => c;
      c.eq = () => c;
      c.maybeSingle = async () => ({ data: { listing_type: 'food' }, error: null });
      c.single = async () =>
        table === 'food_providers' && foodRow
          ? { data: foodRow, error: null }
          : { data: null, error: { message: 'no rows' } };
      return c;
    },
  }),
}));

import { PATCH } from '@/app/api/admin/review-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderReview } from '@/services/admin/providers';

const mockReview = updateProviderReview as ReturnType<typeof vi.fn>;
const validId = '123e4567-e89b-12d3-a456-426614174000';

const approve = () =>
  PATCH(
    new Request('http://localhost:3000/api/admin/review-provider', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: validId, reviewStatus: 'approved' }),
    }),
  );

const values = [true, false, null] as const;
const grid = values.flatMap((a) => values.flatMap((b) => values.map((c) => [a, b, c] as const)));
const fields = ['no_alcohol', 'no_pork', 'no_gambling'] as const;

beforeEach(() => {
  vi.clearAllMocks();
  foodRow = null;
  (getUserFromCookie as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'admin-id' });
  (isAdminOrModerator as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  mockReview.mockResolvedValue({
    provider_id: validId,
    provider_name: 'Test Provider',
    review_status: 'approved',
    review_feedback: null,
  });
});

describe('PATCH /api/admin/review-provider — food grid (#987)', () => {
  it.each(grid)('answers (%s, %s, %s) pass only when all true', async (a, b, c) => {
    foodRow = { no_alcohol: a, no_pork: b, no_gambling: c };
    const answers = [a, b, c];

    const res = await approve();

    if (answers.every((v) => v === true)) {
      expect(res.status).toBe(200);
      expect(mockReview).toHaveBeenCalled();
      return;
    }
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.denied).toEqual(fields.filter((_, i) => answers[i] === false));
    expect(json.unanswered).toEqual(fields.filter((_, i) => answers[i] === null));
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('with no food_providers row and no payload, I get 422 with all three unanswered', async () => {
    foodRow = null;

    const res = await approve();

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.denied).toEqual([]);
    expect(json.unanswered).toEqual([...fields]);
    expect(mockReview).not.toHaveBeenCalled();
  });
});
