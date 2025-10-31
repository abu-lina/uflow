'use client';

/// <reference types="google.maps" />

import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';

interface BusinessSearchProps {
  onSelect: (placeData: PlaceData) => void;
  onManualCreate: () => void;
}

export interface PlaceData {
  name: string;
  address: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  website?: string;
  types?: string[];
  photos?: string[];
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
}

export function BusinessSearch({ onSelect, onManualCreate }: BusinessSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line no-undef
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // eslint-disable-next-line no-undef
  const handlePlaceSelect = useCallback(async (place: google.maps.places.PlaceResult) => {
    if (!place.address_components) {
      setError('Unable to get place details');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse address components
      let street = '';
      let city = '';
      let zip = '';
      let country = '';

      place.address_components.forEach((component) => {
        const types = component.types;
        
        if (types.includes('street_number')) {
          street = component.long_name + ' ' + street;
        }
        if (types.includes('route')) {
          street = street + component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('postal_code')) {
          zip = component.long_name;
        }
        if (types.includes('country')) {
          country = component.long_name;
        }
      });

      // Get photos (first 5)
      const photos: string[] = [];
      if (place.photos && place.photos.length > 0) {
        place.photos.slice(0, 5).forEach((photo) => {
          photos.push(photo.getUrl({ maxWidth: 1200, maxHeight: 1200 }));
        });
      }

      const placeData: PlaceData = {
        name: place.name || '',
        address: place.formatted_address || '',
        street: street.trim(),
        city,
        zip,
        country,
        phone: place.formatted_phone_number || place.international_phone_number,
        website: place.website,
        types: place.types,
        photos,
        latitude: place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
        formattedAddress: place.formatted_address || '',
      };

      console.log('Place data parsed:', placeData);
      onSelect(placeData);
    } catch (err) {
      console.error('Error processing place:', err);
      setError('Failed to process business data');
    } finally {
      setIsLoading(false);
    }
  }, [onSelect]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    // Load Google Maps script dynamically
    const loadGoogleMaps = () => {
      // Check if already loaded
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        initAutocomplete();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      
      if (existingScript) {
        existingScript.addEventListener('load', initAutocomplete);
        return;
      }

      // Create and load the script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=Function.prototype`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        initAutocomplete();
      };
      
      script.onerror = () => {
        setError('Failed to load Google Maps');
      };
      
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (!inputRef.current) return;

      // eslint-disable-next-line no-undef
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment'],
        fields: [
          'name',
          'formatted_address',
          'address_components',
          'formatted_phone_number',
          'international_phone_number',
          'website',
          'types',
          'photos',
          'geometry',
        ],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        handlePlaceSelect(place);
      });

      autocompleteRef.current = autocomplete;
    };

    loadGoogleMaps();
  }, [handlePlaceSelect]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Search Input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-content-title">
          Search for your business
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 pr-12 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            placeholder="e.g., Cafe Mustermann Berlin"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <Icon
                className="h-5 w-5 text-primary animate-spin"
                icon="mdi:loading"
              />
            ) : (
              <Icon
                className="h-5 w-5 text-[#999999]"
                icon="mdi:magnify"
              />
            )}
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <Icon className="h-4 w-4" icon="mdi:alert-circle" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#7A7A7A]">
          Start typing to see suggestions. We&apos;ll auto-fill all the details!
        </p>
      </div>

      {/* Info Box */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Icon
            className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
            icon="mdi:information"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-content-title">
              Quick Business Import
            </p>
            <p className="text-xs text-content leading-relaxed">
              Search for your business and we&apos;ll automatically fill in the address, 
              phone number, website, and even download photos from Google.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#E5E5E5]" />
        <span className="text-sm text-[#999999]">or</span>
        <div className="flex-1 h-px bg-[#E5E5E5]" />
      </div>

      {/* Manual Create Button */}
      <button
        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-[#D4D4D4] bg-white px-5 py-3 text-base font-medium text-content-title transition-colors hover:border-primary hover:bg-primary/5"
        type="button"
        onClick={onManualCreate}
      >
        <Icon className="h-5 w-5" icon="mdi:pencil" />
        <span>Create manually instead</span>
      </button>
    </div>
  );
}

