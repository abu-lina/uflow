import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { hasPendingHalalCandidates } from '@/services/admin/pendingHalalCandidates';

describe('hasPendingHalalCandidates (#840)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false without querying when providerId is not a UUID', async () => {
    expect(await hasPendingHalalCandidates('not-a-uuid')).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries pending no_alcohol/no_pork candidates for a valid UUID', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ count: 2, error: null });
    mockFrom.mockReturnValue(chain);

    expect(await hasPendingHalalCandidates('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(chain.in).toHaveBeenCalledWith('field_name', ['no_alcohol', 'no_pork']);
  });
});
