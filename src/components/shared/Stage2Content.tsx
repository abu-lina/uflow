'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CityCard } from './CityCard';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';
import { useSearch } from '@/providers/search-provider';

interface Stage2ContentProps {
  cityName: string;
}

/**
 * Stage 2 Content Component (6-14 providers)
 * 
 * Displays:
 * 1. CityCard at the top (centered)
 * 2. Provider list below (filtered by city)
 * 
 * This replaces the empty state for cities with 6-14 providers.
 */
export function Stage2Content({ cityName }: Stage2ContentProps) {
  const router = useRouter();
  const { setSelectedLocation } = useSearch();

  // Initialize search context with city location
  useEffect(() => {
    setSelectedLocation(cityName);
  }, [cityName, setSelectedLocation]);

  const handleSuggestProvider = () => {
    router.push('/create/recommend');
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-uflow-light">
      {/* City Card - Centered at top with header spacing */}
      {/* 
        Header structure:
        - paddingTop: max(24px, calc(env(safe-area-inset-top) + 24px))
        - py-4 top: 16px
        - Content (MobileGreetingHeader): ~70px (two lines of text)
        - py-4 bottom: 16px
        - Total: max(126px, calc(env(safe-area-inset-top) + 126px))
        - Add 8px gap for visual spacing: max(134px, calc(env(safe-area-inset-top) + 134px))
      */}
      <div className="flex w-full items-center justify-center px-4 pt-[max(134px,calc(env(safe-area-inset-top)+134px))] pb-8">
        <CityCard cityName={cityName} onSuggestProvider={handleSuggestProvider} />
      </div>

      {/* Provider List - Below card with gap-8 spacing */}
      <ProvidersContent defaultLocation={cityName} showGreeting={true} />
    </div>
  );
}
