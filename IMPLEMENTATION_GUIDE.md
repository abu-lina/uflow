# Implementation Guide for Production Readiness

This guide provides step-by-step instructions to implement the critical fixes identified in the Production Readiness Report.

---

## 1. Error Monitoring with Sentry

### Step 1: Install Sentry
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Step 2: Configure Sentry
The wizard will create these files automatically, but here's what they should contain:

**`sentry.client.config.ts`** (root directory):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production
  tracesSampleRate: 1.0,
  
  // Set sampling rate for profiling
  profilesSampleRate: 1.0,
  
  // Only capture errors in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Network errors
    'NetworkError',
    'ChunkLoadError',
  ],
  
  beforeSend(event, hint) {
    // Don't send events for localhost
    if (window.location.hostname === 'localhost') {
      return null;
    }
    return event;
  },
});
```

**`sentry.server.config.ts`** (root directory):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production',
});
```

**`sentry.edge.config.ts`** (root directory):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production',
});
```

### Step 3: Update Environment Variables
Add to `.env.local`:
```env
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-auth-token
```

Add to Vercel environment variables (same values).

### Step 4: Update Error Boundary
**`src/components/common/error-boundary/ErrorBoundary.tsx`**:
```typescript
import * as Sentry from '@sentry/nextjs';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
            <div className="mb-4 text-6xl">⚠️</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-800">Etwas ist schiefgelaufen</h2>
            <p className="mb-6 text-gray-600">
              Es gab einen unerwarteten Fehler. Bitte versuche es erneut.
            </p>
            <div className="space-y-3">
              <button
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => window.location.reload()}
              >
                Seite neu laden
              </button>
              <button
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => this.setState({ hasError: false })}
              >
                Erneut versuchen
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Fehlerdetails (Entwicklung)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 5: Update Global Error Handler
**`src/app/error.tsx`**:
```typescript
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error:', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong!</h2>
        <p className="mb-4 text-gray-700">{error.message}</p>
        {error.digest && (
          <p className="mb-4 text-sm text-gray-500">Error ID: {error.digest}</p>
        )}
        <button
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

### Step 6: Add Custom Error Logging Helper
**`src/utils/errorLogger.ts`** (new file):
```typescript
import * as Sentry from '@sentry/nextjs';

export function logError(error: Error | unknown, context?: Record<string, any>) {
  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error, 'Context:', context);
  }

  // Log to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    if (error instanceof Error) {
      Sentry.captureException(error, {
        contexts: {
          custom: context,
        },
      });
    } else {
      Sentry.captureMessage(String(error), {
        level: 'error',
        contexts: {
          custom: context,
        },
      });
    }
  }
}

// Usage example:
// try {
//   await createProvider(data);
// } catch (error) {
//   logError(error, { 
//     userId: user.id,
//     action: 'create_provider',
//     providerId: data.provider_id
//   });
//   throw error;
// }
```

---

## 2. Analytics with Vercel Analytics

### Step 1: Install Vercel Analytics
```bash
npm install @vercel/analytics @vercel/speed-insights
```

### Step 2: Update Root Layout
**`src/app/layout.tsx`** - Add these imports and components:
```typescript
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {/* Existing providers and children */}
        {children}
        
        {/* Add Analytics */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Step 3: Track Custom Events
**`src/utils/analytics.ts`** (new file):
```typescript
import { track } from '@vercel/analytics';

export const analytics = {
  // Provider interactions
  searchProviders: (query: string, category: string, location: string) => {
    track('search_providers', { query, category, location });
  },

  viewProvider: (providerId: string, providerName: string) => {
    track('view_provider', { providerId, providerName });
  },

  createProvider: (providerId: string, category: string, isOwner: boolean) => {
    track('create_provider', { providerId, category, isOwner });
  },

  bookmarkProvider: (providerId: string, action: 'add' | 'remove') => {
    track('bookmark_provider', { providerId, action });
  },

  // Auth events
  signIn: (method: 'email' | 'google') => {
    track('sign_in', { method });
  },

  signUp: (method: 'email' | 'google') => {
    track('sign_up', { method });
  },

  signOut: () => {
    track('sign_out');
  },

  // Feature usage
  usePWAInstall: () => {
    track('pwa_install');
  },

  shareProvider: (providerId: string, method: string) => {
    track('share_provider', { providerId, method });
  },
};

// Usage in components:
// import { analytics } from '@/utils/analytics';
// 
// const handleSearch = (query: string) => {
//   analytics.searchProviders(query, category, location);
//   // ... rest of search logic
// };
```

### Step 4: Enable in Vercel Dashboard
1. Go to your Vercel project
2. Navigate to "Analytics" tab
3. Enable "Web Analytics"
4. Enable "Speed Insights"

---

## 3. Rate Limiting

### Step 1: Install Dependencies
```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 2: Set up Upstash Redis
1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy REST URL and token

### Step 3: Add Environment Variables
**.env.local**:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Step 4: Create Rate Limiter Utility
**`src/lib/rate-limit.ts`** (new file):
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limiters for different use cases
export const rateLimiters = {
  // General API rate limit: 100 requests per hour
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/api',
  }),

  // Auth endpoints: 10 requests per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth',
  }),

  // Provider creation: 5 requests per hour per user
  createProvider: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/create-provider',
  }),

  // Search: 60 requests per minute
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/search',
  }),
};

// Helper function to get client identifier (IP or user ID)
export function getClientIdentifier(request: Request, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }

  // Otherwise use IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ip:${ip}`;
}
```

### Step 5: Update Middleware
**`src/middleware.ts`**:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

export async function middleware(req: NextRequest) {
  // Rate limit API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const identifier = getClientIdentifier(req);
    const { success, limit, remaining, reset } = await rateLimiters.api.limit(identifier);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'You have exceeded the rate limit. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          },
        }
      );
    }
  }

  // Existing auth middleware
  const accessToken = req.cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(dashboard)/(.*)',
    '/(admin)/(.*)',
    '/api/:path*',
  ],
};
```

### Step 6: Add Rate Limiting to API Routes
**Example: `src/app/api/providers/route.ts`** (if it exists):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit provider creation
  const user = await getUser(req); // Your auth helper
  const identifier = getClientIdentifier(req, user?.id);
  
  const { success } = await rateLimiters.createProvider.limit(identifier);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can only create 5 providers per hour.' },
      { status: 429 }
    );
  }

  // Continue with provider creation...
}
```

---

## 4. Fix N+1 Query Problem

### Update Provider Service
**`src/services/providers.ts`** - Replace the `searchProviders` function:

```typescript
export async function searchProviders(
  query: string,
  category: string,
  location: string,
): Promise<Provider[]> {
  // Special handling for "Spenden" category
  if (category === '2335922b-76a9-4d79-b32a-b3f95941ba5c') {
    const communityServices = await searchCommunityServices(query, 'Alle', location);
    return communityServices.map((communityService) => ({
      provider_id: communityService.community_service_id,
      provider_name: communityService.community_service_name,
      provider_images: communityService.community_service_images ? JSON.stringify(communityService.community_service_images) : null,
      category_id: communityService.category_id || null,
      address_city: communityService.address_city || null,
      social_website: communityService.social_website || null,
      social_instagram: communityService.social_instagram || null,
      contact_email: communityService.contact_email || null,
      contact_phone: communityService.contact_phone || null,
      address_street: communityService.address_street || null,
      address_country: communityService.address_country || null,
      address_zip: communityService.address_zip || null,
      location_latitude: communityService.location_latitude || null,
      location_longitude: communityService.location_longitude || null,
      created_at: communityService.created_at,
      updated_at: communityService.updated_at,
      barakah_effects: communityService.barakah_effects || [],
      offers_ids: [],
      needs_ids: [],
      category: { name_de: 'Community Services' },
      community_service_id: communityService.community_service_id,
    }));
  }

  let req = supabase.from('providers').select('*, category:categories(name_de)');

  if (query) {
    // Search for matching offers and needs
    const [matchingOffers, matchingNeeds] = await Promise.all([
      searchOffers(query),
      searchNeeds(query)
    ]);

    const matchingOfferIds = matchingOffers.map(offer => offer.offer_id);
    const matchingNeedIds = matchingNeeds.map(need => need.need_id);

    const searchConditions = [`provider_name.ilike.%${query}%`];
    
    if (matchingOfferIds.length > 0) {
      searchConditions.push(`offers_ids.cs.{${matchingOfferIds.join(',')}}`);
    }
    
    if (matchingNeedIds.length > 0) {
      searchConditions.push(`needs_ids.cs.{${matchingNeedIds.join(',')}}`);
    }

    req = req.or(searchConditions.join(','));
  }
  
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  const { data, error } = await req.returns<Provider[]>();
  if (error) throw error;

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // ✅ OPTIMIZED: Batch fetch all offers and needs in 2 queries instead of N queries
  
  // Collect ALL unique offer and need IDs from ALL providers
  const allOfferIds = [...new Set(data.flatMap(p => p.offers_ids || []))];
  const allNeedIds = [...new Set(data.flatMap(p => p.needs_ids || []))];

  // Fetch all offers in ONE query
  let offersMap = new Map<string, { name_de: string }>();
  if (allOfferIds.length > 0) {
    const { data: allOffers } = await supabase
      .from('offers')
      .select('offer_id, name_de')
      .in('offer_id', allOfferIds);
    
    if (allOffers) {
      offersMap = new Map(allOffers.map(o => [o.offer_id, { name_de: o.name_de }]));
    }
  }

  // Fetch all needs in ONE query
  let needsMap = new Map<string, { name_de: string }>();
  if (allNeedIds.length > 0) {
    const { data: allNeeds } = await supabase
      .from('needs')
      .select('need_id, name_de')
      .in('need_id', allNeedIds);
    
    if (allNeeds) {
      needsMap = new Map(allNeeds.map(n => [n.need_id, { name_de: n.name_de }]));
    }
  }

  // Map offers and needs to each provider (no async needed!)
  return data.map(provider => ({
    ...provider,
    offers_ids: provider.offers_ids || [],
    needs_ids: provider.needs_ids || [],
    barakah_effects: provider.barakah_effects || [],
    offers: (provider.offers_ids || [])
      .map(id => offersMap.get(id))
      .filter((offer): offer is { name_de: string } => offer !== undefined),
    needs: (provider.needs_ids || [])
      .map(id => needsMap.get(id))
      .filter((need): need is { name_de: string } => need !== undefined),
  }));
}
```

**Performance improvement**:
- **Before**: 1 + N + N queries (e.g., 41 queries for 20 providers)
- **After**: 1 + 2 queries (3 queries total)
- **~93% reduction** in database calls

---

## 5. Uptime Monitoring

### Option 1: UptimeRobot (Recommended - Free)

1. **Sign up** at [uptimerobot.com](https://uptimerobot.com)
2. **Create monitors** for:
   - Homepage: `https://yourdomain.com/`
   - Providers: `https://yourdomain.com/providers`
   - Health Check: `https://yourdomain.com/api/health` (create this first)
3. **Set alert contacts** (email, SMS, Slack)
4. **Configure** 5-minute check intervals

### Option 2: BetterStack

1. **Sign up** at [betterstack.com](https://betterstack.com)
2. **Create uptime checks** for same endpoints
3. **Set up incident management** workflow
4. **Create status page** for users

### Step: Create Health Check Endpoint
**`src/app/api/health/route.ts`** (new file):
```typescript
import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    // All checks passed
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        api: 'operational',
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    // Health check failed
    return NextResponse.json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  }
}

// Disable caching for health checks
export const dynamic = 'force-dynamic';
```

---

## 6. Environment Variables Checklist

Update your `.env.local` and Vercel environment variables:

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# New - Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# New - Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Optional - Feature Flags
NODE_ENV=production
```

---

## Testing Checklist

After implementing all fixes:

- [ ] **Test error tracking**: Trigger error, verify in Sentry
- [ ] **Test analytics**: Check events in Vercel Analytics dashboard
- [ ] **Test rate limiting**: Make 100+ requests, verify 429 response
- [ ] **Test health check**: Visit `/api/health`, verify response
- [ ] **Test N+1 fix**: Check Network tab, verify only 3 queries
- [ ] **Load test**: Use [k6](https://k6.io/) or [Artillery](https://artillery.io/) to simulate 1,000 users
- [ ] **Monitor uptime**: Verify UptimeRobot checks are running

---

## Deployment Steps

1. **Commit all changes**:
```bash
git add .
git commit -m "Add production readiness fixes: error monitoring, analytics, rate limiting"
git push origin main
```

2. **Add environment variables** in Vercel dashboard

3. **Deploy to production**:
```bash
vercel --prod
```

4. **Verify deployment**:
   - Check Sentry for initialization
   - Check Vercel Analytics dashboard
   - Test rate limiting manually
   - Verify uptime monitors are green

---

## Support

If you encounter issues:
1. Check the [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
2. Check the [Vercel Analytics docs](https://vercel.com/docs/analytics)
3. Check the [Upstash docs](https://upstash.com/docs/redis/overall/getstarted)

