/**
 * Plan 229 - Provider count: API route passes through totalCount
 *
 * Verifies that GET /api/providers/search returns totalCount in the response
 * when the search service provides it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
}));
vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: mockSearch,
}));

const { mockGetUserFromCookie } = vi.hoisted(() => ({
  mockGetUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mockGetUserFromCookie,
}));

const { mockIsAdminOrModerator } = vi.hoisted(() => ({
  mockIsAdminOrModerator: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: mockIsAdminOrModerator,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ _tag: 'admin-client' }),
}));

import { GET } from '@/app/api/providers/search/route';

describe('Plan 229 - totalCount in API response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through totalCount from search service', async () => {
    mockSearch.mockResolvedValue({
      results: [{ id: 'p1', name: 'Test' }],
      hasMore: false,
      totalCount: 42,
    });

    const request = new Request('http://localhost:3000/api/providers/search?q=halal');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalCount).toBe(42);
  });

  it('returns totalCount: 0 when no results', async () => {
    mockSearch.mockResolvedValue({
      results: [],
      hasMore: false,
      totalCount: 0,
    });

    const request = new Request('http://localhost:3000/api/providers/search');
    const response = await GET(request);
    const data = await response.json();

    expect(data.totalCount).toBe(0);
  });

  it('returns totalCount with section filter', async () => {
    mockSearch.mockResolvedValue({
      results: [{ id: 'p1', name: 'Store' }],
      hasMore: false,
      totalCount: 15,
    });

    const request = new Request('http://localhost:3000/api/providers/search?section=store');
    const response = await GET(request);
    const data = await response.json();

    expect(data.totalCount).toBe(15);
  });
});
