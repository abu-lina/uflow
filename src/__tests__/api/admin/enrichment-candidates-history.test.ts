import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPendingCandidates = vi.fn();
const getHistoryCandidates = vi.fn();

vi.mock('@/services/admin/enrichment', () => ({
  getPendingCandidates: (...a: unknown[]) => getPendingCandidates(...a),
  getHistoryCandidates: (...a: unknown[]) => getHistoryCandidates(...a),
  approveCandidate: vi.fn(),
  rejectCandidate: vi.fn(),
  bulkApproveByProvider: vi.fn(),
}));
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: async () => ({ id: 'admin-1' }),
}));
vi.mock('@/lib/auth/roles', () => ({ isAdminOrModerator: async () => true }));

import { GET } from '@/app/api/admin/enrichment/candidates/route';

const result = { data: [{ id: 'x' }], total: 1 };

describe('#839 GET /api/admin/enrichment/candidates?view=history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPendingCandidates.mockResolvedValue(result);
    getHistoryCandidates.mockResolvedValue(result);
  });

  it('returns the history list for view=history', async () => {
    const res = await GET(
      new Request('http://x/api/admin/enrichment/candidates?view=history&providerId=p1&limit=20'),
    );
    const body = await res.json();

    expect(getHistoryCandidates).toHaveBeenCalledWith({ providerId: 'p1', limit: 20, offset: 0 });
    expect(getPendingCandidates).not.toHaveBeenCalled();
    expect(body.data).toEqual(result.data);
    expect(body.pagination).toMatchObject({ total: 1, limit: 20, offset: 0, hasMore: false });
  });

  it('keeps returning pending candidates without a view param', async () => {
    await GET(new Request('http://x/api/admin/enrichment/candidates'));

    expect(getPendingCandidates).toHaveBeenCalled();
    expect(getHistoryCandidates).not.toHaveBeenCalled();
  });
});
