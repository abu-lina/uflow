import { isAdminOrModerator } from '@/lib/auth/roles';
import { isJWTExpired } from '@/utils/jwt';
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

  // Check if token is expired before making API call
  // This reduces unnecessary requests and log noise
  if (isJWTExpired(accessToken)) {
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
 * Returns true for routes that should always be accessible (waitlist, API, static assets, PWA routes)
 */
export function isExcludedRoute(pathname: string): boolean {
  const isWaitlistRoute = pathname === '/waitlist';
  const isPwaStart = pathname === '/pwa-start'; // PWA entry point
  const isWelcome = pathname === '/welcome'; // Welcome page for PWA install
  const isCitySelection = pathname === '/city-selection'; // City selection page (part of onboarding)
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    !!pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|eot)$/);

  return isWaitlistRoute || isPwaStart || isWelcome || isCitySelection || isApiRoute || isStaticAsset;
}

/**
 * Early access routes that should be accessible to users with waitlist tokens
 * These routes allow early access users to participate in building the community
 */
const EARLY_ACCESS_ROUTES = [
  '/recommend-provider',
  '/create',
  '/city',
  '/providers', // Allow access to provider list and detail pages in early access
  '/community-services', // Allow access to community service detail pages in early access
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
  // Exclude root route - it shows waitlist content directly, not via redirect
  // Page component handles routing for early access users and launched app
  if (pathname === '/') {
    return false;
  }

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
  
  // Special case: Allow access to /create (overview page) and /create/* routes in early access mode even without waitlist token
  // This handles cases where the cookie might not be set/read correctly but the user is
  // legitimately in early access (coming from early access screen).
  // Security: The individual page components will handle authentication/authorization checks
  // (e.g., checking for recommendation mode from localStorage/formData). If the user is not
  // in recommendation mode and not logged in, pages will show login screens.
  if (!isAppLaunched && (pathname === '/create' || pathname.startsWith('/create/'))) {
    return false; // Allow access, let page components handle auth/authorization
  }

  // Special case: Allow access to /recommend-provider in early access mode even without waitlist token
  // This allows users coming from city early access pages to suggest providers.
  // The /recommend-provider page will set recommendation mode and redirect to /create/basics
  if (!isAppLaunched && pathname === '/recommend-provider') {
    return false; // Allow access, let page handle recommendation mode setup
  }

  // Special case: Allow access to /providers (list page) and provider/community service detail pages
  // This allows users to access the providers page even when app is not launched (waitlist disabled)
  // The page components will handle any necessary authentication/authorization checks.
  if (!isAppLaunched && (
    pathname === '/providers' ||
    pathname.startsWith('/providers/') || 
    pathname.startsWith('/community-services/')
  )) {
    return false; // Allow access, let page components handle auth/authorization
  }

  // Special case: Allow access to /saved in early access mode for Stage 2 users
  // This allows Stage 2 users (who have completed onboarding) to access their saved/bookmarked items
  // even if they don't have a waitlist token cookie set. The page component will handle
  // authentication checks and show login screen if needed.
  if (!isAppLaunched && pathname === '/saved') {
    return false; // Allow access, let page component handle auth/authorization
  }

  // Special case: Legal pages must always be publicly accessible (GDPR/TMG compliance)
  // These pages should be accessible regardless of app launch status or waitlist token
  if (pathname === '/terms' || pathname === '/privacy-policy' || pathname === '/impressum') {
    return false; // Always allow access to legal pages
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
