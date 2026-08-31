/**
 * Tests for communityServices service — M-5 rewrite (Plan 116)
 * After M-5, searchCommunityServices queries providers WHERE listing_type='ummah'.
 * Uses search_offers RPC for full-text search; falls back to ilike on provider_name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependent services
vi.mock('@/services/badges', () => ({
  getBadgesForEntities: vi.fn().mockResolvedValue(new Map()),
  getBadgesForEntity: vi.fn().mockResolvedValue([]),
  EntityType: { PROVIDER: 'provider', COMMUNITY_SERVICE: 'community_service' },
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

// Mock the Supabase client
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockReturns = vi.fn();
const mockIn = vi.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((..._args: any[]) => ({
  select: mockSelect,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    rpc: (...args: unknown[]) => mockRpc(...(args as [string])),
  },
}));

// Chain setup
function setupChain() {
  const chain = {
    select: mockSelect,
    eq: mockEq,
    or: mockOr,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
    returns: mockReturns,
    in: mockIn,
  };

  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOr.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);
  mockRange.mockReturnValue(chain);
  mockIn.mockReturnValue(chain);
  mockReturns.mockResolvedValue({ data: [], error: null });
}

import { searchCommunityServices } from '@/services/communityServices';

describe('communityServices service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe('searchCommunityServices — M-5 providers-based implementation', () => {
    it('returns empty array when no query provided (no RPC call)', async () => {
      const result = await searchCommunityServices('');
      // No query → no RPC call, direct providers query
      expect(mockRpc).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('[post-fix PASSES] uses ilike fallback on provider_name when RPC returns error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function not found' },
      });

      await searchCommunityServices('test-query');

      // SHOULD use provider_name ilike fallback (not community_service_name)
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('provider_name.ilike'),
      );
    });

    it('[post-fix PASSES] uses ilike fallback on provider_name when RPC throws exception', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network error'));

      await searchCommunityServices('test-query');

      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('provider_name.ilike'),
      );
    });

    it('[post-fix PASSES] uses ilike fallback when RPC returns a generic error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST', message: 'Some other database error' },
      });

      await searchCommunityServices('test-query');

      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('provider_name.ilike'),
      );
    });

    it('[post-fix PASSES] filters by provider_id when RPC returns results', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { provider_id: 'id-1' },
          { provider_id: 'id-2' },
        ],
        error: null,
      });

      await searchCommunityServices('test-query');

      // Should use .in() to filter by provider_id (not community_service_id)
      expect(mockIn).toHaveBeenCalledWith('provider_id', ['id-1', 'id-2']);
      // Should NOT use ILIKE fallback
      expect(mockOr).not.toHaveBeenCalled();
    });
  });
});
