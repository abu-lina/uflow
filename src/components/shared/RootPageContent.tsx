'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAppStage } from '@/hooks/useAppStage';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
import { HomeSearchBar } from '@/features/search/components/HomeSearchBar';
import { HomeListView } from '@/features/search/components/HomeListView';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import { AdminStatusFilter, type ReviewStatusFilter } from '@/features/admin/components/AdminStatusFilter';
import { AboutSection } from './AboutSection';
import type { Section } from '@/config/sectionFilters';
import { DesktopWaitlistSection } from './DesktopWaitlistSection';
import { ExploreSection } from './ExploreSection';
import { LandingHero } from './LandingHero';
import { MobileSplashScreen } from './MobileSplashScreen';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapDiscovery } from '@/features/search/hooks/useMapDiscovery';
import { ViewToggleButton } from '@/features/search/components/ViewToggleButton';
import { useNearMe } from '@/features/search/hooks/useNearMe';
import { HomeNearMeList } from '@/features/search/components/HomeNearMeList';
import { logApp } from '@/lib/logger';

const SearchMap = dynamic(
  () => import('@/features/search/components/SearchMap').then((mod) => mod.SearchMap),
  { ssr: false },
);

/**
 * RootPageContent Component
 *
 * Client component that conditionally renders based on device type and app stage:
 *
 * Desktop (md: and above):
 * - Always shows landing page content (LandingHero, AboutSection, ExploreSection)
 * - City stage does not affect desktop view
 *
 * Mobile (below md:):
 * - Stage 1 (0-5 providers): CityEarlyAccessEmptyState
 * - Stage 2 (6-14 providers): Unified discovery home (search + tabs + section galleries)
 * - Stage 3 (15+ providers): Unified discovery home (search + tabs + section galleries)
 * - Onboarding: Waitlist/onboarding content (MobileSplashScreen)
 *
 * Onboarding is complete when:
 * 1. earlyAccessUnlocked = true (user has joined waitlist)
 * 2. A city is selected (stored in localStorage/sessionStorage)
 *
 * This ensures proper client-side state checking and conditional rendering.
 */
export function RootPageContent() {
  const { ready: shouldShowCityContent, city: selectedCity, isRecovering } = useOnboardingGate();
  const { isAdmin } = useIsAdmin();
  const [activeSection, setActiveSection] = useState<Section>('food');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [adminStatus, setAdminStatus] = useState<ReviewStatusFilter>(null);

  const geolocation = useGeolocation();

  // Shared map/discovery state: pins, view mode, open-now, header metrics
  const {
    pins, pinsLoading, isOpenNow, setIsOpenNow, viewMode,
    toggleViewMode, headerRef, headerHeight, userCoords,
  } = useMapDiscovery(geolocation, 'map', isAdmin ? adminStatus : null);

  const homeNearMe = useNearMe({
    coords: userCoords,
    active: nearMeActive && viewMode === 'list',
    openNow: isOpenNow,
    radiusKm: 25,
    reviewStatus: isAdmin ? adminStatus : null,
  });

  useEffect(() => {
    if (viewMode === 'list' && userCoords === null) {
      logApp('info', {
        event: 'home_list_nearme_skipped',
        status: geolocation.status,
      });
    }
  }, [viewMode, userCoords, geolocation.status]);

  const handleToggleNearMe = useCallback(() => {
    if (nearMeActive || geolocation.status === 'granted') {
      setNearMeActive(false);
      geolocation.reset();
      return;
    }
    setNearMeActive(true);
    geolocation.requestLocation();
  }, [nearMeActive, geolocation]);

  // Get app stage to determine which content to show
  const { stage, cityName, isLoading: stageLoading } = useAppStage();

  // Wait for client-side check or recovery to complete
  if (shouldShowCityContent === null || isRecovering || stageLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton animate={false} className="h-8 w-48" />
          <Skeleton animate={false} className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Handle receive updates subscription (used for mobile stage-based content)
  const handleReceiveUpdates = async () => {
    try {
      const onboardingState = getOnboardingState();
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
          cityName: selectedCity,
          waitlistToken: waitlistToken || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || 'Failed to subscribe');
      }

      toast.success(`You'll receive updates about ${selectedCity}!`);
    } catch (err) {
      console.error('[RootPageContent] Failed to subscribe:', err);
      toast.error('Failed to subscribe. Please try again.');
      throw err;
    }
  };

  // Render content based on app stage
  // Use cityName from useAppStage hook (more reliable than selectedCity state)
  const displayCity = cityName || selectedCity;

  // Desktop: Always show landing page content regardless of city stage
  // Mobile: Show stage-based content if onboarding complete, otherwise show waitlist
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const skipWaitlist = getFeatureFlag('skipWaitlist');
  return (
    <>
      {/* Desktop Landing Content - Always shown for desktop users */}
      <div className="relative z-10 hidden md:block">
        <LandingHero />
        <AboutSection />
        {/* Only show waitlist section when app is not launched AND waitlist is not skipped */}
        {!isAppLaunched && !skipWaitlist && <DesktopWaitlistSection />}
        <ExploreSection />
      </div>

      {/* Mobile Content - Stage-based or waitlist based on onboarding state */}
      {/* flex flex-1 flex-col: propagate height from PageTransition so splash centering works (Plan 028) */}
      <div className="flex flex-1 flex-col md:hidden">
        {shouldShowCityContent && displayCity ? (
          // Mobile: Show stage-based content when onboarding is complete
          <>
            {/* Stage 1: Early Access Empty State (0-5 providers) */}
            {stage === 'stage1' && (
              <CityEarlyAccessEmptyState
                cityName={displayCity}
                onReceiveUpdates={handleReceiveUpdates}
              />
            )}

            {/* Stage 2/3: Category Discovery Home */}
            {(stage === 'stage2' || stage === 'stage3') && (
              <div className="flex min-h-screen w-full flex-col bg-uflow-light">
                {/* Fixed header: search bar only */}
                <header
                  ref={headerRef}
                  className="fixed left-0 right-0 top-0 z-50 sm:hidden"
                  style={{
                    transition:
                      'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: viewMode === 'list' ? 'blur(20px) saturate(180%)' : 'blur(1.5px)',
                    WebkitBackdropFilter: viewMode === 'list' ? 'blur(20px) saturate(180%)' : 'blur(1.5px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
                    isolation: 'isolate',
                    marginLeft: '-1px',
                    marginRight: '-1px',
                    paddingLeft: '1px',
                    paddingRight: '1px',
                  }}
                >
                  <div
                    className="px-4 pb-3"
                    style={{
                      paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
                    }}
                  >
                    <div className="pb-3">
                      <SectionSelector
                        selectedSection={activeSection}
                        onSectionChange={setActiveSection}
                      />
                    </div>
                    <HomeSearchBar
                      activeSection={activeSection}
                      geoStatus={geolocation.status}
                      nearMeActive={nearMeActive}
                      isOpenNow={isOpenNow}
                      onToggleNearMe={handleToggleNearMe}
                      onToggleOpenNow={() => setIsOpenNow((v) => !v)}
                      adminSlot={
                        isAdmin ? (
                          <AdminStatusFilter selectedStatus={adminStatus} onStatusChange={setAdminStatus} />
                        ) : undefined
                      }
                    />
                  </div>
                </header>

                <div
                  style={{
                    visibility: viewMode === 'map' ? 'visible' : 'hidden',
                    position: 'absolute',
                    inset: 0,
                  }}
                >
                  <SearchMap
                    pins={pins}
                    userCoords={userCoords}
                  />
                </div>

                {viewMode === 'list' && (
                  homeNearMe.isActive ? (
                    <HomeNearMeList
                      error={homeNearMe.error}
                      headerOffset={headerHeight}
                      isLoading={homeNearMe.isLoading}
                      results={homeNearMe.results}
                      onRetry={homeNearMe.refetch}
                    />
                  ) : (
                    <HomeListView
                      headerOffset={headerHeight}
                      isLoading={pinsLoading}
                      isOpenNow={isOpenNow}
                      pins={pins}
                    />
                  )
                )}

                {/* Toggle button: map ↔ list, sits above navbar */}
                <ViewToggleButton viewMode={viewMode} onToggle={toggleViewMode} />
              </div>
            )}

            {/* Show loading state while stage is being determined */}
            {stage === 'loading' && (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            )}

            {/* Fallback: Show Stage 1 if stage is not determined yet */}
            {stage !== 'stage1' &&
              stage !== 'stage2' &&
              stage !== 'stage3' &&
              stage !== 'loading' && (
                <CityEarlyAccessEmptyState
                  cityName={displayCity}
                  onReceiveUpdates={handleReceiveUpdates}
                />
              )}
          </>
        ) : (
          // Mobile: Show waitlist/onboarding content if onboarding is not complete
          <MobileSplashScreen />
        )}
      </div>
    </>
  );
}
