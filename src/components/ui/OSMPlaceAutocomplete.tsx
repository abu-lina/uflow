'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useLanguage } from '@/providers/LanguageProvider';
import { searchPlacesInCity } from '@/services/placeAutocompleteService';
import type { OSMPlace, OSMPlaceType } from '@/types/osm';
import { cn } from '@/lib/utils';

// Track if component is mounted to avoid hydration mismatches
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted;
}

interface OSMPlaceAutocompleteProps {
  /**
   * Callback when a place is selected
   */
  onPlaceSelect: (place: OSMPlace) => void;
  /**
   * City name to search within (required)
   */
  cityName: string;
  /**
   * Initial place value (only used on mount)
   */
  initialValue?: OSMPlace | null;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Label for the input
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
}

/**
 * Get icon for place type
 */
function getPlaceTypeIcon(placeType: OSMPlaceType): string {
  switch (placeType) {
    case 'mosque':
      return 'mdi:mosque';
    case 'islamic_center':
      return 'mdi:mosque';
    case 'restaurant':
      return 'mdi:silverware-fork-knife';
    case 'fast_food':
      return 'mdi:food';
    case 'shop':
      return 'mdi:store';
    default:
      return 'mdi:map-marker';
  }
}

/**
 * Get display name for place type
 */
function getPlaceTypeLabel(placeType: OSMPlaceType, t: (key: string) => string): string {
  switch (placeType) {
    case 'mosque':
      return t('create.importOsm.placeTypes.mosque');
    case 'islamic_center':
      return t('create.importOsm.placeTypes.islamicCenter');
    case 'restaurant':
      return t('create.importOsm.placeTypes.restaurant');
    case 'fast_food':
      return t('create.importOsm.placeTypes.fastFood');
    case 'shop':
      return t('create.importOsm.placeTypes.shop');
    default:
      return '';
  }
}

/**
 * OSM Place Autocomplete component
 * 
 * Features:
 * - Search for Muslim places (mosques, halal restaurants, shops) within a city
 * - Real-time suggestions as user types
 * - Place type icons and labels
 * - Address preview
 * - Loading and error states
 * - Keyboard navigation
 */
export function OSMPlaceAutocomplete({
  onPlaceSelect,
  cityName,
  initialValue,
  placeholder,
  disabled = false,
  className = '',
  label,
  error,
}: OSMPlaceAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue?.name || '');
  const [suggestions, setSuggestions] = useState<OSMPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { t } = useLanguage();
  const isMounted = useIsMounted();

  // Fetch suggestions from OSM service
  const fetchSuggestions = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!cityName || !cityName.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    try {
      const places = await searchPlacesInCity(query, cityName);
      setSuggestions(places);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Error fetching place suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [cityName]);

  // Fetch suggestions - stable reference
  const fetchSuggestionsStable = useRef(fetchSuggestions);
  fetchSuggestionsStable.current = fetchSuggestions;

  // Handle input change with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce API calls (wait 500ms after user stops typing)
    if (newValue.length >= 2 && cityName) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestionsStable.current(newValue);
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [cityName]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((place: OSMPlace) => {
    setInputValue(place.name);
    setShowSuggestions(false);
    onPlaceSelect(place);
  }, [onPlaceSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSuggestionClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle blur - hide suggestions
  const handleBlur = useCallback(() => {
    // Delay to allow suggestion click to fire
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  }, []);

  // Update input when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setInputValue(initialValue.name);
    }
  }, [initialValue]);

  const isDisabled = disabled || !cityName || !cityName.trim();

  return (
    <div className={cn('relative w-full', className)}>
      {/* Search icon on the left */}
      <div className="absolute left-0 top-0 flex items-center h-full pl-0 z-10 pointer-events-none">
        <Icon
          className={cn(
            'h-4 w-4 text-content-muted transition-opacity',
            isLoading && 'opacity-0'
          )}
          icon={isLoading ? 'mdi:loading' : 'mdi:magnify'}
        />
      </div>

      {/* Loading indicator on the right */}
      {isLoading && (
        <div className="absolute right-0 top-0 flex items-center h-full pr-0 z-10">
          <Icon
            className="h-4 w-4 text-content-muted animate-spin"
            icon="mdi:loading"
          />
        </div>
      )}

      <input
        ref={inputRef}
        aria-autocomplete="list"
        aria-controls="osm-place-suggestions"
        aria-expanded={showSuggestions}
        aria-label={label || t('create.importOsm.searchLabel') || 'Search Muslim Places'}
        className={cn(
          'h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0',
          'pl-6', // Add left padding for search icon
          isLoading && 'pr-6', // Add right padding when loading
          error && 'text-danger',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
        placeholder={placeholder || t('create.importOsm.searchPlaceholder')}
        role="combobox"
        type="text"
        value={inputValue}
        onBlur={handleBlur}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onKeyDown={handleKeyDown}
        {...(isDisabled && { disabled: true })}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          className="absolute z-50 mt-1 w-full max-h-[300px] overflow-y-auto rounded-2xl border border-border bg-background shadow-lg"
          id="osm-place-suggestions"
          role="listbox"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon
                className="h-6 w-6 animate-spin text-primary"
                icon="material-symbols:progress-activity"
              />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-content-muted">
              {inputValue.trim().length < 2
                ? t('create.importOsm.typeToSearch')
                : t('create.importOsm.noResults')}
            </div>
          ) : (
            suggestions.map((place, index) => {
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={`${place.type}-${place.id}`}
                  aria-selected={isSelected}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors',
                    'hover:bg-neutral-muted',
                    isSelected && 'bg-primary/5'
                  )}
                  role="option"
                  type="button"
                  onClick={() => handleSuggestionClick(place)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          place.placeType === 'mosque' || place.placeType === 'islamic_center' ? 'text-primary' : 'text-content-muted'
                        )}
                        icon={getPlaceTypeIcon(place.placeType)}
                      />
                      <span className="text-[15px] font-medium text-content-heading">
                        {place.name}
                      </span>
                    </div>
                    {(place.address?.city || getPlaceTypeLabel(place.placeType, t)) && (
                      <div className="flex items-center gap-1 pl-6">
                        {getPlaceTypeLabel(place.placeType, t) && (
                          <span className="text-xs text-content-muted">
                            {getPlaceTypeLabel(place.placeType, t)}
                          </span>
                        )}
                        {getPlaceTypeLabel(place.placeType, t) && place.address?.city && (
                          <span className="text-xs text-content-muted">•</span>
                        )}
                        {place.address?.city && (
                          <span className="text-xs text-content-muted">{place.address.city}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-1 text-xs text-danger flex items-center gap-1">
          <Icon className="h-3 w-3" icon="mdi:alert-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text - only render on client to avoid hydration mismatch */}
      {isMounted && !error && !cityName && (
        <div className="mt-1 text-xs text-content-muted">
          {t('create.importOsm.selectCityFirst')}
        </div>
      )}

      {isMounted && !error && cityName && inputValue.length > 0 && inputValue.length < 2 && (
        <div className="mt-1 text-xs text-content-muted">
          {t('create.importOsm.typeToSearch')}
        </div>
      )}
    </div>
  );
}
