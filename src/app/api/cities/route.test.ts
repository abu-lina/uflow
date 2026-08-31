import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

let GET: typeof import('@/app/api/cities/route').GET;

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => '127.0.0.1'),
}));

describe('/api/cities', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import('@/app/api/cities/route'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return Cache-Control header on 200 response', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');

    const mockRpc = vi.fn().mockResolvedValue({
      data: [{ id: '1', city_name: 'Berlin', country: 'Germany', is_unlocked: true, provider_count: 10, interest_count: 2 }],
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockReturnValue({
      rpc: mockRpc,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/cities');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600');
  });

  it('should return empty array when no cities data found', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');

    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(createSupabaseServerClient).mockReturnValue({
      rpc: mockRpc,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/cities');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('should return 429 when rate limited (no Cache-Control)', async () => {
    const { checkRateLimit } = await import('@/lib/rate-limit');
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/cities');
    const response = await GET(request);

    expect(response.status).toBe(429);
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  it('should return 500 on RPC error (no Cache-Control)', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');

    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    vi.mocked(createSupabaseServerClient).mockReturnValue({
      rpc: mockRpc,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/cities');
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBeNull();
  });
});
