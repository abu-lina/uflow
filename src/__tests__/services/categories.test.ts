/**
 * Tests for categories service — ILIKE removal regression tests
 * Plan 007: Verify fetchFilteredCategories behavior is preserved after
 * replacing ILIKE with tsvector RPC search.
 *
 * These tests validate the POST-refactor behavior where search queries
 * use RPC-based tsvector search instead of ILIKE.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client at module level
const mockRpc = vi.fn();

function createChainMock(resolvedValue: { data: unknown[]; error: null } = { data: [], error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'eq', 'in', 'ilike', 'order', 'returns', 'contains', 'is', 'limit'];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  // Terminal resolves
  chain.returns = vi.fn().mockResolvedValue(resolvedValue);
  chain.in = vi.fn(() => ({ ...chain, returns: chain.returns }));
  return chain;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((..._args: any[]) => createChainMock());

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args as [string]),
    rpc: (...args: unknown[]) => mockRpc(...args as [string]),
  },
}));

import { fetchFilteredCategories, getCategories } from '@/services/categories';

describe('categories service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createChainMock());
    mockRpc.mockReset();
  });

  describe('fetchFilteredCategories', () => {
    it('returns empty array when no providers match the filters', async () => {
      mockFrom.mockReturnValue(createChainMock({ data: [], error: null }));
      const result = await fetchFilteredCategories(null, null);
      expect(result).toEqual([]);
    });

    it('returns categories when providers match location filter only (no search query)', async () => {
      const mockCategories = [
        { id: '1', category_id: 'cat-1', name_de: 'Category A', created_at: '', updated_at: '' },
      ];

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // providers query
          return createChainMock({ data: [{ category_id: 'cat-1' }], error: null });
        }
        // categories query
        return createChainMock({ data: mockCategories, error: null });
      });

      const result = await fetchFilteredCategories('Berlin', null);
      expect(Array.isArray(result)).toBe(true);
      // Should NOT call RPC when no search query
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('uses RPC tsvector search when search query is provided', async () => {
      const mockCategories = [
        { id: '1', category_id: 'cat-1', name_de: 'Test', created_at: '', updated_at: '' },
      ];

      // RPC returns matching category_ids
      mockRpc.mockResolvedValueOnce({
        data: [{ category_id: 'cat-1' }],
        error: null,
      });

      // categories fetch
      mockFrom.mockReturnValue(createChainMock({ data: mockCategories, error: null }));

      const result = await fetchFilteredCategories(null, 'test query');
      expect(Array.isArray(result)).toBe(true);
      // Should call RPC for search
      expect(mockRpc).toHaveBeenCalledWith('get_filtered_category_ids_by_search', expect.objectContaining({
        search_query: 'test query',
      }));
    });

    it('passes location filter to RPC when both filters are provided', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ category_id: 'cat-1' }],
        error: null,
      });

      mockFrom.mockReturnValue(createChainMock({
        data: [{ id: '1', category_id: 'cat-1', name_de: 'Test', created_at: '', updated_at: '' }],
        error: null,
      }));

      await fetchFilteredCategories('Berlin', 'search term');
      expect(mockRpc).toHaveBeenCalledWith('get_filtered_category_ids_by_search', expect.objectContaining({
        search_query: 'search term',
        location_filter: 'Berlin',
      }));
    });

    it('returns empty when RPC returns no matching category IDs', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await fetchFilteredCategories(null, 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('returns all categories', async () => {
      const mockCategories = [
        { id: '1', category_id: 'cat-1', name_de: 'Alpha', created_at: '', updated_at: '' },
        { id: '2', category_id: 'cat-2', name_de: 'Beta', created_at: '', updated_at: '' },
      ];

      mockFrom.mockReturnValue(createChainMock({ data: mockCategories, error: null }));
      const result = await getCategories();
      expect(result).toHaveLength(2);
    });
  });
});
