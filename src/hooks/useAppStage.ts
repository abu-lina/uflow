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
 */
async function fetchProviderCount(cityName: string): Promise<number> {
  // #region agent log
  console.log('[DEBUG] fetchProviderCount called', { cityName });
  fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAppStage.ts:22',message:'fetchProviderCount called',data:{cityName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Debug: Check what providers exist for this city
  const { data: allProviders, error: debugError } = await supabase
    .from('providers')
    .select('provider_id, provider_name, address_city, review_status')
    .eq('address_city', cityName);
  
  // #region agent log
  const providerStatuses = allProviders?.map(p => ({ 
    id: p.provider_id, 
    name: p.provider_name, 
    status: p.review_status,
    city: p.address_city 
  })) || [];
  const approvedCount = providerStatuses.filter(p => p.status === 'approved').length;
  const pendingCount = providerStatuses.filter(p => p.status === 'pending').length;
  console.log('[DEBUG] All providers for city', { 
    cityName, 
    totalProviders: allProviders?.length,
    approvedCount,
    pendingCount,
    providers: providerStatuses,
    debugError: debugError?.message 
  });
  fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAppStage.ts:26',message:'All providers for city',data:{cityName,totalProviders:allProviders?.length,approvedCount,pendingCount,providers:providerStatuses,debugError:debugError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Also fetch approved providers separately to debug
  const { data: approvedProviders, error: approvedError } = await supabase
    .from('providers')
    .select('provider_id, provider_name, address_city, review_status')
    .eq('review_status', 'approved')
    .eq('address_city', cityName);
  
  const { count, error } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'approved')
    .eq('address_city', cityName);

  // #region agent log
  console.log('[DEBUG] fetchProviderCount result', { 
    cityName, 
    count, 
    approvedProvidersCount: approvedProviders?.length,
    approvedProviders: approvedProviders?.map(p => ({ id: p.provider_id, name: p.provider_name, city: p.address_city, status: p.review_status })),
    error: error?.message,
    approvedError: approvedError?.message
  });
  fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAppStage.ts:50',message:'fetchProviderCount result',data:{cityName,count,approvedProvidersCount:approvedProviders?.length,approvedProviders:approvedProviders?.map(p=>({id:p.provider_id,name:p.provider_name,city:p.address_city,status:p.review_status})),error:error?.message,approvedError:approvedError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('[useAppStage] Error fetching provider count:', error);
    throw error;
  }

  return count ?? 0;
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
      // #region agent log
      console.log('[DEBUG] City name from storage', { selectedCity });
      fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAppStage.ts:72',message:'City name from storage',data:{selectedCity},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
    staleTime: process.env.NODE_ENV === 'development' ? 30 * 1000 : 5 * 60 * 1000, // 30 seconds in dev, 5 minutes in prod
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
      const newStage = providerCount < 6 ? 'stage1' : providerCount < 15 ? 'stage2' : 'stage3';
      // #region agent log
      console.log('[DEBUG] Stage calculation', { providerCount, cityName, calculatedStage: newStage, currentStage: stage, willChange: newStage !== stage });
      fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAppStage.ts:134',message:'Stage calculation',data:{providerCount,cityName,calculatedStage:newStage,currentStage:stage,willChange:newStage !== stage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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

