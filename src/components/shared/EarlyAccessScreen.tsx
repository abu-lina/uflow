'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';

interface EarlyAccessScreenProps {
  email: string;
  waitlistToken: string; // Can be empty string if token is in HTTP-only cookie
  onComplete: () => void;
  onSuggestProvider: () => void;
  onSelectCity: () => void;
  onLearnMore: () => void;
}

interface SelectedCityData {
  cityName: string;
  interestCount: number;
}

export function EarlyAccessScreen({
  email,
  waitlistToken,
  onComplete,
  onSuggestProvider,
  onSelectCity,
  onLearnMore,
}: EarlyAccessScreenProps) {
  const { t } = useLanguage();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCity, setSelectedCity] = useState<SelectedCityData | null>(null);
  const [isLoadingCity, setIsLoadingCity] = useState(true);

  // Mark as seen when component mounts (only once)
  useEffect(() => {
    const markAsSeen = async () => {
      try {
        const body: Record<string, unknown> = {
          email,
          has_seen_early_access: true,
        };
        
        if (waitlistToken) {
          body.waitlistToken = waitlistToken;
        }
        
        await fetch('/api/waitlist/update', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        console.log('[Early Access] Marked as seen:', email);
      } catch (error) {
        console.error('[Early Access] Failed to mark as seen:', error);
        // Don't block rendering on error
      }
    };
    
    markAsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run once on mount (email and waitlistToken are stable props)

  // Fetch selected city from sessionStorage or API
  useEffect(() => {
    async function loadSelectedCity() {
      // First try sessionStorage for instant feedback
      const storedCity = sessionStorage.getItem('selectedCity');
      const storedCount = sessionStorage.getItem('interestCount');
      
      if (storedCity && storedCount) {
        setSelectedCity({
          cityName: storedCity,
          interestCount: parseInt(storedCount, 10) || 0,
        });
      }

      // Then fetch from API to get latest data
      try {
        const response = await fetch('/api/waitlist/status');
        const data = await response.json();

        if (data.data?.selected_city) {
          // Fetch interest count for this city
          const citiesResponse = await fetch('/api/cities');
          const citiesData = await citiesResponse.json();
          
          if (citiesData.data) {
            const cityData = citiesData.data.find(
              (c: { city_name: string }) => c.city_name === data.data.selected_city
            );
            
            if (cityData) {
              const cityInfo = {
                cityName: cityData.city_name,
                interestCount: cityData.interest_count || 0,
              };
              
              setSelectedCity(cityInfo);
              
              // Update sessionStorage
              sessionStorage.setItem('selectedCity', cityInfo.cityName);
              sessionStorage.setItem('interestCount', String(cityInfo.interestCount));
            }
          }
        } else {
          // No city selected - clear sessionStorage
          sessionStorage.removeItem('selectedCity');
          sessionStorage.removeItem('interestCount');
          setSelectedCity(null);
        }
      } catch (error) {
        console.error('[Early Access] Failed to load city:', error);
        // Keep showing sessionStorage data if API fails
      } finally {
        setIsLoadingCity(false);
      }
    }

    loadSelectedCity();
  }, []);

  const updateWaitlistEntry = async (updates: {
    has_seen_early_access?: boolean;
    skipped_early_access?: boolean;
  }) => {
    setIsUpdating(true);
    
    try {
      const body: Record<string, unknown> = {
        email,
        ...updates,
      };
      
      // Only include token if provided (otherwise API will use cookie)
      if (waitlistToken) {
        body.waitlistToken = waitlistToken;
      }
      
      const response = await fetch('/api/waitlist/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update waitlist entry');
      }
    } catch (error) {
      console.error('[Early Access] Failed to update:', error);
      // Don't block user flow on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuggestProvider = () => {
    onSuggestProvider();
  };

  const handleSelectCity = () => {
    onSelectCity();
  };

  const handleLearnMore = () => {
    onLearnMore();
  };

  const handleSkip = async () => {
    // Still need to mark as skipped
    await updateWaitlistEntry({ skipped_early_access: true });
    onComplete();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* UFlow Logo */}
        <motion.div
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <Image
            alt="UFlow Logo"
            className="h-24 w-24 rounded-full"
            height={96}
            src="/icons/icon-round-512.png"
            width={96}
          />
        </motion.div>

        {/* Heading */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        >
          <h1 className="font-inter-tight text-3xl font-semibold leading-tight text-content-heading sm:text-4xl">
            {t('waitlist.earlyAccess.title')}
          </h1>
          <p className="font-inter text-base leading-normal text-content sm:text-lg whitespace-pre-line">
            {t('waitlist.earlyAccess.description')}
          </p>
        </motion.div>

        {/* Your City Section (conditionally rendered) */}
        {!isLoadingCity && selectedCity && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 rounded-xl bg-neutral-muted border border-border-light"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
          >
            {/* Label */}
            <p className="text-sm font-medium text-content-muted mb-3">
              {t('waitlist.earlyAccess.yourCityLabel')}
            </p>
            
            {/* City info */}
            <div className="flex items-start gap-2 mb-2">
              <Icon
                className="text-primary mt-0.5"
                height={20}
                icon="material-symbols:location-on-rounded"
                width={20}
              />
              <div className="flex flex-col gap-1">
                <p className="font-inter-tight text-lg font-semibold text-content-heading">
                  {selectedCity.cityName}
                </p>
                <div className="flex flex-col gap-0.5 text-sm text-content-muted">
                  <span>{t('waitlist.citySelection.statusNotActive')}</span>
                  <span>
                    {selectedCity.interestCount === 1
                      ? t('waitlist.citySelection.interestCount_one').replace(
                          '{{count}}',
                          String(selectedCity.interestCount)
                        )
                      : t('waitlist.citySelection.interestCount_other').replace(
                          '{{count}}',
                          String(selectedCity.interestCount)
                        )}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Subtext */}
            <p className="text-xs text-content-muted mt-3">
              {t('waitlist.earlyAccess.cityNotifySubtext')}
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col gap-3 mt-2"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
        >
          <Button
            fullWidth
            aria-label={t('waitlist.earlyAccess.suggestProvider')}
            disabled={isUpdating}
            icon="material-symbols:add-business-rounded"
            size="lg"
            variant="primary"
            onClick={handleSuggestProvider}
          >
            {t('waitlist.earlyAccess.suggestProvider')}
          </Button>

          <Button
            fullWidth
            aria-label={
              selectedCity
                ? t('waitlist.earlyAccess.changeCity')
                : t('waitlist.earlyAccess.selectCity')
            }
            disabled={isUpdating}
            icon="material-symbols:location-city-rounded"
            size="lg"
            variant="secondary"
            onClick={handleSelectCity}
          >
            {selectedCity
              ? t('waitlist.earlyAccess.changeCity')
              : t('waitlist.earlyAccess.selectCity')}
          </Button>

          <Button
            fullWidth
            aria-label={t('waitlist.earlyAccess.learnMore')}
            disabled={isUpdating}
            icon="material-symbols:info-rounded"
            size="lg"
            variant="ghost"
            onClick={handleLearnMore}
          >
            {t('waitlist.earlyAccess.learnMore')}
          </Button>
        </motion.div>

        {/* Email Confirmation Reminder */}
        <motion.p
          animate={{ opacity: 1 }}
          className="text-sm text-content-muted text-center mt-4"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          {t('waitlist.earlyAccess.confirmEmailReminder')}
        </motion.p>

        {/* Skip Link */}
        <motion.button
          animate={{ opacity: 1 }}
          aria-label={t('waitlist.earlyAccess.skipForNow')}
          className="text-sm text-content-muted hover:text-content transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          disabled={isUpdating}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          type="button"
          onClick={handleSkip}
        >
          {t('waitlist.earlyAccess.skipForNow')}
        </motion.button>
      </motion.div>
    </div>
  );
}
