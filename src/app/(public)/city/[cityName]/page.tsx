'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CityEarlyAccessEmptyState } from '@/components/shared/CityEarlyAccessEmptyState';
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
import { supabase } from '@/lib/supabase/client';

interface CityData {
  id: string;
  city_name: string;
  country: string;
  provider_count: number;
  is_unlocked: boolean;
}

/**
 * City Early Access Page
 * 
 * Displays early access empty state if provider_count < 6,
 * otherwise redirects to providers page.
 */
export default function CityPage() {
  const params = useParams();
  const router = useRouter();
  const cityName = decodeURIComponent(params.cityName as string);
  
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch city data
  useEffect(() => {
    async function fetchCityData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch city from database
        const { data: cities, error: citiesError } = await supabase
          .from('cities')
          .select('id, city_name, country, is_unlocked')
          .eq('city_name', cityName)
          .maybeSingle();

        if (citiesError) {
          console.error('[City Page] Error fetching city:', citiesError);
          setError('Failed to load city data');
          return;
        }

        if (!cities) {
          setError('City not found');
          return;
        }

        // Get provider count for this city
        const { count: providerCount, error: providersError } = await supabase
          .from('providers')
          .select('*', { count: 'exact', head: true })
          .eq('review_status', 'approved')
          .eq('address_city', cityName);

        if (providersError) {
          console.error('[City Page] Error fetching provider count:', providersError);
          // Continue with 0 count if error
        }

        const finalProviderCount = providerCount || 0;

        const cityWithCount: CityData = {
          ...cities,
          provider_count: finalProviderCount,
        };

        setCityData(cityWithCount);

        // Note: No auto-redirect here - this page serves as direct city access.
        // Root page (/) shows city content after onboarding is complete.
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
  }, [cityName, router]);

  // Handle subscribe to updates
  const handleReceiveUpdates = async () => {
    try {
      const email = sessionStorage.getItem('waitlistEmail') || localStorage.getItem('waitlistEmail') || '';
      const waitlistToken = sessionStorage.getItem('waitlistToken') || localStorage.getItem('waitlistToken') || '';

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
      sessionStorage.setItem('selectedCity', cityName);
      localStorage.setItem('selectedCity', cityName);
    } catch (err) {
      console.error('[City Page] Failed to subscribe:', err);
      throw err;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-uflow-light">
        <div className="text-content-muted">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error || !cityData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-uflow-light">
        <div className="text-content-heading">{error || 'City not found'}</div>
        <button
          className="mt-4 text-primary hover:underline"
          onClick={() => router.push('/city-selection')}
        >
          Back to city selection
        </button>
      </div>
    );
  }

  // Show early access empty state
  return (
    <>
      <CityEarlyAccessEmptyState
        cityName={cityData.city_name}
        country={cityData.country}
        onReceiveUpdates={handleReceiveUpdates}
      />
      <CityEarlyAccessNavbar />
    </>
  );
}

