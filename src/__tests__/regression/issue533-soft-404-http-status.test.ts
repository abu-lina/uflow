// @vitest-environment node
/**
 * Issue 533 — /food/[city], /food/[city]/[category] and /p/[id] returned
 * HTTP 200 with a 404 body for unknown slugs/ids (soft 404).
 *
 * Root cause: `notFound()` can only change the response status while the
 * render is still buffered. These routes are dynamically rendered (no
 * generateStaticParams) and sit under a root `app/loading.tsx` plus segment
 * `loading.tsx` boundaries, so React flushes the shell — and with it the
 * status line — before the page body resolves. For /p/[id] it is worse: the
 * route never called notFound() server-side at all (only the client
 * component did), so metadata had already emitted `index, follow` too.
 *
 * Fix: decide the 404 in middleware, which runs before any bytes are
 * written, and force the status with `NextResponse.rewrite(url, { status: 404 })`.
 *
 * These tests assert the HTTP STATUS CODE (`NextResponse.status`), not the
 * rendered output. The wire-level assertion lives in e2e/issue533-soft-404.spec.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_URL = 'https://mock-supabase-url.com';
const ANON_KEY = 'sb_publishable_mock_anon_key_for_tests';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Minimal PostgREST stub driven by the table name in the request URL. */
function stubSupabase(handlers: {
  cities?: () => Response;
  providers?: () => Response;
  categories?: () => Response;
}) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/rest/v1/cities')) {
      return handlers.cities?.() ?? jsonResponse([]);
    }
    if (url.includes('/rest/v1/providers')) {
      return handlers.providers?.() ?? jsonResponse([]);
    }
    if (url.includes('/rest/v1/categories')) {
      return handlers.categories?.() ?? jsonResponse([]);
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

/**
 * A fetch that simulates a hung connection: it never settles on its own and
 * rejects only when the caller's AbortSignal fires. Without an
 * `AbortSignal.timeout` on the lookup this deadlocks the guard — that stall is
 * the bug the timeout test pins down.
 */
function hungFetch(onAbort: () => void) {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        onAbort();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  });
}

describe('issue 533 — route guard', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('parseFoodRoute', () => {
    it('extracts city and category segments', async () => {
      const { parseFoodRoute } = await import('@/lib/route-guard');

      expect(parseFoodRoute('/food')).toBeNull();
      expect(parseFoodRoute('/food/')).toBeNull();
      expect(parseFoodRoute('/food/berlin')).toEqual({ citySlug: 'berlin' });
      expect(parseFoodRoute('/food/berlin/pizza')).toEqual({
        citySlug: 'berlin',
        categorySlug: 'pizza',
      });
      // Not a food listing route
      expect(parseFoodRoute('/p/abc')).toBeNull();
      expect(parseFoodRoute('/foodie/berlin')).toBeNull();
      // Deeper paths are not owned by these two segments
      expect(parseFoodRoute('/food/berlin/pizza/extra')).toBeNull();
    });
  });

  describe('parseProviderRoute', () => {
    it('extracts the provider id segment', async () => {
      const { parseProviderRoute } = await import('@/lib/route-guard');

      const uuid = '00000000-0000-0000-0000-000000000000';
      expect(parseProviderRoute(`/p/${uuid}`)).toEqual({ providerId: uuid });
      expect(parseProviderRoute('/p')).toBeNull();
      expect(parseProviderRoute('/p/')).toBeNull();
      expect(parseProviderRoute('/food/berlin')).toBeNull();
      // Deeper paths are not owned by /p/[id]
      expect(parseProviderRoute(`/p/${uuid}/extra`)).toBeNull();
    });
  });

  describe('shouldServeFoodNotFound', () => {
    it('returns false for a city that exists in the cities table', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({ cities: () => jsonResponse([{ city_name: 'Berlin' }]) }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin')).resolves.toBe(false);
    });

    it('slugifies city names the same way the page does (München -> muenchen)', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({ cities: () => jsonResponse([{ city_name: 'München' }]) }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/muenchen')).resolves.toBe(false);
    });

    it('returns true for an unknown city slug', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({ cities: () => jsonResponse([{ city_name: 'Berlin' }]) }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/notarealcity')).resolves.toBe(true);
    });

    it('honours the provider address_city fallback used by findCityBySlug', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({
          cities: () => jsonResponse([]),
          providers: () => jsonResponse([{ address_city: 'Wuppertal' }]),
        }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/wuppertal')).resolves.toBe(false);
    });

    it('returns true for an unknown category on a known city', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({
          cities: () => jsonResponse([{ city_name: 'Berlin' }]),
          categories: () => jsonResponse([]),
        }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin/notarealcategory')).resolves.toBe(true);
    });

    it('returns false for a known category on a known city', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({
          cities: () => jsonResponse([{ city_name: 'Berlin' }]),
          categories: () => jsonResponse([{ category_id: 'pizza' }]),
        }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin/pizza')).resolves.toBe(false);
    });

    it('treats a PostgREST error on categories as not-found (mirrors getCategoryBySlug)', async () => {
      // Request 246: the `categories.slug` column is missing on some
      // environments. `getCategoryBySlug` swallows that error and returns null,
      // so the page calls notFound(). The guard must agree, otherwise the
      // status and the body would disagree again.
      vi.stubGlobal(
        'fetch',
        stubSupabase({
          cities: () => jsonResponse([{ city_name: 'Berlin' }]),
          categories: () =>
            jsonResponse({ code: '42703', message: 'column categories.slug does not exist' }, 400),
        }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin/pizza')).resolves.toBe(true);
    });

    it('fails open when the lookup throws, so a network blip cannot 404 the section', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('network down');
        }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin')).resolves.toBe(false);
    });

    it('fails open on a PostgREST HTTP error: a 5xx must not 404 valid cities', async () => {
      // A 500/503 from Supabase is "could not determine", not "no cities
      // exist". Mapping it to an empty slug set 404'd every valid
      // /food/<city> for the duration of the outage.
      vi.stubGlobal(
        'fetch',
        stubSupabase({
          cities: () => jsonResponse({ message: 'upstream down' }, 503),
          providers: () => jsonResponse({ message: 'upstream down' }, 503),
        }),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin')).resolves.toBe(false);
    });

    it('does not cache a failed city lookup: the next request retries and sees recovery', async () => {
      // The degraded answer used to enter the 5-minute cache, so the 404s
      // outlived the outage. A failed lookup must leave no cache entry.
      let citiesDown = true;
      const fetchSpy = stubSupabase({
        cities: () =>
          citiesDown
            ? jsonResponse({ message: 'upstream down' }, 503)
            : jsonResponse([{ city_name: 'Berlin' }]),
      });
      vi.stubGlobal('fetch', fetchSpy);
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');

      // During the outage: fail open, and crucially leave nothing cached.
      await expect(shouldServeFoodNotFound('/food/berlin')).resolves.toBe(false);
      citiesDown = false;
      // One retry per request, exactly: nothing was cached, nothing extra runs.
      await expect(shouldServeFoodNotFound('/food/berlin')).resolves.toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('fails open when the lookup stalls past the timeout instead of hanging the request', async () => {
      let aborted = false;
      vi.stubGlobal(
        'fetch',
        hungFetch(() => (aborted = true)),
      );
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food/berlin')).resolves.toBe(false);
      expect(aborted).toBe(true);
    }, 10_000);

    it('ignores non-food routes without hitting the network', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const { shouldServeFoodNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeFoodNotFound('/food')).resolves.toBe(false);
      await expect(shouldServeFoodNotFound('/p/123')).resolves.toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('shouldServeProviderNotFound', () => {
    const uuid = '11111111-2222-3333-4444-555555555555';

    it('returns false when the provider row exists', async () => {
      vi.stubGlobal(
        'fetch',
        stubSupabase({ providers: () => jsonResponse([{ provider_id: uuid }]) }),
      );
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeProviderNotFound(`/p/${uuid}`)).resolves.toBe(false);
    });

    it('returns true when no provider row matches the id', async () => {
      vi.stubGlobal('fetch', stubSupabase({ providers: () => jsonResponse([]) }));
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeProviderNotFound(`/p/${uuid}`)).resolves.toBe(true);
    });

    it('queries providers by provider_id, the same lookup getProviderById uses', async () => {
      const fetchSpy = stubSupabase({ providers: () => jsonResponse([]) });
      vi.stubGlobal('fetch', fetchSpy);
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await shouldServeProviderNotFound(`/p/${uuid}`);

      const input = fetchSpy.mock.calls[0][0];
      const url = String(input instanceof Request ? input.url : input);
      expect(url).toContain('/rest/v1/providers');
      expect(url).toContain(`provider_id=eq.${uuid}`);
    });

    it('fails open on a PostgREST error: getProviderById throws there, the page 500s, not 404s', async () => {
      // Unlike the food lookups (whose services swallow errors into
      // notFound()), getProviderById rethrows on any non-PGRST116 error, so a
      // failed existence check must NOT map to a 404 status.
      vi.stubGlobal(
        'fetch',
        stubSupabase({
          providers: () => jsonResponse({ code: '500', message: 'db down' }, 500),
        }),
      );
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeProviderNotFound(`/p/${uuid}`)).resolves.toBe(false);
    });

    it('fails open when the lookup throws', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('network down');
        }),
      );
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeProviderNotFound(`/p/${uuid}`)).resolves.toBe(false);
    });

    it('fails open when the lookup stalls past the timeout instead of hanging the request', async () => {
      let aborted = false;
      vi.stubGlobal(
        'fetch',
        hungFetch(() => (aborted = true)),
      );
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeProviderNotFound(`/p/${uuid}`)).resolves.toBe(false);
      expect(aborted).toBe(true);
    }, 10_000);

    it('queries PostgREST as anon on the existence fast path', async () => {
      // The existence select must stay unconditionally anon: anon RLS
      // exposes exactly the approved rows, so a hit means "visible to
      // everyone" and a miss hands off to the caller-aware
      // provider_route_visibility RPC (migration 137). Forwarding a caller
      // token here would let a forged cookie widen the fast path.
      const fetchSpy = stubSupabase({ providers: () => jsonResponse([]) });
      vi.stubGlobal('fetch', fetchSpy);
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await shouldServeProviderNotFound(`/p/${uuid}`);

      const init = fetchSpy.mock.calls[0][1];
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe(`Bearer ${ANON_KEY}`);
    });

    it('ignores non-/p routes without hitting the network', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const { shouldServeProviderNotFound } = await import('@/lib/route-guard');
      await expect(shouldServeProviderNotFound('/food/berlin')).resolves.toBe(false);
      await expect(shouldServeProviderNotFound('/p')).resolves.toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('middleware HTTP status', () => {
    async function runMiddleware(pathname: string) {
      const { middleware } = await import('@/middleware');
      const { NextRequest } = await import('next/server');
      const req = new NextRequest(new URL(`http://localhost:3000${pathname}`), {
        headers: { 'user-agent': 'vitest', 'x-forwarded-for': `10.0.0.${Math.random() * 200}` },
      });
      return middleware(req);
    }

    beforeEach(() => {
      vi.doMock('@/lib/middleware-utils', () => ({
        shouldRedirectToWaitlist: vi.fn(async () => false),
      }));
    });

    it('responds 404 for an unknown city slug', async () => {
      vi.doMock('@/lib/route-guard', () => ({
        shouldServeNotFound: vi.fn(async () => true),
      }));
      const res = await runMiddleware('/food/notarealcity');
      expect(res?.status).toBe(404);
    });

    it('responds 404 for an unknown category slug', async () => {
      vi.doMock('@/lib/route-guard', () => ({
        shouldServeNotFound: vi.fn(async () => true),
      }));
      const res = await runMiddleware('/food/berlin/nope');
      expect(res?.status).toBe(404);
    });

    it('responds 404 for an unknown provider id', async () => {
      vi.doMock('@/lib/route-guard', () => ({
        shouldServeNotFound: vi.fn(async () => true),
      }));
      const res = await runMiddleware('/p/00000000-0000-0000-0000-000000000000');
      expect(res?.status).toBe(404);
    });

    it('does not touch the status for a valid food route', async () => {
      vi.doMock('@/lib/route-guard', () => ({
        shouldServeNotFound: vi.fn(async () => false),
      }));
      const res = await runMiddleware('/food/berlin');
      expect(res?.status).toBe(200);
    });

    it('does not touch the status for a valid provider route', async () => {
      vi.doMock('@/lib/route-guard', () => ({
        shouldServeNotFound: vi.fn(async () => false),
      }));
      const res = await runMiddleware('/p/11111111-2222-3333-4444-555555555555');
      expect(res?.status).toBe(200);
    });

    it('forwards the sb-access-token cookie to the guard, which decides where it matters', async () => {
      // Issue 547 rework: middleware no longer pre-filters by path shape —
      // the guard re-validates UUID-ness itself, so the token is passed
      // unconditionally and only ever reaches PostgREST on the
      // provider_route_visibility RPC for UUID-shaped /p paths.
      const guard = vi.fn(async () => false);
      vi.doMock('@/lib/route-guard', () => ({ shouldServeNotFound: guard }));
      const { middleware } = await import('@/middleware');
      const { NextRequest } = await import('next/server');
      const req = new NextRequest(new URL('http://localhost:3000/p/abc'), {
        headers: {
          'user-agent': 'vitest',
          'x-forwarded-for': '10.9.9.9',
          cookie: 'sb-access-token=session-jwt',
        },
      });
      await middleware(req);
      expect(guard).toHaveBeenCalledWith('/p/abc', 'session-jwt');
    });
  });
});
