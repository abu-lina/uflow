import { LandingLayout } from '@/components/layout/LandingLayout';

/**
 * Waitlist route layout
 * Minimal layout for waitlist route - no app navigation, no header/footer
 * Uses LandingLayout for consistent styling with the main landing page
 */
export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <LandingLayout>{children}</LandingLayout>;
}
