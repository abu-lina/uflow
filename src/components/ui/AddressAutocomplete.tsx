'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useLanguage } from '@/providers/LanguageProvider';
import { normalizeCountryNameForDisplay } from '@/utils/addressValidation';

export interface AddressComponents {
  street: string;
  zip: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface AddressAutocompleteProps {
  /**
   * Callback when an address is selected
   */
  onAddressSelect: (address: AddressComponents) => void;
  /**
   * Initial address values (only used on mount, not synced after)
   */
  initialValue?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
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
  /**
   * Whether to show loading state
   */
  isLoading?: boolean;
}

/**
 * Address autocomplete component using OpenStreetMap Nominatim API
 *
 * Features:
 * - Real-time address suggestions as user types
 * - Auto-fills all address fields when an address is selected
 * - Supports geocoding (lat/lng coordinates)
 * - Free, open-source, and privacy-friendly
 * - Gracefully handles API failures (falls back to manual entry)
 * - Loading and error states
 *
 * Note: Uses OpenStreetMap's Nominatim service which is free but has rate limits.
 * For production, consider using a self-hosted instance or a proxy.
 */
export function AddressAutocomplete({
  onAddressSelect,
  initialValue,
  placeholder,
  disabled = false,
  className = '',
  label,
  error,
  isLoading: externalLoading = false,
}: AddressAutocompleteProps) {
  // Initialize from initialValue only once on mount
  const getInitialValue = () => {
    if (initialValue) {
      const parts = [
        initialValue.street || '',
        initialValue.zip || '',
        initialValue.city || '',
        initialValue.country || '',
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '';
    }
    return '';
  };

  const [inputValue, setInputValue] = useState(getInitialValue);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { t } = useLanguage();

  // Fetch suggestions from Nominatim API
  const fetchSuggestions = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use Nominatim search API
      // Important: Respect rate limits (1 request per second recommended)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `addressdetails=1&` +
          `limit=5&` +
          `countrycodes=`, // Empty = all countries
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'User-Agent': 'UmmahFlow/1.0', // Required by Nominatim ToS
            'Accept-Language': 'de,en', // Prefer German, fallback to English
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch address suggestions');
      }

      const data: NominatimResult[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to format street address (street name first, then house number)
  const formatStreetAddress = useCallback((result: NominatimResult): string => {
    const streetParts = [];
    if (result.address?.road) {
      streetParts.push(result.address.road);
    }
    if (result.address?.house_number) {
      streetParts.push(result.address.house_number);
    }
    return streetParts.join(' ') || result.display_name.split(',')[0];
  }, []);

  // Parse Nominatim result to AddressComponents
  const parseAddress = useCallback(
    (result: NominatimResult): AddressComponents => {
      const address: AddressComponents = {
        street: formatStreetAddress(result),
        zip: result.address?.postcode || '',
        city:
          result.address?.city ||
          result.address?.town ||
          result.address?.village ||
          result.address?.municipality ||
          '',
        country: normalizeCountryNameForDisplay(result.address?.country || ''),
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
      };

      return address;
    },
    [formatStreetAddress],
  );

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
    if (newValue.length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestionsStable.current(newValue);
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []); // No dependencies - using ref for fetchSuggestions

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (result: NominatimResult) => {
      const displayName = result.display_name;
      setInputValue(displayName);
      setShowSuggestions(false);

      // Parse and return address
      const address = parseAddress(result);
      // Call callback directly - it's memoized so should be stable
      onAddressSelect(address);
    },
    [onAddressSelect, parseAddress],
  );

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
    }, 200);
  }, []);

  const displayLoading = isLoading || externalLoading;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="mb-1 block text-xs leading-[15px] text-content-muted">{label}</label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          className={`h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0 ${
            error ? 'text-danger' : ''
          }`}
          disabled={disabled}
          placeholder={placeholder || t('create.location.enterAddress')}
          type="text"
          value={inputValue}
          onBlur={handleBlur}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />

        {/* Loading indicator */}
        {displayLoading && (
          <div className="absolute right-0 top-0 flex h-full items-center pr-2">
            <Icon className="h-4 w-4 animate-spin text-content-muted" icon="mdi:loading" />
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
            {suggestions.map((result) => (
              <button
                key={result.place_id}
                className="w-full border-b border-neutral-100 px-3 py-2 text-left text-sm text-content last:border-b-0 hover:bg-neutral-100"
                type="button"
                onClick={() => handleSuggestionClick(result)}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                    icon="mdi:map-marker"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium leading-[18px]">
                      {formatStreetAddress(result)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-content-muted">
                      {result.display_name.split(',').slice(1).join(',').trim()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-danger">
          <Icon className="h-3 w-3" icon="mdi:alert-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text */}
      {!error && inputValue.length > 0 && inputValue.length < 3 && (
        <div className="mt-1 text-xs text-content-muted">{t('create.location.typeToSearch')}</div>
      )}
    </div>
  );
}
