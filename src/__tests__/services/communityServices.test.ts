/**
 * Tests for communityServices service — fallback-on-empty regression tests
 * Plan 008: Verify searchCommunityServices does NOT fallback to ILIKE
 * when RPC returns an empty result set (only on error / function-missing).
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

  describe('searchCommunityServices — fallback-on-empty fix (Plan 008, M3)', () => {
    it('returns empty array when RPC returns empty results (no ILIKE fallback)', async () => {
      // RPC returns empty array — valid result, NO error
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await searchCommunityServices('nonexistent-term');

      // Should NOT call .or() for ILIKE fallback
      expect(mockOr).not.toHaveBeenCalled();
      // Should return empty array from the main query
      expect(result).toEqual([]);
    });

    it('uses ILIKE fallback when RPC returns function-not-found error (42883)', async () => {
      // RPC returns function-not-found error
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function search_community_services_enhanced does not exist' },
      });

      await searchCommunityServices('test-query');

      // SHOULD call .or() for ILIKE fallback when function is missing
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('community_service_name.ilike')
      );
    });

    it('uses ILIKE fallback when RPC throws an exception', async () => {
      // RPC throws an exception
      mockRpc.mockRejectedValueOnce(new Error('Network error'));

      await searchCommunityServices('test-query');

      // SHOULD call .or() for ILIKE fallback on exception
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('community_service_name.ilike')
      );
    });

    it('uses ILIKE fallback when RPC returns a non-function-not-found error', async () => {
      // RPC returns a generic error (not function-not-found)
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST', message: 'Some other database error' },
      });

      await searchCommunityServices('test-query');

      // SHOULD call .or() for ILIKE fallback on error
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('community_service_name.ilike')
      );
    });

    it('filters by IDs when RPC returns results', async () => {
      // RPC returns some results
      mockRpc.mockResolvedValueOnce({
        data: [
          { community_service_id: 'id-1' },
          { community_service_id: 'id-2' },
        ],
        error: null,
      });

      await searchCommunityServices('test-query');

      // Should use .in() to filter by returned IDs
      expect(mockIn).toHaveBeenCalledWith('community_service_id', ['id-1', 'id-2']);
      // Should NOT use ILIKE fallback
      expect(mockOr).not.toHaveBeenCalled();
    });
  });
});
