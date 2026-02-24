'use client';

import { useEffect } from 'react';
import { useAppStage } from '@/hooks/useAppStage';
import { CityEarlyAccessEmptyState } from '@/components/shared/CityEarlyAccessEmptyState';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';
import { useSearch } from '@/providers/search-provider';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

/**
 * Stage2ProvidersContent Wrapper Component
 *
 * Initializes search context with city location for Stage 2.
 * This ensures the search bar and filters show the correct city.
 */
function Stage2ProvidersContent({ cityName }: { cityName: string }) {
  const { setSelectedLocation } = useSearch();

  useEffect(() => {
    // Initialize search context with city location
    setSelectedLocation(cityName);
  }, [cityName, setSelectedLocation]);

  return <ProvidersContent defaultLocation={cityName} />;
}

/**
 * HomePageShell Component
 *
 * @deprecated This component is no longer used in the main routing flow.
 * City content is now rendered directly in RootPageContent.
 *
 * Previously handled different home experiences based on app stage:
 * - Stage 1: City early access empty state (no providers)
 * - Stage 2: Providers listing filtered by city (rendered on root, no redirect)
 * - Stage 3: Category gallery (full access)
 *
 * Keep this file for now as reference or potential future use.
 */
export function HomePageShell() {
  const { stage, cityName, isLoading, error } = useAppStage();

  // Loading state
  if (isLoading || stage === 'loading') {
    return (
      <div className="h-full flex w-full flex-col items-center justify-center bg-uflow-light">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex w-full flex-col items-center justify-center bg-uflow-light">
        <div className="text-content-heading">{error}</div>
      </div>
    );
  }

  // Stage 1: Early Access (No Providers)
  // Note: If cityName is not available, we can't show Stage 1 content
  // This should be handled by the parent (RootPageContent) showing waitlist
  // CityEarlyAccessNavbar is handled by RootClientLayout
  if (stage === 'stage1') {
    if (!cityName) {
      return null; // Let parent handle (show waitlist or city selection)
    }
    return (
      <CityEarlyAccessEmptyState
        cityName={cityName}
        onReceiveUpdates={async () => {
          // Handle subscribe to updates
          try {
            const onboardingState =
              typeof window !== 'undefined'
                ? await import('@/lib/utils/onboarding-state').then((m) => m.getOnboardingState())
                : null;
            const email = onboardingState?.email || '';
            const waitlistToken = onboardingState?.waitlistToken || '';

            if (!email) {
              throw new Error('Email not found');
            }

            const response = await fetch('/api/waitlist/subscribe-city', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                cityName,
                waitlistToken: waitlistToken || undefined,
              }),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
              throw new Error(result.error?.message || 'Failed to subscribe');
            }

            // Store selected city
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('selectedCity', cityName);
              localStorage.setItem('selectedCity', cityName);

              // Dispatch custom event to notify useAppStage hook immediately
              window.dispatchEvent(new CustomEvent('city-selected', { detail: { cityName } }));
            }
          } catch (err) {
            console.error('[HomePageShell] Failed to subscribe:', err);
            throw err;
          }
        }}
      />
    );
  }

  // Stage 2: Early Access (With Providers) - Render directly on root
  // CityEarlyAccessNavbar is handled by RootClientLayout
  if (stage === 'stage2' && cityName) {
    return <Stage2ProvidersContent cityName={cityName} />;
  }

  // Stage 3: Full Access - Category Gallery
  if (stage === 'stage3') {
    return (
      <div className="min-h-screen w-full bg-uflow-light">
        {/* Add proper spacing for home page */}
        <div className="pt-safe-top">
          <CategoryGallerySection />
        </div>
      </div>
    );
  }

  // Onboarding or unknown stage - return null (parent will handle)
  return null;
}
