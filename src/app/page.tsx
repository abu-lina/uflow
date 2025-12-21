import { redirect } from 'next/navigation';
import { getFeatureFlag } from '@/config/feature-flags';

/**
 * Root page - redirects based on app launch status
 * 
 * When app is not launched (isAppLaunched = false):
 *   - Redirects to /waitlist (dedicated waitlist route)
 * 
 * When app is launched (isAppLaunched = true):
 *   - Redirects to /providers (main app page)
 */
export const dynamic = 'force-dynamic'; // Always check feature flag on each request

export default function Home() {
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  
  if (!isAppLaunched) {
    // App not launched - redirect to waitlist
    redirect('/waitlist');
  }
  
  // App launched - redirect to main app (providers page)
  redirect('/providers');
}
