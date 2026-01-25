import { redirect } from 'next/navigation';

/**
 * Waitlist landing page
 * This route is now disabled - redirects to providers page.
 * The waitlist feature has been feature-flagged off.
 */
export const dynamic = 'force-dynamic';

export default function WaitlistPage() {
  // Redirect to providers page since waitlist is disabled
  redirect('/providers');
}
