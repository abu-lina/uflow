'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { CityListItem } from '@/components/shared/CityListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLanguage } from '@/providers/LanguageProvider';

interface CityData {
  id: string;
  city_name: string;
  country: string;
  is_unlocked: boolean;
  interest_count: number;
}

interface CitiesResponse {
  data: CityData[] | null;
  error: { message: string } | null;
}

/**
 * City Selection Page
 * 
 * Full-page experience for selecting a city of interest.
 * Shows community interest counts (not provider counts).
 * 
 * Features:
 * - Back navigation to Early Access screen
 * - Search functionality with debounce
 * - City list with interest counts
 * - Loading and error states
 * - Toast confirmations
 * - Mobile-first responsive design
 */
export default function CitySelectionPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<CityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get email and token from sessionStorage
  const [email, setEmail] = useState<string>('');
  const [waitlistToken, setWaitlistToken] = useState<string>('');
  const [previousCity, setPreviousCity] = useState<string | null>(null);

  // Load email, token, and previous city from sessionStorage
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('waitlistEmail') || '';
    const storedToken = sessionStorage.getItem('waitlistToken') || '';
    const storedCity = sessionStorage.getItem('selectedCity');
    
    setEmail(storedEmail);
    setWaitlistToken(storedToken);
    setPreviousCity(storedCity);
  }, []);

  // Fetch cities on mount
  useEffect(() => {
    async function fetchCities() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/cities');
        const data: CitiesResponse = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error?.message || 'Failed to fetch cities');
        }

        setCities(data.data || []);
      } catch (err) {
        console.error('[City Selection] Failed to fetch cities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cities');
        toast.error(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchCities();
  }, [t]);

  // Filter cities by search query (memoized)
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return cities;
    }
    
    const query = searchQuery.toLowerCase();
    return cities.filter((city) =>
      city.city_name.toLowerCase().includes(query) ||
      city.country.toLowerCase().includes(query)
    );
  }, [cities, searchQuery]);

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Handle city selection
  const handleCitySelect = async (city: CityData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        email,
        selected_city: city.city_name,
      };
      
      // Only include token if provided (otherwise API will use cookie)
      if (waitlistToken) {
        body.waitlistToken = waitlistToken;
      }
      
      // Update waitlist entry with selected city
      const response = await fetch('/api/waitlist/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update city preference');
      }

      // Store selected city in sessionStorage
      sessionStorage.setItem('selectedCity', city.city_name);
      sessionStorage.setItem('interestCount', String(city.interest_count));

      // Show appropriate toast
      const isUpdate = previousCity && previousCity !== city.city_name;
      const toastMessage = isUpdate
        ? t('waitlist.citySelection.updateToast').replace('{{city}}', city.city_name)
        : t('waitlist.citySelection.confirmToast').replace('{{city}}', city.city_name);
      
      toast.success(toastMessage, {
        duration: 3000,
      });

      // Navigate back to Early Access screen
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (err) {
      console.error('[City Selection] Failed to save:', err);
      toast.error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry on error
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header with back button */}
      <div className="pt-[env(safe-area-inset-top)] px-4 py-4 border-b border-border-light">
        <Button
          aria-label={t('waitlist.citySelection.backButton')}
          disabled={isSubmitting}
          icon="material-symbols:arrow-back-rounded"
          size="sm"
          variant="ghost"
          onClick={handleBack}
        >
          {t('waitlist.citySelection.backButton')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 pb-[env(safe-area-inset-bottom)]">
        {/* Title and supporting text */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 py-6"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="font-inter-tight text-2xl font-semibold leading-tight text-content-heading">
            {t('waitlist.citySelection.title')}
          </h1>
          <p className="font-inter text-base leading-normal text-content">
            {t('waitlist.citySelection.supportingText')}
          </p>
        </motion.div>

        {/* Search input */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        >
          <FormInput
            autoFocus
            aria-label={t('waitlist.citySelection.searchPlaceholder')}
            disabled={isSubmitting || isLoading}
            label={t('waitlist.citySelection.searchPlaceholder')}
            placeholder={t('waitlist.citySelection.searchPlaceholder')}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        {/* Cities list */}
        <motion.div
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col gap-3 pb-6"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        >
          {isLoading ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Icon
                  className="animate-spin text-primary"
                  height={32}
                  icon="material-symbols:progress-activity"
                  width={32}
                />
                <p className="text-content-muted">{t('common.loading')}</p>
              </div>
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center">
              <EmptyState
                description={error}
                icon={
                  <Icon
                    className="text-danger"
                    height={48}
                    icon="material-symbols:error-outline-rounded"
                    width={48}
                  />
                }
                title={t('common.error')}
              />
              <Button
                className="mt-4"
                icon="material-symbols:refresh-rounded"
                variant="primary"
                onClick={handleRetry}
              >
                {t('common.retry')}
              </Button>
            </div>
          ) : filteredCities.length === 0 ? (
            // Empty state (no results)
            <EmptyState
              description={
                searchQuery
                  ? t('waitlist.citySelection.noResults')
                  : 'No cities available'
              }
              icon={
                <Icon
                  className="text-content-muted"
                  height={48}
                  icon="material-symbols:location-city-rounded"
                  width={48}
                />
              }
              title={searchQuery ? 'No matches' : 'No cities found'}
            />
          ) : (
            // Cities list
            <div className="flex flex-col gap-3">
              {filteredCities.map((city, index) => (
                <motion.div
                  key={city.id}
                  animate={{ opacity: 1, x: 0 }}
                  initial={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <CityListItem
                    cityName={city.city_name}
                    disabled={isSubmitting}
                    interestCount={city.interest_count}
                    isUnlocked={city.is_unlocked}
                    onClick={() => handleCitySelect(city)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

