import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({ getUserFromCookie: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdminOrModerator: vi.fn() }));
vi.mock('@/services/admin/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/admin/providers')>()),
  updateProviderReview: vi.fn(),
}));
vi.mock('@/services/admin/halal-gate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/admin/halal-gate')>()),
  checkHalalAttestation: vi.fn(),
  getHalalAttestationValues: vi.fn(),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));
vi.mock('@/features/providers/services/geocode-on-approval.server', () => ({
  ensureProviderCoordinates: vi.fn(),
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
  rateLimiters: { adminReview: { perHour: vi.fn(() => true), perMinute: vi.fn(() => true) } },
  getClientIdentifier: vi.fn(() => 'user:admin'),
}));

import { after } from 'next/server';
import { PATCH } from '@/app/api/admin/review-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderReview } from '@/services/admin/providers';
import { checkHalalAttestation } from '@/services/admin/halal-gate';
import { ensureProviderCoordinates } from '@/features/providers/services/geocode-on-approval.server';

const ID = '11111111-1111-4111-8111-111111111111';
const call = (reviewStatus: string, extra: object = {}) =>
  PATCH(
    new Request('http://localhost/api/admin/review-provider', {
      method: 'PATCH',
      body: JSON.stringify({ providerId: ID, reviewStatus, ...extra }),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserFromCookie).mockResolvedValue({ id: 'admin-1' } as never);
  vi.mocked(isAdminOrModerator).mockResolvedValue(true);
  vi.mocked(checkHalalAttestation).mockResolvedValue({ allAttested: true } as never);
  vi.mocked(updateProviderReview).mockResolvedValue({
    provider_id: ID,
    provider_name: 'Test',
    review_status: 'approved',
    review_feedback: null,
  } as never);
});

describe('review-provider geocodes on approval (#756)', () => {
  it('AC1: approval schedules coordinate resolution after the response', async () => {
    const res = await call('approved');
    expect(res.status).toBe(200);
    expect(ensureProviderCoordinates).not.toHaveBeenCalled();
    const task = vi.mocked(after).mock.calls[0][0] as () => Promise<unknown>;
    await task();
    expect(ensureProviderCoordinates).toHaveBeenCalledWith(ID);
  });

  it('AC2: approval still succeeds when scheduling coordinate resolution throws', async () => {
    vi.mocked(after).mockImplementation(() => {
      throw new Error('no request scope');
    });
    const res = await call('approved');
    expect(res.status).toBe(200);
  });

  it('does not geocode on rejection', async () => {
    await call('rejected', { reviewFeedback: 'no' });
    expect(after).not.toHaveBeenCalled();
  });
});
