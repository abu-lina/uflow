import { isAdminOrModerator } from '@/lib/auth/roles';
import type { User } from '@supabase/supabase-js';

/**
 * App routes that should be protected when app is not launched
 * These routes will redirect to /waitlist when isAppLaunched is false
 */
const APP_ROUTES = [
  '/providers',
  '/create',
  '/profile',
  '/about',
  '/community-services',
  '/recommend-provider',
  '/saved',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy-policy',
  '/create-quick',
  '/figma-test',
  '/test-header',
  '/test-notifications',
  '/test-session',
  '/manual-user',
  '/api-docs',
  '/auth-debug',
];

/**
 * Validate user from access token
 * Returns user object if token is valid, null otherwise
 */
export async function validateUser(accessToken: string): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      return null;
    }

    const user = await res.json();
    return user as User;
  } catch (error) {
    console.error('[middleware-utils] Error validating user:', error);
    return null;
  }
}

/**
 * Check if pathname is an app route (should be protected when not launched)
 * Returns true if pathname matches any app route prefix
 */
export function isAppRoute(pathname: string): boolean {
  // Root route is considered an app route (will redirect to /waitlist or show app)
  if (pathname === '/') {
    return true;
  }

  // Check if pathname starts with any app route
  return APP_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if pathname should be excluded from waitlist redirect
 * Returns true for routes that should always be accessible (waitlist, API, static assets)
 */
export function isExcludedRoute(pathname: string): boolean {
  const isWaitlistRoute = pathname === '/waitlist';
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    !!pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|eot)$/);

  return isWaitlistRoute || isApiRoute || isStaticAsset;
}

/**
 * Early access routes that should be accessible to users with waitlist tokens
 * These routes allow early access users to participate in building the community
 */
const EARLY_ACCESS_ROUTES = [
  '/recommend-provider',
  '/create',
];

/**
 * Check if pathname is an early access route
 */
function isEarlyAccessRoute(pathname: string): boolean {
  return EARLY_ACCESS_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Determine if redirect to waitlist is needed
 * Returns true if app is not launched, pathname is an app route, and user is not admin/moderator
 */
export async function shouldRedirectToWaitlist(
  pathname: string,
  isAppLaunched: boolean,
  accessToken?: string,
  waitlistToken?: string
): Promise<boolean> {
  // If app is launched, no redirect needed
  if (isAppLaunched) {
    return false;
  }

  // If route is excluded (waitlist, API, static assets), no redirect needed
  if (isExcludedRoute(pathname)) {
    return false;
  }

  // If not an app route, no redirect needed
  if (!isAppRoute(pathname)) {
    return false;
  }

  // If user has waitlist token and is accessing early access routes, allow access
  if (waitlistToken && isEarlyAccessRoute(pathname)) {
    return false; // Allow early access users to use these routes
  }

  // If user is admin/moderator, allow access (bypass waitlist)
  if (accessToken) {
    const user = await validateUser(accessToken);
    if (user) {
      const hasAccess = await isAdminOrModerator(user.id);
      if (hasAccess) {
        return false; // Admin/moderator can access app during waitlist mode
      }
    }
  }

  // Redirect to waitlist
  return true;
}
