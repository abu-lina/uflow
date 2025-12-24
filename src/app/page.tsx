import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getFeatureFlag } from '@/config/feature-flags';

/**
 * Root page - redirects based on app launch status and early access completion
 * 
 * Browser users:
 *   - When app is not launched: Redirects to /waitlist
 *   - When app is launched: Redirects to /providers
 * 
 * Early access users (after completing onboarding):
 *   - Redirects to /welcome for PWA installation
 *   - Welcome page provides proper URL context for iOS PWA
 * 
 * PWA users:
 *   - Use manifest start_url: /pwa-start (handles standalone mode detection)
 */
export const dynamic = 'force-dynamic'; // Always check feature flag on each request

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const params = await searchParams;
  const fromEarlyAccess = params.from === 'early-access';
  
  // Check if user has waitlist token (completed waitlist)
  const cookieStore = await cookies();
  const waitlistToken = cookieStore.get('waitlist_token')?.value;
  
  // If coming from early access or has token, show welcome page for PWA install
  if (!isAppLaunched && (fromEarlyAccess || waitlistToken)) {
    // Check if early access was completed (set by useWaitlistFlow)
    // Note: This check happens on server, so we rely on query param primarily
    redirect('/welcome');
  }
  
  if (!isAppLaunched) {
    // App not launched - redirect to waitlist
    redirect('/waitlist');
  }
  
  // App launched - redirect to main app (providers page)
  redirect('/providers');
}
