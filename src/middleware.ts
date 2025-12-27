import { NextResponse, type NextRequest } from 'next/server';
import { getFeatureFlag } from '@/config/feature-flags';
import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';

// Simple in-memory rate limiting store (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const API_RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute for API routes

function getRateLimitKey(req: NextRequest): string {
  // Use IP address for rate limiting
  // Check multiple headers in order of preference
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  // Use the first available IP, prioritizing x-forwarded-for
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : realIp || cfIp || 'unknown';
  
  return ip;
}

function checkRateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number; resetTime: number } {
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

  // DEBUG: Log middleware execution for create routes
  if (pathname.startsWith('/create/')) {
    console.log('[Middleware] Create route access:', {
      pathname,
      hasAccessToken: !!accessToken,
      hasWaitlistToken: !!waitlistToken,
      waitlistTokenValue: waitlistToken ? `${waitlistToken.substring(0, 8)}...` : 'none',
      timestamp: new Date().toISOString(),
      referer: req.headers.get('referer'),
    });
  }

  // Check app launch status and redirect to waitlist if needed
  // This check runs before rate limiting to ensure waitlist is always accessible
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const needsRedirect = await shouldRedirectToWaitlist(pathname, isAppLaunched, accessToken, waitlistToken);
  
  if (needsRedirect) {
    console.log('[Middleware] Redirecting to /waitlist:', {
      pathname,
      isAppLaunched,
      hasAccessToken: !!accessToken,
      hasWaitlistToken: !!waitlistToken,
    });
    return NextResponse.redirect(new URL('/waitlist', req.url));
  }
  
  // DEBUG: Log successful access
  if (pathname.startsWith('/create/')) {
    console.log('[Middleware] Allowing access to:', pathname);
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
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(API_RATE_LIMIT_MAX_REQUESTS));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimit.resetTime));
  } else {
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
        }
      );
    }
  }

  // Check authentication only for protected routes
  // Role-based authorization is handled in the layout component
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                          req.nextUrl.pathname.startsWith('/admin');
  
  if (isProtectedRoute) {
    // Check for authentication token in cookies
    const accessToken = req.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      // Not authenticated, redirect to home
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Validate the token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      // Check if token is expired (403) - allow page to load so AuthSyncer can refresh
      if (res.status === 403) {
        try {
          const errorData = await res.json();
          // If it's a JWT expiration error, let the page load
          // AuthSyncer will detect the session and sync fresh tokens
          if (errorData.error_code === 'bad_jwt' || errorData.msg?.includes('expired')) {
            return NextResponse.next();
          }
        } catch {
          // If we can't parse the error, treat as expired and allow through
          return NextResponse.next();
        }
      }
      
      // For other errors (401, invalid token, etc.), redirect to home
      return NextResponse.redirect(new URL('/', req.url));
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
