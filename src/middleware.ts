import { NextResponse, type NextRequest } from 'next/server';
import { getFeatureFlag } from '@/config/feature-flags';
import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';
import { shouldServeNotFound } from '@/lib/route-guard';
import { getTrustedClientIp } from '@/lib/security/clientIp';

// Simple in-memory rate limiting store (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const API_RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute for API routes

export function getRateLimitKey(req: NextRequest): string {
  return getTrustedClientIp(req.headers);
}

// Static assets are exempt from the page rate limit for the same reason
// `_next/static` and `_next/image` are excluded from the matcher below: they are
// immutable files with no auth, no database access and no side effects, and in
// production Cloudflare serves them with `public, max-age=31536000, immutable`.
//
// Rate-limiting them is what broke PWA install (request 282): a service worker
// precache fetches dozens in one burst, the tail gets 429s, and Serwist rejects
// the install event on any non-OK precache response, so the worker never
// activates. No offline page, no push.
//
// The rule is: an EXACT known static file, or a static extension INSIDE a known
// asset directory. Both halves are load-bearing.
//
// Extension alone is not enough, and that was a real bypass: the predicate runs
// on every path, so `/p/anything.json`, `/food.json`, `/city/berlin.png` and
// `/about.html` would all be exempt while still reaching the app. `/p/[slug]`
// does a provider lookup before it 404s, so that is an unmetered database
// request per hit, available to anyone who can append `.json` to a URL.
//
// Equally, do NOT drop the extension test and match on the directory prefix
// alone: `startsWith('/images')` would also exempt a future extensionless
// `/images` page. A request must satisfy both to skip the limiter.
const STATIC_ASSET_PATHNAME =
  /\.(?:css|js|mjs|map|json|webmanifest|html|txt|xml|png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|wasm)$/i;

// Exact root-level static files served from public/.
const STATIC_ASSET_FILES = new Set([
  '/clear-storage.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
  '/sw.js',
  '/sw.js.map',
]);

// Asset directories under public/. A request must ALSO carry a static file
// extension to be exempt, so `/images` (a hypothetical future page) is still
// rate-limited while `/images/seals/halal.png` is not.
const STATIC_ASSET_DIRS = ['/animations/', '/icons/', '/images/', '/leaflet/', '/screenshots/'];

export function isStaticAssetRequest(pathname: string): boolean {
  if (STATIC_ASSET_FILES.has(pathname)) return true;
  if (!STATIC_ASSET_PATHNAME.test(pathname)) return false;
  return STATIC_ASSET_DIRS.some((dir) => pathname.startsWith(dir));
}

function checkRateLimit(
  key: string,
  maxRequests: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    const entries = Array.from(rateLimitStore.entries());
    for (const [k, v] of entries) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // Create new rate limit record
    const newRecord = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(key, newRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const accessToken = req.cookies.get('sb-access-token')?.value;
  const waitlistToken = req.cookies.get('waitlist_token')?.value;

  // Check app launch status and redirect to food if needed
  // This check runs before rate limiting to ensure food page is always accessible
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const needsRedirect = await shouldRedirectToWaitlist(
    pathname,
    isAppLaunched,
    accessToken,
    waitlistToken,
  );

  if (needsRedirect) {
    return NextResponse.redirect(new URL('/food', req.url));
  }

  // Rate limiting for API routes
  const isApiRoute = pathname.startsWith('/api');

  if (isApiRoute) {
    const key = getRateLimitKey(req);
    const rateLimit = checkRateLimit(key, API_RATE_LIMIT_MAX_REQUESTS);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(API_RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetTime),
          },
        },
      );
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(API_RATE_LIMIT_MAX_REQUESTS));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimit.resetTime));
  } else if (!isStaticAssetRequest(pathname)) {
    // Rate limiting for regular routes (less strict)
    const key = getRateLimitKey(req);
    const rateLimit = checkRateLimit(key, RATE_LIMIT_MAX_REQUESTS);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          },
        },
      );
    }
  }

  // Issue 533 — unknown /food/[city], /food/[city]/[category] and /p/[id]
  // segments must answer with a real 404 status, not 200 with a 404 body.
  //
  // The page components still call notFound() (that is what renders the
  // not-found UI), but by the time they run the shell has already been
  // flushed and the status line is on the wire: these routes are dynamically
  // rendered and sit under the root app/loading.tsx plus segment loading.tsx
  // boundaries, so Next cannot revise the status.
  //
  // Rewriting to the same URL keeps the render identical while pinning the
  // status to 404. This runs AFTER rate limiting so the /p lookup (one
  // PostgREST roundtrip, uncached) stays metered.
  if (await shouldServeNotFound(pathname, accessToken)) {
    return NextResponse.rewrite(req.nextUrl, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except API routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
