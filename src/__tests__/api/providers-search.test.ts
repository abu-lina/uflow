import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for the providers search route handler (GET /api/providers/search).
 *
 * This route handler is the server boundary for providers search:
 * - Used by the server component for initial page render
 * - Used by the client component for pagination requests
 *
 * Plan 010 — P1a: Server-first Providers discovery
 * Plan 058 — Admin status filter and caching
 */

// Mock the search service
const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
}));
vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: mockSearch,
}));

// Mock getUserFromCookie for auth (Plan 058)
const { mockGetUserFromCookie } = vi.hoisted(() => ({
  mockGetUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mockGetUserFromCookie,
}));

// Mock isAdminOrModerator for role checking (Plan 058)
const { mockIsAdminOrModerator } = vi.hoisted(() => ({
  mockIsAdminOrModerator: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: mockIsAdminOrModerator,
}));

// Mock getSupabaseAdmin for admin search (returns a tagged mock client)
const mockAdminClient = { _tag: 'admin-client' };
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockAdminClient,
}));

// Import after mocking
import { GET } from '@/app/api/providers/search/route';

function expectCorrelationIdHeader(response: Response): void {
  const correlationId = response.headers.get('X-Correlation-ID');

  expect(correlationId).toBeTruthy();
  expect(correlationId).toMatch(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|local-\d+-\d+)$/i,
  );
}

describe('GET /api/providers/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results with correct JSON structure', async () => {
    const mockResults = {
      results: [
        {
          id: 'provider-1',
          name: 'Test Provider',
          type: 'provider',
        },
      ],
      hasMore: false,
    };
    mockSearch.mockResolvedValue(mockResults);

    const request = new Request(
      'http://localhost:3000/api/providers/search?q=test&page=0&pageSize=12',
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expectCorrelationIdHeader(response);
    expect(data).toEqual(mockResults);
    expect(mockSearch).toHaveBeenCalledWith('test', null, '', 0, 12, undefined, undefined, undefined, undefined);
  });

  it('should apply Cache-Control: no-store when free-text query is present', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request(
      'http://localhost:3000/api/providers/search?q=halal+bakery',
    );
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('should apply Cache-Control with 60s TTL for default browse (no query)', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request(
      'http://localhost:3000/api/providers/search',
    );
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=30',
    );
  });

  it('should default to page 0 and pageSize 12 when not specified', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request('http://localhost:3000/api/providers/search');
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', null, '', 0, 12, undefined, undefined, undefined, undefined);
  });

  it('should pass category and location params to search', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request(
      'http://localhost:3000/api/providers/search?category=cat-1&location=Berlin',
    );
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', 'cat-1', 'Berlin', 0, 12, undefined, undefined, undefined, undefined);
  });

  // --- Plan 044: location normalization regression tests ---
  // RC-2: missing location param must not default to 'Everywhere' city name
  it('should treat missing location param as all-locations (empty string)', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request('http://localhost:3000/api/providers/search');
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', null, '', 0, 12, undefined, undefined, undefined, undefined);
  });

  // RC-2/RC-3: empty location param must preserve the LOCATION_ALL sentinel
  it('should treat empty location param as all-locations (empty string)', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request('http://localhost:3000/api/providers/search?location=');
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', null, '', 0, 12, undefined, undefined, undefined, undefined);
  });

  // RC-3: legacy 'Everywhere' label must normalise to empty string, not filter by city name
  it('should normalise legacy "Everywhere" location to empty string', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request(
      'http://localhost:3000/api/providers/search?location=Everywhere',
    );
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', null, '', 0, 12, undefined, undefined, undefined, undefined);
  });

  // RC-3: legacy 'Überall' label must normalise to empty string, not filter by city name
  it('should normalise legacy "Überall" location to empty string', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request(
      'http://localhost:3000/api/providers/search?location=%C3%9Cberall',
    );
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', null, '', 0, 12, undefined, undefined, undefined, undefined);
  });

  it('should return 500 on search failure', async () => {
    mockSearch.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost:3000/api/providers/search');
    const response = await GET(request);

    expect(response.status).toBe(500);
    expectCorrelationIdHeader(response);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  // --- Plan 058: Admin status filter tests ---
  describe('admin status filter (Plan 058)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Default: no user (public)
      mockGetUserFromCookie.mockResolvedValue(null);
      mockIsAdminOrModerator.mockResolvedValue(false);
    });

    it('should return 403 when non-admin user attempts to use status param', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'user-123' });
      mockIsAdminOrModerator.mockResolvedValue(false);
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?status=pending',
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toMatch(/admin/i);
    });

    it('should return 403 when unauthenticated user attempts to use status param', async () => {
      mockGetUserFromCookie.mockResolvedValue(null);
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?status=pending',
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toMatch(/admin/i);
    });

    it('should allow admin user to filter by status', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123' });
      mockIsAdminOrModerator.mockResolvedValue(true);
      mockSearch.mockResolvedValue({
        results: [{ id: 'provider-1', name: 'Pending Provider', review_status: 'pending' }],
        hasMore: false,
      });

      const request = new Request(
        'http://localhost:3000/api/providers/search?status=pending',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        '', null, '', 0, 12, { status: 'pending', isAdmin: true }, undefined, undefined, mockAdminClient
      );
    });

    it('should parse and forward validated filters to service search', async () => {
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?filters=muslim,parken',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        '',
        null,
        '',
        0,
        12,
        undefined,
        undefined,
        ['muslim', 'parken'],
        undefined,
      );
    });

    it('should silently strip unknown filters instead of returning 400', async () => {
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?filters=muslim,INVALID_KEY,parken',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(
        '',
        null,
        '',
        0,
        12,
        undefined,
        undefined,
        ['muslim', 'parken'],
        undefined,
      );
    });

    it('should apply no-store cache-control when filters are present', async () => {
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?filters=gebet',
      );
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('should apply no-store cache control when status param is present', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123' });
      mockIsAdminOrModerator.mockResolvedValue(true);
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?status=approved',
      );
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('should preserve public caching for admin browse without status param', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123' });
      mockIsAdminOrModerator.mockResolvedValue(true);
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      // No status param, just regular browse as admin
      const request = new Request(
        'http://localhost:3000/api/providers/search',
      );
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe(
        'public, s-maxage=60, stale-while-revalidate=30',
      );
    });

    it('should support all valid review status values', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123' });
      mockIsAdminOrModerator.mockResolvedValue(true);
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const validStatuses = ['approved', 'pending', 'rejected', 'needs_revision'];
      
      for (const status of validStatuses) {
        const request = new Request(
          `http://localhost:3000/api/providers/search?status=${status}`,
        );
        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });

    it('should reject invalid status values', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123' });
      mockIsAdminOrModerator.mockResolvedValue(true);
      mockSearch.mockResolvedValue({ results: [], hasMore: false });

      const request = new Request(
        'http://localhost:3000/api/providers/search?status=invalid',
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/invalid.*status/i);
    });

    it('should include review metadata fields when admin calls with status param', async () => {
      mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123' });
      mockIsAdminOrModerator.mockResolvedValue(true);
      const mockResultWithMetadata = {
        results: [{
          id: 'provider-1',
          name: 'Test Provider',
          review_status: 'pending',
          review_feedback: 'Needs more info',
        }],
        hasMore: false,
      };
      mockSearch.mockResolvedValue(mockResultWithMetadata);

      const request = new Request(
        'http://localhost:3000/api/providers/search?status=pending',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0]).toHaveProperty('review_status', 'pending');
      expect(data.results[0]).toHaveProperty('review_feedback', 'Needs more info');
    });
  });
});
