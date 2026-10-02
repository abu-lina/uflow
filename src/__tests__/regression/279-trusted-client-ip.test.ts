import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(async () => false),
}));

import { getRateLimitKey, isStaticAssetRequest, middleware } from '@/middleware';

describe('Request 279 — middleware rate-limit key trusts x-real-ip over spoofed XFF', () => {
  it('[regression] a spoofed x-forwarded-for cannot move the rate-limit bucket when x-real-ip is set', () => {
    const spoofed = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '6.6.6.6',
      },
    });
    const unsupplied = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '203.0.113.10' },
    });

    expect(getRateLimitKey(spoofed)).toBe('203.0.113.10');
    expect(getRateLimitKey(spoofed)).toBe(getRateLimitKey(unsupplied));
  });

  it('[regression] without nginx (no x-real-ip) the appended hop is used, keeping per-client buckets', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.10' },
    });
    expect(getRateLimitKey(req)).toBe('203.0.113.10');
  });
});

/**
 * Request 282 — static assets are exempt from the page rate limit.
 *
 * `RATE_LIMIT_MAX_REQUESTS` is 100 per minute per IP and it is NOT raised here.
 * What changed is which requests it counts: files served out of `public/`
 * (`/images/**`, `/icons/**`, `/sw.js`, `/offline.html`) are now treated the
 * same way `_next/static` and `_next/image` already were by the matcher, i.e.
 * not counted at all.
 *
 * The reason the control still has to be proven is that this is a change to a
 * security control. So the first test here is the one that matters: app routes
 * are still rate-limited, from the same synthetic IP, with the same ceiling.
 * It was shown RED against a build whose predicate was broadened to
 * `pathname.startsWith('/images') || ...`-style prefixes (see
 * agent-output/requests/282-serwist-migration.md).
 *
 * The limiter store in src/middleware.ts is module-level and shared across
 * these tests, so every test uses its own synthetic IP and no test relies on
 * another's leftover count.
 */
const APP_ROUTES = ['/', '/food', '/about', '/city/berlin'];
const STATIC_ASSETS = [
  '/sw.js',
  '/offline.html',
  '/images/seals/halal.png',
  '/icons/icon-192x192.png',
];

const RATE_LIMIT_MAX_REQUESTS = 100;

async function drive(pathname: string, ip: string): Promise<number> {
  const req = new NextRequest(`http://localhost${pathname}`, { headers: { 'x-real-ip': ip } });
  const res = await middleware(req);
  return res.status;
}

describe('Request 282 — static assets are exempt from the page rate limit', () => {
  // The limiter runs AFTER `shouldRedirectToWaitlist`, and with the default
  // `isAppLaunched: false` a request to /about is a 307 to /food that never
  // reaches the limiter at all. Launched mode is the state that exercises the
  // limiter for every path in APP_ROUTES, which is what is under test here.
  // `shouldRedirectToWaitlist` itself is covered by
  // plan123-iteration2-middleware-profile-exemption.test.ts.
  beforeAll(() => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED', 'true');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it.each(APP_ROUTES)(
    '[control] still rate-limits the app route %s past the limit from one IP',
    async (pathname) => {
      const ip = `198.51.100.${APP_ROUTES.indexOf(pathname) + 1}`;
      const statuses: number[] = [];
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS + 20; i++) {
        statuses.push(await drive(pathname, ip));
      }

      expect(statuses.filter((s) => s === 429).length).toBe(20);
      // The ceiling itself has not moved: request 100 is the last allowed one.
      expect(statuses[RATE_LIMIT_MAX_REQUESTS - 1]).not.toBe(429);
      expect(statuses[RATE_LIMIT_MAX_REQUESTS]).toBe(429);
    },
  );

  it.each(STATIC_ASSETS)('exempts the static asset %s well past the limit', async (pathname) => {
    const ip = '198.51.100.50';
    const statuses: number[] = [];
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS * 3; i++) {
      statuses.push(await drive(pathname, ip));
    }

    expect(statuses.filter((s) => s === 429)).toEqual([]);
  });

  it('cannot shadow an app route, because it matches on file extension only', () => {
    // `/images` and `/icons` are in this list on purpose: they are the directory
    // prefixes a prefix-based rewrite of this predicate would use, and a future
    // extensionless page at either path must stay rate-limited. This assertion
    // is what goes RED against a `pathname.startsWith('/images')`-style version
    // (the app-route control above cannot catch that broadening, because
    // `/images` does not shadow `/`, `/food`, `/about` or `/city/berlin`).
    for (const pathname of [
      ...APP_ROUTES,
      '/create/listing',
      '/p/some-provider-slug',
      '/images',
      '/icons',
    ]) {
      expect(isStaticAssetRequest(pathname), `${pathname} must not be treated as an asset`).toBe(
        false,
      );
    }
    for (const pathname of STATIC_ASSETS) {
      expect(isStaticAssetRequest(pathname), `${pathname} must be treated as an asset`).toBe(true);
    }
  });

  it('skips counting rather than counting-and-allowing, so assets cannot spend the page budget', async () => {
    // This is the property the PWA install depends on. If the exemption merely
    // allowed the request while still incrementing the counter, a 290-entry
    // precache would still leave the user's next navigation 429ing.
    const ip = '198.51.100.60';
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS * 2; i++) {
      await drive('/images/seals/halal.png', ip);
    }

    expect(await drive('/food', ip)).not.toBe(429);
  });
});
