import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUserFromCookie = vi.fn();
const isAdminOrModerator = vi.fn();
const getHalalReviewQueue = vi.fn();
const confirmHalalReview = vi.fn();

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: () => getUserFromCookie(),
}));
vi.mock('@/lib/auth/roles', () => ({ isAdminOrModerator: (id: string) => isAdminOrModerator(id) }));
vi.mock('@/lib/audit/adminAudit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: () => '127.0.0.1',
  getUserAgent: () => 'vitest',
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: { adminReview: { perHour: () => true, perMinute: () => true } },
  getClientIdentifier: () => 'id',
}));
vi.mock('@/services/admin/halalReviewQueue', () => ({
  getHalalReviewQueue: () => getHalalReviewQueue(),
  confirmHalalReview: (...args: unknown[]) => confirmHalalReview(...args),
}));

import { GET } from '@/app/api/admin/halal-review/route';
import { POST } from '@/app/api/admin/halal-review/confirm/route';

const PID = '11111111-1111-4111-8111-111111111111';
const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/admin/halal-review/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  getUserFromCookie.mockResolvedValue({ id: 'u1' });
  isAdminOrModerator.mockResolvedValue(true);
  getHalalReviewQueue.mockResolvedValue([]);
  confirmHalalReview.mockResolvedValue({ success: true });
});

describe('halal review API access', () => {
  it('returns 401 for anonymous visitors', async () => {
    getUserFromCookie.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/admin/halal-review'))).status).toBe(401);
    expect((await post({})).status).toBe(401);
  });

  it('returns 403 for non-admin users and never touches data', async () => {
    isAdminOrModerator.mockResolvedValue(false);
    expect((await GET(new Request('http://localhost/api/admin/halal-review'))).status).toBe(403);
    expect(
      (await post({ providerId: PID, no_alcohol: true, no_pork: true, no_gambling: true })).status,
    ).toBe(403);
    expect(getHalalReviewQueue).not.toHaveBeenCalled();
    expect(confirmHalalReview).not.toHaveBeenCalled();
  });
});

describe('halal review API behaviour', () => {
  it('GET returns the queue for admins', async () => {
    getHalalReviewQueue.mockResolvedValue([{ providerId: PID }]);
    const res = await GET(new Request('http://localhost/api/admin/halal-review'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ providerId: PID }] });
  });

  it('POST confirms with the three toggle values and the reviewer id', async () => {
    const res = await post({
      providerId: PID,
      no_alcohol: true,
      no_pork: false,
      no_gambling: true,
    });
    expect(res.status).toBe(200);
    expect(confirmHalalReview).toHaveBeenCalledWith(
      PID,
      { no_alcohol: true, no_pork: false, no_gambling: true },
      'u1',
    );
  });

  it('POST rejects a body missing a toggle', async () => {
    const res = await post({ providerId: PID, no_alcohol: true, no_pork: false });
    expect(res.status).toBe(400);
    expect(confirmHalalReview).not.toHaveBeenCalled();
  });

  it('POST surfaces service failures as 400', async () => {
    confirmHalalReview.mockResolvedValue({ success: false, error: 'owned' });
    const res = await post({ providerId: PID, no_alcohol: true, no_pork: true, no_gambling: true });
    expect(res.status).toBe(400);
  });
});
