'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { normalizeCountryNameForDisplay } from '@/utils/addressValidation';

interface NominatimCityResult {
  place_id: number;
  display_name: string;
  name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

interface CitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelected: (cityName: string, country?: string) => void;
}

/**
 * City Search Modal
 * 
 * Allows users to search for any city in the world using Nominatim (OpenStreetMap).
 * 
 * Features:
 * - Global city search
 * - Debounced search input
 * - Loading states
 * - Empty states
 * - Keyboard navigation
 * - Accessibility support
 */
export function CitySearchModal({
  isOpen,
  onClose,
  onCitySelected,
}: CitySearchModalProps) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<NominatimCityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setCities([]);
      setSelectedIndex(-1);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Search cities using Nominatim API
  const searchCities = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (query.trim().length < 2) {
      setCities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use Nominatim search API for cities
      // Filter by place type: city, town, village
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `addressdetails=1&` +
        `limit=10&` +
        `featuretype=city,town,village&` +
        `countrycodes=`, // Empty = all countries
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'User-Agent': 'UmmahFlow/1.0', // Required by Nominatim ToS
            'Accept-Language': 'de,en', // Prefer German, fallback to English
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch city suggestions');
      }

      const data: NominatimCityResult[] = await response.json();
      
      // Filter and format results, replacing Israel with Palestine
      const formattedCities = data
        .filter((result) => {
          // Only include results that have a city/town/village name
          return result.address?.city || result.address?.town || result.address?.village;
        })
        .map((result) => {
          // Replace Israel with Palestine in country field
          const country = normalizeCountryNameForDisplay(result.address?.country || '');
          return {
            ...result,
            // Extract city name (prefer city, fallback to town/village)
            cityName: result.address?.city || result.address?.town || result.address?.village || result.name,
            country: country,
            address: {
              ...result.address,
              country: country,
            },
          };
        });

      setCities(formattedCities);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('[City Search] Error fetching cities:', error);
      setCities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCities(searchQuery);
      } else {
        setCities([]);
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle city select
  const handleCitySelect = (city: NominatimCityResult) => {
    const cityName = city.address?.city || city.address?.town || city.address?.village || city.name;
    const country = normalizeCountryNameForDisplay(city.address?.country || '');
    onCitySelected(cityName, country);
    handleClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < cities.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && cities[selectedIndex]) {
      e.preventDefault();
      handleCitySelect(cities[selectedIndex]);
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: isClosing ? 0 : 1 }}
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        aria-describedby="city-search-modal-description"
        aria-labelledby="city-search-modal-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[999999] flex items-end justify-center md:inset-0 md:items-center"
        role="dialog"
      >
        {/* Modal Content */}
        <div
          className="relative flex w-full max-w-[392px] flex-col gap-4 rounded-t-[32px] bg-white p-4 md:rounded-[24px] md:max-w-[480px] md:p-6"
          style={{
            transform: isClosing
              ? 'translateY(100%) scale(0.95)'
              : 'translateY(0) scale(1)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            maxHeight: '80vh',
          }}
        >
          {/* Close Button */}
          <div className="flex w-full justify-end">
            <Button
              aria-label={t('common.close')}
              className="rounded-full"
              icon="material-symbols:close-rounded"
              size="icon"
              type="button"
              variant="ghost"
              onClick={handleClose}
            />
          </div>

          {/* Title */}
          <h2
            className="font-inter-tight text-2xl font-semibold text-content-heading"
            id="city-search-modal-title"
          >
            {t('waitlist.citySelection.searchButton')}
          </h2>

          {/* Search Input */}
          <div className="relative">
            <div className="flex h-12 items-center gap-3 rounded-sm border border-border bg-white px-4">
              <Icon
                className="size-6 shrink-0 text-content-muted"
                icon="material-symbols:search-rounded"
              />
              <input
                ref={inputRef}
                aria-label={t('waitlist.citySelection.searchPlaceholder')}
                className="flex-1 border-0 bg-transparent text-base font-normal text-content-heading outline-none placeholder:text-content-muted focus:ring-0"
                placeholder={t('waitlist.citySelection.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
              />
              {isLoading && (
                <Icon
                  className="size-5 animate-spin text-primary"
                  icon="material-symbols:progress-activity"
                />
              )}
              {searchQuery && !isLoading && (
                <button
                  aria-label={t('common.delete')}
                  className="flex items-center justify-center p-1 rounded hover:bg-neutral-light"
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCities([]);
                    inputRef.current?.focus();
                  }}
                >
                  <Icon className="size-4 text-content-muted" icon="lucide:x" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div
            className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto"
            id="city-search-modal-description"
          >
            {searchQuery.trim().length < 2 ? (
              <p className="py-8 text-center text-sm text-content-muted">
                {t('waitlist.citySelection.supportingText')}
              </p>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon
                  className="size-8 animate-spin text-primary"
                  icon="material-symbols:progress-activity"
                />
              </div>
            ) : cities.length === 0 ? (
              <p className="py-8 text-center text-sm text-content-muted">
                {t('waitlist.citySelection.noResults')}
              </p>
            ) : (
              cities.map((city, index) => {
                const cityName = city.address?.city || city.address?.town || city.address?.village || city.name;
                const country = normalizeCountryNameForDisplay(city.address?.country || '');
                const isSelected = index === selectedIndex;

                return (
                  <motion.button
                    key={city.place_id}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-center justify-between rounded-sm border border-border bg-white p-4 text-left transition-all duration-150',
                      'hover:bg-neutral-muted hover:border-primary',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      isSelected && 'bg-primary/5 border-primary'
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-inter-tight text-base font-semibold text-content-heading">
                        {cityName}
                      </span>
                      {country && (
                        <span className="text-sm text-content-muted">{country}</span>
                      )}
                    </div>
                    <Icon
                      className="size-5 text-primary"
                      icon="material-symbols:arrow-forward-rounded"
                    />
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

