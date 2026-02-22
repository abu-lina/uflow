/**
 * Tests for needs service — fallback query bounding
 * Plan 008: Verify searchNeeds fallback uses explicit columns and limit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

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
  };

  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOr.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
  mockLimit.mockResolvedValue({ data: [], error: null });
}

import { searchNeeds } from '@/services/needs';

describe('needs service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe('searchNeeds — fallback query bounding (Plan 008, M4)', () => {
    it('fallback uses explicit columns instead of select(*)', async () => {
      // RPC returns function-not-found to trigger fallback
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function search_needs does not exist' },
      });

      await searchNeeds('test-query');

      // Fallback should use explicit columns, not select('*')
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('need_id')
      );
      // Must NOT be called with '*'
      const selectCalls = mockSelect.mock.calls;
      const fallbackSelectCall = selectCalls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0] !== '*, category:categories(name_de, name_en)'
      );
      expect(fallbackSelectCall).toBeDefined();
      if (fallbackSelectCall) {
        expect(fallbackSelectCall[0]).not.toBe('*');
      }
    });

    it('fallback applies a limit', async () => {
      // RPC returns function-not-found to trigger fallback
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function search_needs does not exist' },
      });

      await searchNeeds('test-query');

      // Fallback should have a limit
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('returns empty array for empty query', async () => {
      const result = await searchNeeds('');
      expect(result).toEqual([]);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('returns RPC results when available', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { need_id: 'n1', name_de: 'Nachhilfe', name_en: 'Tutoring', category_id: 'c1', created_by: 'u1', created_at: '2024-01-01' },
        ],
        error: null,
      });

      const result = await searchNeeds('Nachhilfe');

      expect(result).toHaveLength(1);
      expect(result[0].need_id).toBe('n1');
      // Fallback should NOT be called
      expect(mockFrom).not.toHaveBeenCalledWith('needs');
    });
  });
});
