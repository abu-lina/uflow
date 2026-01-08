'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { supabase } from '@/lib/supabase/client';

export type AppStage = 'stage1' | 'stage2' | 'stage3' | 'onboarding' | 'loading';

export interface AppStageData {
  stage: AppStage;
  cityName?: string;
  providerCount?: number;
  isLoading: boolean;
  error?: string;
}

/**
 * Fetch provider count for a specific city
 * Uses case-insensitive matching to handle city name variations
 */
async function fetchProviderCount(cityName: string): Promise<number> {
  // Normalize city name: trim whitespace
  const normalizedCityName = cityName.trim();
  
  // Use RPC function for case-insensitive exact matching
  const { data, error } = await supabase.rpc('get_provider_count_by_city', {
    city_name: normalizedCityName,
  });

  if (error) {
    console.error('[useAppStage] Error fetching provider count:', error);
    // Fallback to direct query if RPC fails
    const { count: fallbackCount, error: fallbackError } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'approved')
      .eq('address_city', normalizedCityName);
    
    if (fallbackError) {
      throw fallbackError;
    }
    
    console.log(`[useAppStage] Provider count for "${normalizedCityName}" (fallback): ${fallbackCount ?? 0}`);
    return fallbackCount ?? 0;
  }

  const count = typeof data === 'number' ? data : 0;
  console.log(`[useAppStage] Provider count for "${normalizedCityName}": ${count}`);
  return count;
}

/**
 * Hook to determine current app stage based on:
 * - Feature flag (isAppLaunched)
 * - Onboarding state (earlyAccessUnlocked)
 * - Selected city (localStorage)
 * - Provider count (fetched from API)
 * 
 * Stage determination flow:
 * 1. Check isAppLaunched → Stage 3 (Full Access)
 * 2. Check earlyAccessUnlocked → Continue or show onboarding
 * 3. Check selectedCity → Continue or show city selection
 * 4. Fetch provider count → Stage 1 (0-5), Stage 2 (6-14), or Stage 3 (>= 15)
 */
export function useAppStage(): AppStageData {
  const [stage, setStage] = useState<AppStage>('loading');
  const [cityName, setCityName] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  // Get onboarding state
  const onboardingState = typeof window !== 'undefined' ? getOnboardingState() : null;
  
  // Get feature flags (client-side only)
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [skipWaitlist, setSkipWaitlist] = useState(false);

  useEffect(() => {
    // Feature flags are checked client-side
    setIsAppLaunched(getFeatureFlag('isAppLaunched'));
    setSkipWaitlist(getFeatureFlag('skipWaitlist'));
  }, []);

  // When skipWaitlist is true, don't require earlyAccessUnlocked
  const earlyAccessUnlocked = skipWaitlist ? true : (onboardingState?.earlyAccessUnlocked ?? false);

  // Get selected city from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const selectedCity = localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity');
      setCityName(selectedCity || undefined);
    }
  }, []);

  // Fetch provider count if city is selected and not in Stage 3
  // When skipWaitlist is true, don't require earlyAccessUnlocked
  const { data: providerCount, isLoading: isLoadingCount, error: countError } = useQuery({
    queryKey: ['provider-count', cityName],
    queryFn: () => {
      if (!cityName) {
        throw new Error('City name is required');
      }
      return fetchProviderCount(cityName);
    },
    enabled: !!cityName && !isAppLaunched,
    staleTime: process.env.NODE_ENV === 'development' ? 10 * 1000 : 2 * 60 * 1000, // 10 seconds in dev, 2 minutes in prod
    retry: 1,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Determine stage based on all conditions
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Stage 3: Full Access (isAppLaunched = true)
    if (isAppLaunched) {
      setStage('stage3');
      setError(undefined);
      return;
    }

    // Not in early access - show onboarding (only check if waitlist is not skipped)
    if (!skipWaitlist && !earlyAccessUnlocked) {
      setStage('onboarding');
      setError(undefined);
      return;
    }

    // Early access but no city selected
    if (!cityName) {
      setStage('onboarding'); // Will show city selection
      setError(undefined);
      return;
    }

    // Early access with city selected - check provider count
    if (isLoadingCount) {
      setStage('loading');
      return;
    }

    if (countError) {
      setStage('stage1'); // Default to stage1 on error
      setError('Failed to load provider count');
      return;
    }

    // Determine Stage 1, Stage 2, or Stage 3 based on provider count
    if (providerCount !== undefined) {
      if (providerCount < 6) {
        setStage('stage1');
      } else if (providerCount < 15) {
        setStage('stage2');
      } else {
        setStage('stage3');
      }
      setError(undefined);
    }
  }, [isAppLaunched, earlyAccessUnlocked, cityName, providerCount, isLoadingCount, countError, skipWaitlist]);

  return {
    stage,
    cityName,
    providerCount,
    isLoading: stage === 'loading' || (!!cityName && !isAppLaunched && isLoadingCount),
    error,
  };
}

