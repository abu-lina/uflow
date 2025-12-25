'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLanguage } from '@/providers/LanguageProvider';
import { detectPWA } from '@/utils/pwaUtils';
import { IOSInstallInstructionsModal } from '@/components/shared/IOSInstallInstructionsModal';
import { CitySelectionSkeleton } from '@/components/ui/skeleton/CitySelectionSkeleton';
import { cn } from '@/lib/utils';

interface EarlyAccessScreenProps {
  email: string;
  waitlistToken: string; // Can be empty string if token is in HTTP-only cookie
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
  onSuggestProvider,
  onSelectCity,
  onLearnMore,
}: EarlyAccessScreenProps) {
  const { t } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<SelectedCityData | null>(null);
  const [isLoadingCity, setIsLoadingCity] = useState(true);
  const [isMoreOptionsExpanded, setIsMoreOptionsExpanded] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const expandableContentRef = useRef<HTMLDivElement>(null);
  const firstExpandedButtonRef = useRef<HTMLButtonElement>(null);

  // PWA install hook
  const { isInstallable, isIOS, install } = usePWAInstall();
  const pwaInfo = detectPWA();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Detect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        
        const response = await fetch('/api/waitlist/update', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          throw new Error('Failed to mark as seen');
        }
        
        console.log('[Early Access] Marked as seen:', email);
      } catch (error) {
        console.error('[Early Access] Failed to mark as seen:', error);
        // Don't block rendering on error, but could show subtle notification if needed
      }
    };
    
    markAsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run once on mount (email and waitlistToken are stable props)

  // Fetch selected city from sessionStorage or API
  useEffect(() => {
    const abortController = new AbortController();
    
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
        setError(null);
        const response = await fetch('/api/waitlist/status', {
          signal: abortController.signal,
        });
        
        if (!response.ok) {
          throw new Error('Failed to load city information');
        }
        
        const data = await response.json();

        if (data.data?.selected_city) {
          // Fetch interest count for this city
          const citiesResponse = await fetch('/api/cities', {
            signal: abortController.signal,
          });
          
          if (!citiesResponse.ok) {
            throw new Error('Failed to load cities');
          }
          
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
              
              // Show success feedback if city was just selected
              if (!storedCity || storedCity !== cityInfo.cityName) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
              }
            }
          }
        } else {
          // No city selected - clear sessionStorage
          sessionStorage.removeItem('selectedCity');
          sessionStorage.removeItem('interestCount');
          setSelectedCity(null);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('[Early Access] Failed to load city:', error);
          setError(t('waitlist.earlyAccess.errorLoadingCity'));
          // Keep showing sessionStorage data if API fails
        }
      } finally {
        setIsLoadingCity(false);
      }
    }

    loadSelectedCity();
    
    return () => {
      abortController.abort();
    };
  }, [t]);

  // Focus management when expanded
  useEffect(() => {
    if (isMoreOptionsExpanded && firstExpandedButtonRef.current) {
      // Small delay to ensure animation has started
      setTimeout(() => {
        firstExpandedButtonRef.current?.focus();
      }, 100);
    }
  }, [isMoreOptionsExpanded]);

  const handleSuggestProvider = () => {
    onSuggestProvider();
  };

  const handleSelectCity = () => {
    onSelectCity();
  };

  const handleRetry = () => {
    setError(null);
    setIsLoadingCity(true);
    // Trigger reload by clearing and refetching
    const storedCity = sessionStorage.getItem('selectedCity');
    const storedCount = sessionStorage.getItem('interestCount');
    if (storedCity && storedCount) {
      setSelectedCity({
        cityName: storedCity,
        interestCount: parseInt(storedCount, 10) || 0,
      });
    }
    // Reload city data
    const loadCity = async () => {
      try {
        setError(null);
        const response = await fetch('/api/waitlist/status');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        if (data.data?.selected_city) {
          const citiesResponse = await fetch('/api/cities');
          if (!citiesResponse.ok) throw new Error('Failed to load cities');
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
              sessionStorage.setItem('selectedCity', cityInfo.cityName);
              sessionStorage.setItem('interestCount', String(cityInfo.interestCount));
            }
          }
        }
      } catch {
        setError(t('waitlist.earlyAccess.errorLoadingCity'));
      } finally {
        setIsLoadingCity(false);
      }
    };
    loadCity();
  };

  const handleLearnMore = () => {
    onLearnMore();
  };

  const handleToggleMoreOptions = () => {
    setIsMoreOptionsExpanded(!isMoreOptionsExpanded);
  };

  const handleMoreOptionsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleMoreOptions();
    }
  };

  const handlePWAInstall = async () => {
    if (isIOS) {
      // Show iOS instructions modal
      setShowIOSInstructions(true);
      return;
    }

    if (isInstallable) {
      await install();
    }
  };

  const handleIOSModalClose = () => {
    setShowIOSInstructions(false);
  };

  // Check if PWA install should be shown
  const shouldShowPWAInstall = 
    !pwaInfo.isPWA && 
    !pwaInfo.isStandalone && 
    (isDevelopment || isInstallable || isIOS);

  // Animation variants respecting reduced motion
  const expandVariants: Variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      transition: prefersReducedMotion 
        ? { duration: 0 } 
        : { 
            duration: 0.2, 
            ease: 'easeOut',
            opacity: { duration: 0.15 }
          }
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      transition: prefersReducedMotion 
        ? { duration: 0 } 
        : { 
            duration: 0.3, 
            ease: 'easeOut',
            opacity: { duration: 0.2, delay: 0.1 }
          }
    }
  };

  return (
    <div className="flex h-screen w-full flex-col px-4 sm:px-6 lg:px-8">
      {/* Main Content - Centered */}
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-md flex-col items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
        >
          {/* Heading */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            <h1 className="font-inter-tight text-3xl font-semibold leading-tight text-content-heading sm:text-4xl">
              {t('waitlist.earlyAccess.title')}
            </h1>
            <p className="font-inter text-base leading-normal text-content sm:text-lg whitespace-pre-line">
              {t('waitlist.earlyAccess.description')}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col gap-4"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          >
            {/* Primary CTA */}
            <Button
              fullWidth
              aria-label={t('waitlist.earlyAccess.suggestProvider')}
              icon="material-symbols:add-business-rounded"
              size="lg"
              variant="primary"
              onClick={handleSuggestProvider}
            >
              {t('waitlist.earlyAccess.suggestProvider')}
            </Button>

            {/* Secondary CTA */}
            <div className="flex flex-col gap-2">
              {isLoadingCity ? (
                <CitySelectionSkeleton />
              ) : error ? (
                <div className="rounded-lg border border-danger-soft bg-danger-soft p-4" role="alert">
                  <p className="text-danger mb-4">{error}</p>
                  <Button variant="primary" onClick={handleRetry}>
                    {t('waitlist.earlyAccess.retry')}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    fullWidth
                    aria-label={
                      selectedCity
                        ? t('waitlist.earlyAccess.changeCity')
                        : t('waitlist.earlyAccess.selectCity')
                    }
                    icon="material-symbols:location-city-rounded"
                    size="md"
                    variant="secondary"
                    onClick={handleSelectCity}
                  >
                    {selectedCity
                      ? t('waitlist.earlyAccess.changeCity')
                      : t('waitlist.earlyAccess.selectCity')}
                  </Button>
                  {selectedCity && selectedCity.interestCount > 0 && (
                    <p className="text-sm text-content-muted text-center">
                      {selectedCity.interestCount} {t('waitlist.earlyAccess.othersInterested')} {selectedCity.cityName}
                    </p>
                  )}
                  {!selectedCity && (
                    <p className="text-xs text-content-muted text-center">
                      {t('waitlist.earlyAccess.selectCityHelper')}
                    </p>
                  )}
                </>
              )}
            </div>
            
            {/* Success Feedback */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  aria-live="polite"
                  className="rounded-lg border border-success bg-success-soft p-4"
                  exit={{ opacity: 0, scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  role="status"
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                >
                  <p className="text-success text-sm">{t('waitlist.earlyAccess.citySelected')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* More Options Expandable Section */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          >
            <motion.div
              className="flex w-full flex-col overflow-hidden rounded-xl"
            >
              <button
                aria-expanded={isMoreOptionsExpanded}
                aria-label={
                  isMoreOptionsExpanded
                    ? t('waitlist.earlyAccess.moreOptions') + ' (expanded)'
                    : t('waitlist.earlyAccess.moreOptions') + ' (collapsed)'
                }
                className={cn(
                  'flex h-11 items-center justify-center gap-2 px-4 font-inter-tight font-medium text-base text-content-muted',
                  'transition-colors duration-150',
                  'md:hover:bg-neutral-light active:bg-neutral',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-md'
                )}
                type="button"
                onClick={handleToggleMoreOptions}
                onKeyDown={handleMoreOptionsKeyDown}
              >
                {t('waitlist.earlyAccess.moreOptions')}
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'h-6 w-6',
                    !prefersReducedMotion && 'transition-transform duration-200',
                    isMoreOptionsExpanded && 'rotate-180'
                  )}
                  icon="lucide:chevron-down"
                />
              </button>

              <AnimatePresence initial={false}>
                {isMoreOptionsExpanded && (
                  <motion.div
                    ref={expandableContentRef}
                    animate="expanded"
                    className="flex w-full flex-col overflow-hidden"
                    initial="collapsed"
                    variants={expandVariants}
                  >
                    {/* PWA Install Section */}
                    {shouldShowPWAInstall && (
                      <button
                        ref={firstExpandedButtonRef}
                        aria-label={
                          isIOS
                            ? t('waitlist.earlyAccess.pwaInstall.iosButton')
                            : t('waitlist.earlyAccess.pwaInstall.button')
                        }
                        className={cn(
                          'flex h-11 items-center justify-center px-4 font-inter-tight font-medium text-sm text-content-muted underline',
                          'transition-colors duration-150',
                          'md:hover:bg-neutral-light active:bg-neutral',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-md'
                        )}
                        type="button"
                        onClick={handlePWAInstall}
                      >
                        {isIOS
                          ? t('waitlist.earlyAccess.pwaInstall.iosButton')
                          : t('waitlist.earlyAccess.pwaInstall.button')}
                      </button>
                    )}

                    {/* Learn More Section */}
                    <button
                      aria-label={t('waitlist.earlyAccess.learnMore')}
                      className={cn(
                        'flex h-11 items-center justify-center px-4 font-inter-tight font-medium text-sm text-content-muted underline',
                        'transition-colors duration-150',
                        'md:hover:bg-neutral-light active:bg-neutral',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        'rounded-b-xl'
                      )}
                      type="button"
                      onClick={handleLearnMore}
                    >
                      {t('waitlist.earlyAccess.whatIsUmmahFlow')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* iOS Instructions Modal */}
      <IOSInstallInstructionsModal
        isOpen={showIOSInstructions}
        onClose={handleIOSModalClose}
      />
    </div>
  );
}
