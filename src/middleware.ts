import { NextResponse, type NextRequest } from 'next/server';
import { getFeatureFlag } from '@/config/feature-flags';
import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';
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
// Matched by file EXTENSION, deliberately. Every app route in this codebase is
// extensionless, so this cannot shadow one. Do NOT rewrite this as a directory
// prefix list: `/images` as a prefix would also match a future `/images` page.
const STATIC_ASSET_PATHNAME =
  /\.(?:css|js|mjs|map|json|webmanifest|html|txt|xml|png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|wasm)$/i;

export function isStaticAssetRequest(pathname: string): boolean {
  return STATIC_ASSET_PATHNAME.test(pathname);
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except API routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
