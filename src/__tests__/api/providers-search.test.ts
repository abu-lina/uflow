import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for the providers search route handler (GET /api/providers/search).
 *
 * This route handler is the server boundary for providers search:
 * - Used by the server component for initial page render
 * - Used by the client component for pagination requests
 *
 * Plan 010 — P1a: Server-first Providers discovery
 */

// Mock the search service
const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
}));
vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: mockSearch,
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
    expect(mockSearch).toHaveBeenCalledWith('test', null, 'Everywhere', 0, 12);
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

    expect(mockSearch).toHaveBeenCalledWith('', null, 'Everywhere', 0, 12);
  });

  it('should pass category and location params to search', async () => {
    mockSearch.mockResolvedValue({ results: [], hasMore: false });

    const request = new Request(
      'http://localhost:3000/api/providers/search?category=cat-1&location=Berlin',
    );
    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith('', 'cat-1', 'Berlin', 0, 12);
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
});
