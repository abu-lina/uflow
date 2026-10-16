// @vitest-environment node
/**
 * #694: "Suggest provider" sends anonymous users to the recommend login gate
 * instead of the middleware bouncing them to /food. The #415 intent (only
 * logged-in users can recommend) now holds through the page gate plus the
 * server-side auth check on POST /api/providers/recommend.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => 'ip:127.0.0.1'),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: vi.fn(() => false),
}));

vi.mock('@/lib/route-guard', () => ({
  shouldServeNotFound: vi.fn(async () => false),
}));

const anonymous = (pathname: string) => shouldRedirectToWaitlist(pathname, false, undefined, undefined);

describe('#694 AC1: anonymous /create/recommend is not redirected to /food', () => {
  it('shouldRedirectToWaitlist returns false with the app not launched and no access token', async () => {
    await expect(anonymous('/create/recommend')).resolves.toBe(false);
  });

  it('the middleware passes the request through instead of redirecting to /food', async () => {
    const { middleware } = await import('@/middleware');
    const response = await middleware(new NextRequest('http://localhost:3000/create/recommend'));
    expect(response.headers.get('location')).toBeNull();
    expect(response.status).toBe(200);
  });
});

describe('#694 AC4: anonymous /create/import-osm still redirects to /food', () => {
  it.each(['/create/import-osm', '/create/import-osm/review'])(
    'shouldRedirectToWaitlist(%s) returns true for an anonymous visitor',
    async (pathname) => {
      await expect(anonymous(pathname)).resolves.toBe(true);
    },
  );

  it('the middleware redirects anonymous /create/import-osm to /food', async () => {
    const { middleware } = await import('@/middleware');
    const response = await middleware(new NextRequest('http://localhost:3000/create/import-osm'));
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/food');
  });

  it('a logged-in visitor still passes through to the import page gate', async () => {
    await expect(shouldRedirectToWaitlist('/create/import-osm', false, 'token')).resolves.toBe(
      false,
    );
  });
});

describe('#694 AC5: anonymous users still cannot submit a recommendation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/providers/recommend rejects an unauthenticated insert with 401 AUTH_REQUIRED', async () => {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
    vi.mocked(getUserFromCookie).mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/providers/recommend/route');

    const response = await POST(
      new NextRequest('http://localhost:3000/api/providers/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creationMode: 'recommendation',
          title: 'Bistro Nur',
          category: '20c10efe-404b-4a39-bb81-5089a0332d78',
          city: 'Berlin',
          no_alcohol: true,
          no_pork: true,
          no_gambling: true,
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(((await response.json()) as { code: string }).code).toBe('AUTH_REQUIRED');
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe('#694 AC6: recommend subpaths behave like /create/recommend', () => {
  it.each(['/create/recommend/category', '/create/recommend/offers'])(
    'shouldRedirectToWaitlist(%s) returns false for an anonymous visitor',
    async (pathname) => {
      await expect(anonymous(pathname)).resolves.toBe(false);
    },
  );
});
