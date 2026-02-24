'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CityEarlyAccessEmptyState } from '@/components/shared/CityEarlyAccessEmptyState';
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
import { Stage2Content } from '@/components/shared/Stage2Content';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';
import { supabase } from '@/lib/supabase/client';

interface CityData {
  id?: string;
  city_name: string;
  country?: string;
  provider_count: number;
  is_unlocked?: boolean;
}

type AppStage = 'stage1' | 'stage2' | 'stage3';

/**
 * City Page - Stage-Based Content Rendering
 *
 * Displays content based on provider count:
 * - Stage 1 (0-5 providers): CityEarlyAccessEmptyState
 * - Stage 2 (6-14 providers): Stage2Content
 * - Stage 3 (15+ providers): CategoryGallerySection with header
 *
 * For cities not found in database, queries providers directly and defaults to Stage 1.
 */
export default function CityPage() {
  const params = useParams();
  const router = useRouter();
  const cityName = decodeURIComponent(params.cityName as string);

  const [cityData, setCityData] = useState<CityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<AppStage>('stage1');

  // Store selected city and dispatch event when city is loaded
  useEffect(() => {
    if (cityName && cityData) {
      // Store selected city in localStorage/sessionStorage
      try {
        sessionStorage.setItem('selectedCity', cityName);
        localStorage.setItem('selectedCity', cityName);

        // Dispatch custom event to notify useAppStage hook immediately
        window.dispatchEvent(new CustomEvent('city-selected', { detail: { cityName } }));
      } catch (err) {
        console.error('[City Page] Failed to store city:', err);
      }
    }
  }, [cityName, cityData]);

  // Determine stage based on provider count
  useEffect(() => {
    if (cityData) {
      const count = cityData.provider_count;
      if (count < 6) {
        setStage('stage1');
      } else if (count < 15) {
        setStage('stage2');
      } else {
        setStage('stage3');
      }
    }
  }, [cityData]);

  // Fetch city data and provider count
  useEffect(() => {
    async function fetchCityData() {
      try {
        setIsLoading(true);
        setError(null);

        // First, try to fetch city from database
        const { data: cities, error: citiesError } = await supabase
          .from('cities')
          .select('id, city_name, country, is_unlocked')
          .eq('city_name', cityName)
          .maybeSingle();

        if (citiesError) {
          console.error('[City Page] Error fetching city:', citiesError);
          // Continue to query providers directly even if city table query fails
        }

        // Get provider count for this city (query providers table directly)
        // Use RPC function for case-insensitive matching if available, otherwise fallback
        let providerCount = 0;

        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            'get_provider_count_by_city',
            {
              city_name: cityName.trim(),
            },
          );

          if (!rpcError && typeof rpcData === 'number') {
            providerCount = rpcData;
          } else {
            // Fallback to direct query
            const { count, error: providersError } = await supabase
              .from('providers')
              .select('*', { count: 'exact', head: true })
              .eq('review_status', 'approved')
              .eq('address_city', cityName);

            if (providersError) {
              console.error('[City Page] Error fetching provider count:', providersError);
              providerCount = 0;
            } else {
              providerCount = count || 0;
            }
          }
        } catch (countError) {
          console.error('[City Page] Error fetching provider count:', countError);
          providerCount = 0;
        }

        // If city exists in database, use that data
        if (cities) {
          const cityWithCount: CityData = {
            ...cities,
            provider_count: providerCount,
          };
          setCityData(cityWithCount);
        } else {
          // City not in database - create minimal city data (defaults to Stage 1)
          const cityWithCount: CityData = {
            city_name: cityName,
            provider_count: providerCount,
          };
          setCityData(cityWithCount);
        }
      } catch (err) {
        console.error('[City Page] Unexpected error:', err);
        setError('An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    if (cityName) {
      fetchCityData();
    }
  }, [cityName]);

  // Handle subscribe to updates
  const handleReceiveUpdates = async () => {
    try {
      const email =
        sessionStorage.getItem('waitlistEmail') || localStorage.getItem('waitlistEmail') || '';
      const waitlistToken =
        sessionStorage.getItem('waitlistToken') || localStorage.getItem('waitlistToken') || '';

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
    } catch (err) {
      console.error('[City Page] Failed to subscribe:', err);
      throw err;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-uflow-light">
        <div className="text-content-muted">Loading...</div>
      </div>
    );
  }

  // Error state - only show if there's a critical error (not just city not found)
  if (error && !cityData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-uflow-light">
        <div className="text-content-heading">{error}</div>
        <button
          className="mt-4 text-primary hover:underline"
          onClick={() => router.push('/city-selection')}
        >
          Back to city selection
        </button>
      </div>
    );
  }

  // If no city data but no error, show loading (shouldn't happen, but safe fallback)
  if (!cityData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-uflow-light">
        <div className="text-content-muted">Loading...</div>
      </div>
    );
  }

  // Render stage-based content
  // Stage 1: Early Access Empty State (0-5 providers)
  if (stage === 'stage1') {
    return (
      <>
        <CityEarlyAccessEmptyState
          cityName={cityData.city_name}
          country={cityData.country}
          onReceiveUpdates={handleReceiveUpdates}
        />
        <div className="block md:hidden">
          <CityEarlyAccessNavbar />
        </div>
      </>
    );
  }

  // Stage 2: City Card + Provider List (6-14 providers)
  if (stage === 'stage2') {
    return <Stage2Content cityName={cityData.city_name} />;
  }

  // Stage 3: Category Gallery (15+ providers)
  if (stage === 'stage3') {
    return (
      <div className="flex min-h-screen w-full flex-col bg-uflow-light">
        {/* Greeting Header - Fixed at top (matches Stage 2 style) */}
        <header
          className="fixed left-0 right-0 top-0 z-50 sm:hidden"
          style={{
            // Smooth transition for all properties including backdrop-filter
            transition:
              'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
            // Glassy blur effect - always applied for consistent visual effect
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
            isolation: 'isolate',
            marginLeft: '-1px',
            marginRight: '-1px',
            paddingLeft: '1px',
            paddingRight: '1px',
          }}
        >
          <div
            className="px-6 py-4 text-left"
            style={{
              // Add safe area padding to content, not header background
              // Use max() to ensure minimum 24px padding on devices without safe area (like iPhone SE)
              paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
            }}
          >
            <div className="max-w-72">
              <MobileGreetingHeader cityName={cityData.city_name} />
            </div>
          </div>
        </header>

        {/* Category Gallery - Below header with proper spacing */}
        {/* 
          Spacing breakdown for visual 32px gap:
          - Header top padding: max(24px, env(safe-area-inset-top) + 24px)
          - Header content height: ~69px (greeting + support text)
          - Header bottom padding: 16px (py-4 bottom)
          - Visual gap: 32px
          Using max() to ensure minimum 141px for devices without safe area
        */}
        <div className="w-full px-6 pt-[max(141px,calc(env(safe-area-inset-top)+141px))]">
          <CategoryGallerySection />
        </div>
      </div>
    );
  }

  // Fallback to Stage 1 (should not happen)
  return (
    <>
      <CityEarlyAccessEmptyState
        cityName={cityData.city_name}
        country={cityData.country}
        onReceiveUpdates={handleReceiveUpdates}
      />
      <div className="block md:hidden">
        <CityEarlyAccessNavbar />
      </div>
    </>
  );
}
