'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { useLanguage } from '@/providers/LanguageProvider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';

interface City {
  id: string;
  city_name: string;
  country: string;
  provider_count: number;
  is_unlocked: boolean;
}

interface CitySelectionModalProps {
  isOpen: boolean;
  email?: string; // Optional - not required when waitlist is skipped
  waitlistToken?: string; // Optional - can be empty string if token is in HTTP-only cookie
  onClose: () => void;
  onCitySelected: (city: string) => void;
}

export function CitySelectionModal({
  isOpen,
  email,
  waitlistToken,
  onClose,
  onCitySelected,
}: CitySelectionModalProps) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch cities from database
  useEffect(() => {
    async function fetchCities() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id, city_name, country, provider_count, is_unlocked')
          .order('provider_count', { ascending: false })
          .order('city_name', { ascending: true });

        if (error) {
          console.error('[City Selection] Failed to fetch cities:', error);
          toast.error(t('common.error'));
          return;
        }

        setCities(data || []);
      } catch (error) {
        console.error('[City Selection] Unexpected error:', error);
        toast.error(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    }

    if (isOpen) {
      fetchCities();
    }
  }, [isOpen, t]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;

    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      setSearchQuery(''); // Reset search on close
    }, 300);
  }, [isSubmitting, onClose]);

  const handleCitySelect = async (city: City) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // CRITICAL: Persist city BEFORE API call
      localStorage.setItem('selectedCity', city.city_name);
      sessionStorage.setItem('selectedCity', city.city_name);
      
      // CRITICAL: Ensure onboarding state exists when city is selected
      // Always create state, even without email (for pre-launch flow)
      const onboardingState = getOnboardingState();
      
      if (!onboardingState) {
        // Create onboarding state (with or without email)
        setOnboardingState({
          email: email?.trim() || '',
          waitlistSubmitted: !!email?.trim(), // Only true if email exists
          earlyAccessUnlocked: true,
          submittedAt: new Date().toISOString(),
          waitlistToken: waitlistToken?.trim() || undefined,
        });
      }
      
      // Only update waitlist API if email is provided (for future compatibility)
      if (email && email.trim()) {
        const body: Record<string, unknown> = {
          email: email.trim(),
          selected_city: city.city_name,
        };
        
        // Include token if provided (API will also check cookie as fallback)
        if (waitlistToken && waitlistToken.trim()) {
          body.waitlistToken = waitlistToken.trim();
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
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error?.message || 'Failed to update city preference';
          console.error('[City Selection Modal] API error:', errorMessage, errorData);
          throw new Error(errorMessage);
        }
      }

      // Show success toast
      const message = t('waitlist.citySelection.notifyToast').replace('{{city}}', city.city_name);
      toast.success(message);

      // Callback and close
      onCitySelected(city.city_name);
      handleClose();
    } catch (error) {
      console.error('[City Selection Modal] Failed to save:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter cities by search query
  const filteredCities = cities.filter((city) =>
    city.city_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status for a city
  const getCityStatus = (city: City): { emoji: string; label: string } => {
    if (city.is_unlocked) {
      return { emoji: '🟢', label: t('waitlist.citySelection.statusLive') };
    } else if (city.provider_count > 0) {
      return { emoji: '🟡', label: t('waitlist.citySelection.statusComingSoon') };
    } else {
      return { emoji: '⚪', label: t('waitlist.citySelection.statusNotActive') };
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Focus search input
      setTimeout(() => {
        const searchInput = modalRef.current?.querySelector('input');
        searchInput?.focus();
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, handleClose]);

  if (!isOpen && !isClosing) {
    return null;
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: isClosing ? 0 : 1 }}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        aria-describedby="city-modal-description"
        aria-labelledby="city-modal-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[999999] flex items-end justify-center md:inset-0 md:items-center"
        role="dialog"
      >
        {/* Modal Content */}
        <motion.div
          animate={{ y: 0, scale: 1 }}
          className="relative flex w-full max-w-[392px] flex-col rounded-t-[32px] bg-white md:rounded-[24px] md:max-w-[480px] max-h-[85vh] md:max-h-[80vh]"
          initial={{ y: 100, scale: 0.95 }}
          style={{
            transform: isClosing ? 'translateY(100%) scale(0.95)' : 'translateY(0) scale(1)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-muted">
            <h2
              className="font-inter-tight text-xl font-semibold text-content-heading"
              id="city-modal-title"
            >
              {t('waitlist.citySelection.title')}
            </h2>
            <Button
              aria-label={t('common.close')}
              className="rounded-full"
              disabled={isSubmitting}
              icon="material-symbols:close-rounded"
              size="icon"
              type="button"
              variant="ghost"
              onClick={handleClose}
            />
          </div>

          {/* Search Input */}
          <div className="px-4 pt-4">
            <FormInput
              aria-label={t('waitlist.citySelection.searchPlaceholder')}
              disabled={isSubmitting}
              label={t('waitlist.citySelection.searchPlaceholder')}
              placeholder={t('waitlist.citySelection.searchPlaceholder')}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Cities List */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-content-muted">{t('common.loading')}</p>
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-content-muted">{t('waitlist.citySelection.noResults')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCities.map((city) => {
                  const status = getCityStatus(city);
                  return (
                    <button
                      key={city.id}
                      aria-label={`${city.city_name} - ${status.label}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-neutral-soft hover:bg-neutral-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                      type="button"
                      onClick={() => handleCitySelect(city)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-inter-tight font-medium text-content-heading">
                            {city.city_name}
                          </span>
                          <span className="text-xs text-content-muted">{city.country}</span>
                        </div>
                        {city.provider_count > 0 && (
                          <span className="text-xs text-content-muted">
                            {t('waitlist.citySelection.providerCount_other').replace(
                              '{{count}}',
                              String(city.provider_count)
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{status.emoji}</span>
                        <span className="text-xs text-content-muted">{status.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
