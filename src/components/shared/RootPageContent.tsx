'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { List, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAppStage } from '@/hooks/useAppStage';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
import { HomeSearchBar } from '@/features/search/components/HomeSearchBar';
import { HomeListView } from '@/features/search/components/HomeListView';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import { AboutSection } from './AboutSection';
import type { Section } from '@/config/sectionFilters';
import { DesktopWaitlistSection } from './DesktopWaitlistSection';
import { ExploreSection } from './ExploreSection';
import { LandingHero } from './LandingHero';
import { MobileSplashScreen } from './MobileSplashScreen';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { supabase } from '@/lib/supabase/client';
import { filterOpenNow } from '@/utils/filterOpenNow';
import type { OpeningHours } from '@/types/openingHours';
import type { MapPin } from '@/features/search/components/SearchMap';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHomeNearMe } from '@/features/search/hooks/useHomeNearMe';
import { HomeNearMeList } from '@/features/search/components/HomeNearMeList';
import { logApp } from '@/lib/logger';

const SearchMap = dynamic(
  () => import('@/features/search/components/SearchMap').then((mod) => mod.SearchMap),
  { ssr: false },
);

type RawCategoryRow = { name_de?: string | null; name_en?: string | null; category_images?: Record<string, unknown> | null };
type RawProviderRow = {
  provider_name?: string | null;
  opening_hours?: OpeningHours | null;
  provider_images?: string | { urls?: string[] } | null;
  address_city?: string | null;
  category_id?: string | null;
  categories?: RawCategoryRow | RawCategoryRow[] | null;
};
type RawLocationRow = {
  provider_id: string;
  location_latitude: number | null;
  location_longitude: number | null;
  providers: RawProviderRow | RawProviderRow[] | null;
};

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
  const [shouldShowCityContent, setShouldShowCityContent] = useState<boolean | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('food');
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [allRows, setAllRows] = useState<RawLocationRow[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(120);
  const geolocation = useGeolocation();

  const userCoords = useMemo(
    () =>
      geolocation.status === 'granted' && geolocation.coords
        ? { lat: geolocation.coords.latitude, lon: geolocation.coords.longitude }
        : null,
    [geolocation.status, geolocation.coords],
  );

  const homeNearMe = useHomeNearMe({
    coords: userCoords,
    enabled: viewMode === 'list',
    openNowActive: isOpenNow,
  });

  useEffect(() => {
    if (viewMode === 'list' && userCoords === null) {
      logApp('info', {
        event: 'home_list_nearme_skipped',
        status: geolocation.status,
      });
    }
  }, [viewMode, userCoords, geolocation.status]);

  const handleNearMeChange = (nextNearMe?: boolean) => {
    if (nextNearMe === false || geolocation.status === 'granted') {
      geolocation.reset();
      return;
    }
    geolocation.requestLocation();
  };

  const pins = useMemo<MapPin[]>(() => {
    const unique = new Map<string, MapPin>();
    for (const row of allRows) {
      if (row.location_latitude === null || row.location_longitude === null) continue;
      if (unique.has(row.provider_id)) continue;
      const p = Array.isArray(row.providers) ? (row.providers[0] ?? null) : row.providers;
      const rawCat = p?.categories;
      const cat = rawCat ? (Array.isArray(rawCat) ? (rawCat[0] ?? null) : rawCat) : null;
      const name = Array.isArray(row.providers)
        ? (row.providers[0]?.provider_name ?? 'Provider')
        : (row.providers?.provider_name ?? 'Provider');
      unique.set(row.provider_id, {
        providerId: row.provider_id,
        providerName: name,
        lat: Number(row.location_latitude),
        lng: Number(row.location_longitude),
        opening_hours: p?.opening_hours ?? null,
        provider_images: p?.provider_images ?? null,
        address_city: p?.address_city ?? null,
        category_id: p?.category_id ?? null,
        category: cat
          ? { name_de: cat.name_de ?? '', name_en: cat.name_en ?? undefined, category_images: cat.category_images ?? undefined }
          : undefined,
      });
    }
    return filterOpenNow(Array.from(unique.values()), isOpenNow);
  }, [allRows, isOpenNow]);

  useEffect(() => {
    const load = async () => {
      setPinsLoading(true);
      try {
        const { data } = await supabase
          .from('locations')
          .select('provider_id, location_latitude, location_longitude, providers!inner(provider_name, listing_type, review_status, opening_hours, provider_images, address_city, category_id, categories(name_de, name_en, category_images))')
          .not('location_latitude', 'is', null)
          .not('location_longitude', 'is', null)
          .eq('providers.listing_type', 'food')
          .eq('providers.review_status', 'approved');
        if (Array.isArray(data)) setAllRows(data as RawLocationRow[]);
      } finally {
        setPinsLoading(false);
      }
    };
    void load();
  }, []);

  // Get app stage to determine which content to show
  const { stage, cityName, isLoading: stageLoading } = useAppStage();
  const { t } = useLanguage();

  useEffect(() => {
    // When app is fully launched, bypass all onboarding/city gates
    const isAppLaunched = getFeatureFlag('isAppLaunched');
    if (isAppLaunched) {
      setShouldShowCityContent(true);
      return;
    }

    // Check if waitlist should be skipped
    const skipWaitlist = getFeatureFlag('skipWaitlist');

    // Check onboarding state client-side
    const onboardingState = getOnboardingState();
    const hasEarlyAccess = skipWaitlist ? true : (onboardingState?.earlyAccessUnlocked ?? false);

    // Check if city is selected
    const cityFromStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity')
        : null;

    // RECOVERY: If city is selected but onboarding state is missing
    if (!hasEarlyAccess && cityFromStorage) {
      if (skipWaitlist) {
        // When waitlist is skipped, create minimal onboarding state directly
        setOnboardingState({
          email: '',
          waitlistSubmitted: false,
          earlyAccessUnlocked: true,
          submittedAt: new Date().toISOString(),
        });
        setSelectedCity(cityFromStorage);
        setShouldShowCityContent(true);
        return;
      }

      // When waitlist is not skipped, check API (uses HTTP-only cookie)
      setIsRecovering(true);

      // Check API to restore onboarding state (API uses HTTP-only cookie, more reliable)
      fetch('/api/waitlist/status')
        .then((response) => response.json())
        .then(
          (data: {
            data?: { email?: string; selected_city?: string | null } | null;
            error?: { message: string } | null;
          }) => {
            if (data.error) {
              console.error('[RootPageContent] Recovery: API error:', data.error);
              setShouldShowCityContent(false);
              return;
            }

            if (data.data?.email) {
              // User has valid waitlist entry (via cookie) - restore onboarding state
              setOnboardingState({
                email: data.data.email,
                waitlistSubmitted: true,
                earlyAccessUnlocked: true,
                submittedAt: new Date().toISOString(),
              });
              setSelectedCity(cityFromStorage);
              setShouldShowCityContent(true);
            } else {
              // No waitlist entry found - cookie expired or user bypassed waitlist
              console.warn(
                '[RootPageContent] Recovery: No waitlist entry found. Showing onboarding.',
              );
              setShouldShowCityContent(false);
            }
          },
        )
        .catch((error) => {
          console.error('[RootPageContent] Recovery: API check failed:', error);
          // On error, show onboarding (safe fallback)
          setShouldShowCityContent(false);
        })
        .finally(() => {
          setIsRecovering(false);
        });

      return; // Wait for recovery to complete
    }

    // Show city content if user has completed onboarding
    // When skipWaitlist is true: only check for city selection (ignore earlyAccess requirement)
    // When skipWaitlist is false: require both earlyAccess and city selection
    const hasCompletedOnboarding = skipWaitlist
      ? cityFromStorage !== null
      : hasEarlyAccess && cityFromStorage !== null;

    setSelectedCity(cityFromStorage);
    setShouldShowCityContent(hasCompletedOnboarding);
  }, []);

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
                      isOpenNow={isOpenNow}
                      onNearMeChange={handleNearMeChange}
                      onOpenNowChange={setIsOpenNow}
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
                <button
                  aria-label={viewMode === 'map' ? t('map.switchToList') : t('map.switchToMap')}
                  className="fixed left-1/2 z-[500] -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-inter-tight text-sm font-semibold text-content-heading shadow-lg transition-colors hover:bg-neutral-50"
                  style={{ bottom: 'calc(64px + 1rem + max(12px, env(safe-area-inset-bottom)))' }}
                  type="button"
                  onClick={() => {
                    if (viewMode === 'map') {
                      setHeaderHeight(headerRef.current?.offsetHeight ?? 120);
                    }
                    setViewMode((v) => (v === 'map' ? 'list' : 'map'));
                  }}
                >
                  {viewMode === 'map' ? (
                    <><List aria-hidden="true" className="h-4 w-4" /><span>{t('map.listViewLabel')}</span></>
                  ) : (
                    <><MapIcon aria-hidden="true" className="h-4 w-4" /><span>{t('map.mapViewLabel')}</span></>
                  )}
                </button>
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
