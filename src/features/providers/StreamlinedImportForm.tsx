'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useAuth } from '@/providers/auth-provider';
import { createProviderOrService } from '@/services/providerService';
import { trackEvent } from '@/lib/analytics/plausible';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { RecommendSuccessScreen } from '@/components/shared/RecommendSuccessScreen';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/supabase';
import { getCategories } from '@/services/categories';
import type { OSMPlace } from '@/types/osm';
import { normalizeCountryNameForDisplay } from '@/utils/addressValidation';
import { searchPlacesInCity } from '@/services/placeAutocompleteService';

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

interface StreamlinedImportFormProps {
  onSuccess?: () => void;
  initialCity?: string;
}

// ContactCheckbox component - reused from StreamlinedRecommendForm
interface ContactCheckboxProps {
  label: string;
  checked: boolean;
  value: string;
  placeholder: string;
  type?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoFormat?: (value: string) => string;
}

const ContactCheckbox = memo(
  ({
    label,
    checked,
    value,
    placeholder,
    type = 'text',
    onToggle,
    onChange,
    autoFormat,
  }: ContactCheckboxProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const userToggledRef = useRef(false);

    // Focus input only when the toggle was initiated by a user action inside this component
    useEffect(() => {
      if (userToggledRef.current && checked && inputRef.current) {
        inputRef.current.focus();
      }
      userToggledRef.current = false;
    }, [checked]);

    const handleToggle = useCallback(() => {
      userToggledRef.current = true;
      onToggle();
    }, [onToggle]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      },
      [handleToggle],
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = autoFormat ? autoFormat(e.target.value) : e.target.value;
        onChange(newValue);
      },
      [onChange, autoFormat],
    );

    return (
      <div
        aria-checked={checked}
        className={cn(
          'flex w-full cursor-pointer items-center rounded-2xl border border-border bg-white px-3 py-2 transition-[height,min-height]',
          checked ? 'min-h-[54px]' : 'h-[54px]',
        )}
        role="checkbox"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className="flex w-full flex-row items-center gap-2">
          <div className="flex-shrink-0">
            <Icon
              className="h-6 w-6 text-content"
              icon={checked ? 'lucide:square-check' : 'lucide:square'}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            {checked ? (
              <>
                <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
                  {label}
                </label>
                <input
                  ref={inputRef}
                  aria-label={label}
                  className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                  placeholder={placeholder}
                  type={type}
                  value={value}
                  onChange={handleInputChange}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </>
            ) : (
              <span className="font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
                {label}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.checked !== nextProps.checked) return false;
    if (prevProps.value !== nextProps.value) return false;
    if (prevProps.label !== nextProps.label) return false;
    if (prevProps.placeholder !== nextProps.placeholder) return false;
    if (prevProps.type !== nextProps.type) return false;
    if (prevProps.onToggle !== nextProps.onToggle) return false;
    if (prevProps.onChange !== nextProps.onChange) return false;
    if (prevProps.autoFormat !== nextProps.autoFormat) return false;
    return true;
  },
);

ContactCheckbox.displayName = 'ContactCheckbox';

interface ImportFormData {
  title: string;
  category: string;
  city: string;
  street: string;
  zip: string;
  country: string;
  offers_ids: string[];
  email: string;
  phone: string;
  website: string;
  instagram: string;
  userEmail: string;
  message: string;
  selectedPlace: OSMPlace | null;
}

const IMPORT_FORM_STORAGE_KEY = 'importOsmFormData';

interface SavedImportFormData {
  formData: ImportFormData;
  selectedContacts: {
    email: boolean;
    phone: boolean;
    website: boolean;
    instagram: boolean;
  };
}

// Category mappings for OSM place types
const PLACE_TYPE_TO_CATEGORY: Record<string, string> = {
  mosque: '4470c3e0-458f-40a6-a96e-ca0fbdf145d7', // Gemeinschaft & Spenden (Community Support)
  islamic_center: '4470c3e0-458f-40a6-a96e-ca0fbdf145d7', // Gemeinschaft & Spenden
  restaurant: '20c10efe-404b-4a39-bb81-5089a0332d78', // Essen & Trinken (Food & Drink)
  fast_food: '20c10efe-404b-4a39-bb81-5089a0332d78', // Essen & Trinken
  shop: '1288f269-2cdb-47e8-bd8e-9d552ff25e83', // Dienstleistungen (Services)
};

const FOOD_KEYWORDS = [
  'burger',
  'pizza',
  'kebab',
  'doner',
  'doener',
  'döner',
  'shawarma',
  'falafel',
  'grill',
  'restaurant',
  'cafe',
  'bistro',
  'bakery',
  'bäckerei',
  'konditorei',
  'imbiss',
  'food',
  'kitchen',
  'eatery',
];

const MOSQUE_KEYWORDS = [
  'mosque',
  'masjid',
  'moschee',
  'musalla',
  'islamic',
  'islamisches',
  'muslim',
];

const ISLAMIC_CENTER_KEYWORDS = [
  'islamic center',
  'islamic centre',
  'islamisches zentrum',
  'islamic community',
];

function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();

  if (ISLAMIC_CENTER_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return PLACE_TYPE_TO_CATEGORY.islamic_center;
  }

  if (MOSQUE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return PLACE_TYPE_TO_CATEGORY.mosque;
  }

  if (FOOD_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return PLACE_TYPE_TO_CATEGORY.restaurant;
  }

  return '';
}

export function StreamlinedImportForm({
  onSuccess: _onSuccess,
  initialCity,
}: StreamlinedImportFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData: contextFormData, updateFormData, setCreationMode } = useFormData();
  const { t, language } = useLanguage();
  const isMobile = useIsSmallMobile();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === 'true';
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryAutoSelected, setIsCategoryAutoSelected] = useState(false);

  // City search state
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [citySearchResults, setCitySearchResults] = useState<NominatimCityResult[]>([]);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
  const citySearchAbortControllerRef = useRef<AbortController | null>(null);
  const [isCitySelected, setIsCitySelected] = useState(!!initialCity);
  const hasInitializedCityRef = useRef(false);

  // Provider name search state
  const providerNameInputRef = useRef<HTMLInputElement>(null);
  const providerNameDropdownRef = useRef<HTMLDivElement>(null);
  const [providerNameSearchQuery, setProviderNameSearchQuery] = useState('');
  const [providerNameSearchResults, setProviderNameSearchResults] = useState<OSMPlace[]>([]);
  const [isProviderNameSearching, setIsProviderNameSearching] = useState(false);
  const [showProviderNameDropdown, setShowProviderNameDropdown] = useState(false);
  const [selectedProviderNameIndex, setSelectedProviderNameIndex] = useState(-1);
  const providerNameSearchAbortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState<ImportFormData>(() => {
    if (typeof window === 'undefined') {
      return {
        title: '',
        category: '',
        city: initialCity || '',
        street: '',
        zip: '',
        country: '',
        offers_ids: [],
        email: '',
        phone: '',
        website: '',
        instagram: '',
        userEmail: '',
        message: '',
        selectedPlace: null,
      };
    }

    try {
      const saved = localStorage.getItem(IMPORT_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedImportFormData;
        return {
          ...parsed.formData,
          selectedPlace: null, // Don't persist OSM place object
        };
      }
    } catch (error) {
      console.error('[StreamlinedImportForm] Error loading form data:', error);
    }

    return {
      title: '',
      category: '',
      city: initialCity || '',
      street: '',
      zip: '',
      country: '',
      offers_ids: [],
      email: '',
      phone: '',
      website: '',
      instagram: '',
      userEmail: '',
      message: '',
      selectedPlace: null,
    };
  });

  const [selectedContacts, setSelectedContacts] = useState<{
    email: boolean;
    phone: boolean;
    website: boolean;
    instagram: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return { email: false, phone: false, website: false, instagram: false };
    }

    try {
      const saved = localStorage.getItem(IMPORT_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedImportFormData;
        return parsed.selectedContacts;
      }
    } catch (error) {
      console.error('[StreamlinedImportForm] Error loading contacts:', error);
    }

    return { email: false, phone: false, website: false, instagram: false };
  });

  // Set creation mode to recommendation on mount
  useEffect(() => {
    setCreationMode('recommendation');
  }, [setCreationMode]);

  // Initialize city from initialCity prop
  useEffect(() => {
    if (!hasInitializedCityRef.current && initialCity && !formData.city) {
      setFormData((prev) => ({ ...prev, city: initialCity }));
      setIsCitySelected(true);
      hasInitializedCityRef.current = true;
    }
  }, [initialCity, formData.city]);

  // Load categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    void fetchCategories();
  }, []);

  // City search function
  const searchCities = useCallback(async (query: string) => {
    // Cancel previous request
    if (citySearchAbortControllerRef.current) {
      citySearchAbortControllerRef.current.abort();
    }

    // Create new abort controller
    citySearchAbortControllerRef.current = new AbortController();

    if (query.trim().length < 2) {
      setCitySearchResults([]);
      setIsCitySearching(false);
      setShowCityDropdown(false);
      return;
    }

    setIsCitySearching(true);
    setShowCityDropdown(true);

    try {
      // Use Nominatim search API for cities
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `addressdetails=1&` +
          `limit=10&` +
          `featuretype=city,town,village&` +
          `countrycodes=`, // Empty = all countries
        {
          signal: citySearchAbortControllerRef.current.signal,
          headers: {
            'User-Agent': 'UmmahFlow/1.0', // Required by Nominatim ToS
            'Accept-Language': 'de,en', // Prefer German, fallback to English
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch city suggestions');
      }

      const data: NominatimCityResult[] = await response.json();

      // Filter and format results
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
            address: {
              ...result.address,
              country: country,
            },
          };
        });

      setCitySearchResults(formattedCities);
      setSelectedCityIndex(-1);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('[City Search] Error fetching cities:', error);
      setCitySearchResults([]);
    } finally {
      setIsCitySearching(false);
    }
  }, []);

  // Debounced city search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (citySearchQuery.trim()) {
        searchCities(citySearchQuery);
      } else {
        setCitySearchResults([]);
        setIsCitySearching(false);
        setShowCityDropdown(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [citySearchQuery, searchCities]);

  // Handle city selection from dropdown
  const handleCitySelect = useCallback((city: NominatimCityResult) => {
    const cityName = city.address?.city || city.address?.town || city.address?.village || city.name;
    setFormData((prev) => ({ ...prev, city: cityName }));
    setIsCitySelected(true);
    setCitySearchQuery('');
    setCitySearchResults([]);
    setShowCityDropdown(false);
    setSelectedCityIndex(-1);
    cityInputRef.current?.blur();
  }, []);

  // Handle city input change
  const handleCityInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, city: value }));
    setIsCitySelected(false);
    setCitySearchQuery(value);
    setSelectedCityIndex(-1);
  }, []);

  // Handle city input focus
  const handleCityInputFocus = useCallback(() => {
    if (citySearchQuery.trim().length >= 2 && citySearchResults.length > 0) {
      setShowCityDropdown(true);
    }
  }, [citySearchQuery, citySearchResults]);

  // Handle city input blur - delay to allow click on dropdown
  const handleCityInputBlur = useCallback(() => {
    setTimeout(() => {
      if (!cityDropdownRef.current?.contains(document.activeElement)) {
        setShowCityDropdown(false);
      }
    }, 200);
  }, []);

  // Handle keyboard navigation for city dropdown
  const handleCityInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showCityDropdown || citySearchResults.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCityIndex((prev) => (prev < citySearchResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCityIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (
        e.key === 'Enter' &&
        selectedCityIndex >= 0 &&
        citySearchResults[selectedCityIndex]
      ) {
        e.preventDefault();
        handleCitySelect(citySearchResults[selectedCityIndex]);
      } else if (e.key === 'Escape') {
        setShowCityDropdown(false);
        setSelectedCityIndex(-1);
      }
    },
    [showCityDropdown, citySearchResults, selectedCityIndex, handleCitySelect],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityInputRef.current &&
        cityDropdownRef.current &&
        !cityInputRef.current.contains(event.target as Node) &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    };

    if (showCityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCityDropdown]);

  // Save form data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const dataToSave: SavedImportFormData = {
          formData: {
            ...formData,
            selectedPlace: null, // Don't save OSM place object
          },
          selectedContacts,
        };
        localStorage.setItem(IMPORT_FORM_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('[StreamlinedImportForm] Error saving form data:', error);
      }
    }
  }, [formData, selectedContacts]);

  // Provider name search function
  const searchProviderNames = useCallback(
    async (query: string) => {
      // Cancel previous request
      if (providerNameSearchAbortControllerRef.current) {
        providerNameSearchAbortControllerRef.current.abort();
      }

      // Create new abort controller
      providerNameSearchAbortControllerRef.current = new AbortController();

      if (query.trim().length < 2) {
        setProviderNameSearchResults([]);
        setIsProviderNameSearching(false);
        setShowProviderNameDropdown(false);
        return;
      }

      if (!formData.city || !formData.city.trim() || !isCitySelected) {
        setProviderNameSearchResults([]);
        setIsProviderNameSearching(false);
        setShowProviderNameDropdown(false);
        return;
      }

      setIsProviderNameSearching(true);
      setShowProviderNameDropdown(true);

      try {
        const places = await searchPlacesInCity(query, formData.city, { limit: 10 });
        setProviderNameSearchResults(places);
        setSelectedProviderNameIndex(-1);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('[Provider Name Search] Error fetching places:', error);
        setProviderNameSearchResults([]);
      } finally {
        setIsProviderNameSearching(false);
      }
    },
    [formData.city, isCitySelected],
  );

  // Debounced provider name search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (providerNameSearchQuery.trim()) {
        searchProviderNames(providerNameSearchQuery);
      } else {
        setProviderNameSearchResults([]);
        setIsProviderNameSearching(false);
        setShowProviderNameDropdown(false);
      }
    }, 500); // 500ms debounce (same as OSMPlaceAutocomplete)

    return () => clearTimeout(timer);
  }, [providerNameSearchQuery, searchProviderNames]);

  // Clear provider name search results when city changes
  useEffect(() => {
    setProviderNameSearchResults([]);
    setIsProviderNameSearching(false);
    setShowProviderNameDropdown(false);
    setProviderNameSearchQuery('');
  }, [formData.city]);

  // Handle provider name selection from dropdown
  const handleProviderNameSelect = useCallback((place: OSMPlace) => {
    // Get category based on place type
    const categoryId = PLACE_TYPE_TO_CATEGORY[place.placeType] || inferCategoryFromName(place.name);
    setIsCategoryAutoSelected(!!categoryId);

    // Format Instagram handle (add @ if not present)
    let instagramValue = place.contact?.instagram || '';
    if (instagramValue && !instagramValue.startsWith('@')) {
      instagramValue = '@' + instagramValue;
    }

    setFormData((prev) => ({
      ...prev,
      title: place.name,
      // Auto-select category if mapping exists
      category: categoryId,
      // Contact fields (auto-fill if available)
      phone: place.contact?.phone || prev.phone,
      email: place.contact?.email || prev.email,
      website: place.contact?.website || prev.website,
      instagram: instagramValue || prev.instagram,
    }));

    // Auto-select contact checkboxes if data is available
    setSelectedContacts((prev) => ({
      email: !!place.contact?.email || prev.email,
      phone: !!place.contact?.phone || prev.phone,
      website: !!place.contact?.website || prev.website,
      instagram: !!place.contact?.instagram || prev.instagram,
    }));

    setProviderNameSearchQuery('');
    setProviderNameSearchResults([]);
    setShowProviderNameDropdown(false);
    setSelectedProviderNameIndex(-1);
    providerNameInputRef.current?.blur();
  }, []);

  // Handle provider name input change
  const handleProviderNameInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const trimmedValue = value.trim();

    setFormData((prev) => {
      const next: typeof prev = { ...prev, title: value };
      // Clear category when user clears the provider name (deletion logic)
      if (trimmedValue.length === 0) {
        next.category = '';
      } else if (prev.category) {
        // User edited the name; clear auto-selected category so they pick again
        next.category = '';
      }
      return next;
    });

    if (trimmedValue.length === 0) {
      setIsCategoryAutoSelected(false);
    }

    setProviderNameSearchQuery(value);
    setSelectedProviderNameIndex(-1);
  }, []);

  // Handle provider name input focus
  const handleProviderNameInputFocus = useCallback(() => {
    if (providerNameSearchQuery.trim().length >= 2 && providerNameSearchResults.length > 0) {
      setShowProviderNameDropdown(true);
    }
  }, [providerNameSearchQuery, providerNameSearchResults]);

  // Handle provider name input blur - delay to allow click on dropdown
  const handleProviderNameInputBlur = useCallback(() => {
    setTimeout(() => {
      if (!providerNameDropdownRef.current?.contains(document.activeElement)) {
        setShowProviderNameDropdown(false);
      }
    }, 200);
  }, []);

  // Handle keyboard navigation for provider name dropdown
  const handleProviderNameInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showProviderNameDropdown || providerNameSearchResults.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedProviderNameIndex((prev) =>
          prev < providerNameSearchResults.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedProviderNameIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (
        e.key === 'Enter' &&
        selectedProviderNameIndex >= 0 &&
        providerNameSearchResults[selectedProviderNameIndex]
      ) {
        e.preventDefault();
        handleProviderNameSelect(providerNameSearchResults[selectedProviderNameIndex]);
      } else if (e.key === 'Escape') {
        setShowProviderNameDropdown(false);
        setSelectedProviderNameIndex(-1);
      }
    },
    [
      showProviderNameDropdown,
      providerNameSearchResults,
      selectedProviderNameIndex,
      handleProviderNameSelect,
    ],
  );

  // Close provider name dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        providerNameInputRef.current &&
        providerNameDropdownRef.current &&
        !providerNameInputRef.current.contains(event.target as Node) &&
        !providerNameDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProviderNameDropdown(false);
      }
    };

    if (showProviderNameDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProviderNameDropdown]);

  // Get category name
  const getCategoryName = useCallback(
    (categoryId: string) => {
      const category = categories.find((c) => c.category_id === categoryId);
      if (!category) return '';
      if (language === 'en') {
        return category.name_en || category.name_de || '';
      }
      return category.name_de || category.name_en || '';
    },
    [categories, language],
  );

  const [categoryDisplayName, setCategoryDisplayName] = useState(() => {
    return formData.category ? '' : t('create.recommend.selectCategory');
  });

  const showCityValidation = formData.city.trim().length > 0 && !isCitySelected;

  useEffect(() => {
    if (formData.category && categories.length > 0) {
      const name = getCategoryName(formData.category);
      setCategoryDisplayName(name || t('create.recommend.selectCategory'));
    } else if (!formData.category) {
      setCategoryDisplayName(t('create.recommend.selectCategory'));
    }
  }, [formData.category, categories, getCategoryName, t]);

  // Validation
  const isFormValid = useMemo(() => {
    const hasBasics = !!formData.title && !!formData.category && isCitySelected;
    const hasContact =
      (selectedContacts.email && formData.email.trim().length > 0) ||
      (selectedContacts.phone && formData.phone.trim().length > 0) ||
      (selectedContacts.website && formData.website.trim().length > 0) ||
      (selectedContacts.instagram && formData.instagram.trim().length > 0);
    return hasBasics && hasContact;
  }, [
    formData.title,
    formData.category,
    formData.email,
    formData.phone,
    formData.website,
    formData.instagram,
    selectedContacts,
    isCitySelected,
  ]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleRecommendAnother = useCallback(() => {
    router.replace('/create/import-osm', { scroll: false });
    setFormData({
      title: '',
      category: '',
      city: initialCity || '',
      street: '',
      zip: '',
      country: '',
      offers_ids: [],
      email: '',
      phone: '',
      website: '',
      instagram: '',
      userEmail: '',
      message: '',
      selectedPlace: null,
    });
    setSelectedContacts({ email: false, phone: false, website: false, instagram: false });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(IMPORT_FORM_STORAGE_KEY);
    }
  }, [router, initialCity]);

  const handleGoBack = useCallback(() => {
    router.push('/');
  }, [router]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      if (!formData.title) {
        toast.error(t('create.recommend.titleRequired'));
      } else if (!formData.category) {
        toast.error(t('create.recommend.categoryRequired'));
      } else if (!isCitySelected) {
        toast.error(t('create.recommend.cityRequired'));
      } else {
        toast.error(t('create.recommend.contactRequired'));
      }
      return;
    }

    try {
      setIsSubmitting(true);

      const userEmail = user?.email || formData.userEmail;

      const serviceFormData = {
        ...contextFormData,
        title: formData.title,
        category: formData.category,
        city: formData.city,
        street: formData.street,
        zip: formData.zip,
        country: formData.country,
        offers_ids: formData.offers_ids,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        instagram: formData.instagram,
        userEmail: userEmail,
        description: formData.message,
        creationMode: 'recommendation' as const,
        entityType: 'provider' as const,
        isOnlineBusiness: false,
        showAddress: !!formData.street,
        needs_ids: [],
        images: [],
        selectedCommunityServiceIds: [],
        tags: [],
        socialCategory: '',
        socialTitle: '',
        socialDescription: '',
      };

      await createProviderOrService(serviceFormData, user || null, true);

      trackEvent('provider_profile_completed', {
        city: formData.city,
        has_phone: !!formData.phone,
        has_website: !!formData.website,
      });

      updateFormData({
        title: '',
        category: '',
        city: '',
        offers_ids: [],
        email: '',
        phone: '',
        website: '',
        instagram: '',
        description: '',
      });
      setFormData((prev) => ({ ...prev, userEmail: '' }));
      setSelectedContacts({ email: false, phone: false, website: false, instagram: false });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(IMPORT_FORM_STORAGE_KEY);
      }

      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });

      router.replace('/create/import-osm?success=true', { scroll: false });
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast.error(t('create.recommend.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    isFormValid,
    contextFormData,
    isCitySelected,
    updateFormData,
    queryClient,
    router,
    t,
    user,
  ]);

  const handleSelectCategory = useCallback(() => {
    setIsCategoryAutoSelected(false);
    updateFormData({
      title: formData.title,
      city: formData.city,
      offers_ids: formData.offers_ids,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      instagram: formData.instagram,
      description: formData.message,
    });
    router.push('/create/recommend/category');
  }, [formData, router, updateFormData]);

  // Contact handlers
  const handleEmailChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
  }, []);

  const handleEmailToggle = useCallback(() => {
    setSelectedContacts((prev) => {
      const wasChecked = prev.email;
      if (wasChecked) {
        setFormData((prevForm) => ({ ...prevForm, email: '' }));
      }
      return { ...prev, email: !prev.email };
    });
  }, []);

  const handleWebsiteChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, website: value }));
  }, []);

  const handleWebsiteToggle = useCallback(() => {
    setSelectedContacts((prev) => {
      const wasChecked = prev.website;
      if (wasChecked) {
        setFormData((prevForm) => ({ ...prevForm, website: '' }));
      }
      return { ...prev, website: !prev.website };
    });
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, phone: value }));
  }, []);

  const handlePhoneToggle = useCallback(() => {
    setSelectedContacts((prev) => {
      const wasChecked = prev.phone;
      if (wasChecked) {
        setFormData((prevForm) => ({ ...prevForm, phone: '' }));
      }
      return { ...prev, phone: !prev.phone };
    });
  }, []);

  const handleInstagramChange = useCallback((value: string) => {
    let formattedValue = value;
    if (formattedValue && !formattedValue.startsWith('@')) {
      formattedValue = '@' + formattedValue;
    }
    setFormData((prev) => ({ ...prev, instagram: formattedValue }));
  }, []);

  const handleInstagramToggle = useCallback(() => {
    setSelectedContacts((prev) => {
      const wasChecked = prev.instagram;
      if (wasChecked) {
        setFormData((prevForm) => ({ ...prevForm, instagram: '' }));
      }
      return { ...prev, instagram: !prev.instagram };
    });
  }, []);

  const emailLabel = useMemo(() => t('create.recommend.email'), [t]);
  const emailPlaceholder = useMemo(() => t('create.recommend.emailPlaceholder'), [t]);
  const websiteLabel = useMemo(() => t('create.recommend.website'), [t]);
  const websitePlaceholder = useMemo(() => t('create.recommend.websitePlaceholder'), [t]);
  const phoneLabel = useMemo(() => t('create.recommend.phone'), [t]);
  const phonePlaceholder = useMemo(() => t('create.recommend.phonePlaceholder'), [t]);
  const instagramLabel = useMemo(() => t('create.recommend.instagram'), [t]);
  const instagramPlaceholder = useMemo(() => t('create.recommend.instagramPlaceholder'), [t]);

  if (showSuccess) {
    return (
      <RecommendSuccessScreen onGoBack={handleGoBack} onRecommendAnother={handleRecommendAnother} />
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-6',
          isMobile ? 'pb-[calc(80px+24px+env(safe-area-inset-bottom))]' : 'pb-8',
        )}
      >
        {/* Section 0: City Selection (Required First) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-content-heading">
            {t('create.recommend.city')} *
          </h2>

          <div className="relative">
            <div
              className={cn(
                'flex h-[56px] w-full cursor-text items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2',
                showCityValidation && 'border-warning/40',
              )}
              role="presentation"
              onClick={() => cityInputRef.current?.focus()}
            >
              <div className="flex w-full flex-col gap-1">
                <label className="text-xs leading-[15px] text-content-muted">
                  {t('create.recommend.city')} *
                </label>
                <input
                  ref={cityInputRef}
                  aria-autocomplete="list"
                  aria-controls="city-search-results"
                  aria-expanded={showCityDropdown}
                  aria-label={t('create.recommend.city')}
                  className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                  placeholder={t('create.recommend.cityPlaceholder')}
                  role="combobox"
                  value={formData.city}
                  onBlur={handleCityInputBlur}
                  onChange={handleCityInputChange}
                  onFocus={handleCityInputFocus}
                  onKeyDown={handleCityInputKeyDown}
                />
              </div>
              {isCitySearching && (
                <Icon
                  className="ml-2 h-5 w-5 animate-spin text-content-muted"
                  icon="material-symbols:progress-activity"
                />
              )}
            </div>

            {/* City Search Dropdown */}
            {showCityDropdown && (
              <div
                ref={cityDropdownRef}
                className="absolute z-50 mt-1 max-h-[300px] w-full overflow-y-auto rounded-2xl border border-[#D4D4D4] bg-white shadow-lg"
                id="city-search-results"
                role="listbox"
              >
                {isCitySearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon
                      className="h-6 w-6 animate-spin text-primary"
                      icon="material-symbols:progress-activity"
                    />
                  </div>
                ) : citySearchResults.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-content-muted">
                    {citySearchQuery.trim().length < 2
                      ? t('waitlist.citySelection.supportingText')
                      : t('waitlist.citySelection.noResults')}
                  </div>
                ) : (
                  citySearchResults.map((city, index) => {
                    const cityName =
                      city.address?.city ||
                      city.address?.town ||
                      city.address?.village ||
                      city.name;
                    const country = normalizeCountryNameForDisplay(city.address?.country || '');
                    const isSelected = index === selectedCityIndex;

                    return (
                      <button
                        key={city.place_id}
                        aria-selected={isSelected}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors',
                          'hover:bg-neutral-muted',
                          isSelected && 'bg-primary/5',
                        )}
                        role="option"
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        onMouseEnter={() => setSelectedCityIndex(index)}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[15px] font-medium text-content-heading">
                            {cityName}
                          </span>
                          {country && <span className="text-xs text-content-muted">{country}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {showCityValidation && (
              <div className="mt-2 flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning-soft px-3 py-2">
                <Icon className="mt-0.5 h-4 w-4 text-warning" icon="mdi:alert-circle-outline" />
                <span className="text-sm text-warning/90">
                  {t('create.importOsm.selectCityFirst')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Provider Information */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-content-heading">
            {t('create.importOsm.step1Title')}
          </h2>

          <div className="flex flex-col gap-3">
            {/* Provider Name (editable with autocomplete) */}
            <div className="relative">
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-border bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="text-xs leading-[15px] text-content-muted">
                    {t('create.recommend.providerName')} *
                  </label>
                  <input
                    ref={providerNameInputRef}
                    aria-autocomplete="list"
                    aria-controls="provider-name-search-results"
                    aria-expanded={showProviderNameDropdown}
                    aria-label={t('create.recommend.providerName')}
                    className={cn(
                      'h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0',
                      !isCitySelected && 'cursor-not-allowed opacity-50',
                    )}
                    placeholder={t('create.recommend.providerNamePlaceholder')}
                    role="combobox"
                    value={formData.title}
                    onBlur={handleProviderNameInputBlur}
                    onChange={handleProviderNameInputChange}
                    onFocus={handleProviderNameInputFocus}
                    onKeyDown={handleProviderNameInputKeyDown}
                    {...(!isCitySelected && { disabled: true })}
                  />
                </div>
                {isProviderNameSearching && (
                  <Icon
                    className="ml-2 h-5 w-5 animate-spin text-content-muted"
                    icon="material-symbols:progress-activity"
                  />
                )}
              </div>

              {/* Provider Name Search Dropdown */}
              {showProviderNameDropdown && (
                <div
                  ref={providerNameDropdownRef}
                  className="absolute z-50 mt-1 max-h-[300px] w-full overflow-y-auto rounded-2xl border border-[#D4D4D4] bg-white shadow-lg"
                  id="provider-name-search-results"
                  role="listbox"
                >
                  {isProviderNameSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Icon
                        className="h-6 w-6 animate-spin text-primary"
                        icon="material-symbols:progress-activity"
                      />
                    </div>
                  ) : providerNameSearchResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-content-muted">
                      {providerNameSearchQuery.trim().length < 2
                        ? t('create.importOsm.typeToSearch')
                        : t('create.importOsm.noResults')}
                    </div>
                  ) : (
                    providerNameSearchResults.map((place, index) => {
                      const isSelected = index === selectedProviderNameIndex;

                      return (
                        <button
                          key={`${place.type}-${place.id}`}
                          aria-selected={isSelected}
                          className={cn(
                            'w-full px-4 py-3 text-left transition-colors',
                            'hover:bg-neutral-muted',
                            isSelected && 'bg-primary/5',
                          )}
                          role="option"
                          type="button"
                          onClick={() => handleProviderNameSelect(place)}
                          onMouseEnter={() => setSelectedProviderNameIndex(index)}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Icon
                                className={cn(
                                  'h-4 w-4 flex-shrink-0',
                                  place.placeType === 'mosque' ||
                                    place.placeType === 'islamic_center'
                                    ? 'text-primary'
                                    : 'text-content-muted',
                                )}
                                icon={
                                  place.placeType === 'mosque' ||
                                  place.placeType === 'islamic_center'
                                    ? 'mdi:mosque'
                                    : place.placeType === 'restaurant'
                                      ? 'mdi:silverware-fork-knife'
                                      : place.placeType === 'fast_food'
                                        ? 'mdi:food'
                                        : place.placeType === 'shop'
                                          ? 'mdi:store'
                                          : 'mdi:map-marker'
                                }
                              />
                              <span className="text-[15px] font-medium text-content-heading">
                                {place.name}
                              </span>
                            </div>
                            {place.address?.city && (
                              <div className="flex items-center gap-1 pl-6">
                                <span className="text-xs text-content-muted">
                                  {place.address.city}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Helper text - show when city is not selected */}
              {!isCitySelected && (
                <div className="mt-1 text-xs text-content-muted">
                  {t('create.importOsm.selectCityFirst')}
                </div>
              )}
            </div>

            {/* Category */}
            <div
              aria-label={t('create.recommend.selectCategory')}
              className="relative flex h-[56px] w-full cursor-pointer items-center rounded-2xl border border-border bg-white px-3 py-2"
              role="button"
              tabIndex={0}
              onClick={handleSelectCategory}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectCategory();
                }
              }}
            >
              <div className="flex h-[37px] w-full flex-col gap-1 pr-24">
                <div className="flex w-full items-center">
                  <label className="text-xs leading-[15px] text-content-muted">
                    {t('create.recommend.category')} *
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
                    {categoryDisplayName}
                  </span>
                </div>
              </div>
              {isCategoryAutoSelected && (
                <span className="absolute right-12 top-1/2 inline-flex h-[15px] -translate-y-1/2 items-center rounded-full border border-info/20 bg-info-soft px-2 text-[11px] leading-[15px] text-info">
                  {t('create.importOsm.autoSelectedCategory')}
                </span>
              )}
              <div className="absolute right-3 top-1/2 flex flex-shrink-0 -translate-y-1/2 items-center justify-center">
                <Icon
                  className="h-5 w-5 text-content-muted"
                  icon="material-symbols:chevron-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-content-heading">
              {t('create.recommend.contactTitle')}
            </h3>
            <p className="text-base text-content-muted">
              {t('create.recommend.contactDescription')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ContactCheckbox
              checked={selectedContacts.email}
              label={emailLabel}
              placeholder={emailPlaceholder}
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
              onToggle={handleEmailToggle}
            />

            <ContactCheckbox
              checked={selectedContacts.website}
              label={websiteLabel}
              placeholder={websitePlaceholder}
              type="url"
              value={formData.website}
              onChange={handleWebsiteChange}
              onToggle={handleWebsiteToggle}
            />

            <ContactCheckbox
              checked={selectedContacts.phone}
              label={phoneLabel}
              placeholder={phonePlaceholder}
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              onToggle={handlePhoneToggle}
            />

            <ContactCheckbox
              checked={selectedContacts.instagram}
              label={instagramLabel}
              placeholder={instagramPlaceholder}
              type="text"
              value={formData.instagram}
              onChange={handleInstagramChange}
              onToggle={handleInstagramToggle}
            />
          </div>
        </div>

        {/* Section 3: User Email - Only show for anonymous users */}
        {!user && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-content-heading">
                {t('create.recommend.userEmailTitle')}
              </h3>
              <p className="text-base text-content-muted">
                {t('create.recommend.userEmailDescription')}
              </p>
            </div>

            <div className="flex flex-col gap-0">
              <div className="flex h-[54px] w-full items-center rounded-2xl border border-border bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
                    {t('create.recommend.userEmailLabel')}
                  </label>
                  <input
                    aria-label={t('create.recommend.userEmailLabel')}
                    className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                    placeholder={t('create.recommend.userEmailPlaceholder')}
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, userEmail: e.target.value }))
                    }
                  />
                </div>
              </div>

              {formData.userEmail && (
                <p className="mt-1 text-xs leading-[15px] text-content-muted">
                  {t('legal.magicLinkConsent') || 'By continuing, you agree to our'}{' '}
                  <Link className="underline hover:text-primary" href="/terms">
                    {t('legal.termsOfService')}
                  </Link>{' '}
                  {t('legal.and')}{' '}
                  <Link className="underline hover:text-primary" href="/privacy-policy">
                    {t('legal.privacyPolicy')}
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Message (Optional) */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-content-heading">
              {t('create.recommend.message')}
            </h3>
            <p className="text-base text-content-muted">{t('common.optional')}</p>
          </div>

          <div className="flex min-h-[120px] w-full items-start rounded-2xl border border-border bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
                {t('create.recommend.message')} ({t('common.optional')})
              </label>
              <textarea
                aria-label={t('create.recommend.message')}
                className="min-h-[100px] w-full resize-none border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.messagePlaceholder')}
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isMobile && (
          <FooterAction
            actionButton={{
              disabled: !isFormValid || isSubmitting,
              label: isSubmitting ? t('create.recommend.submitting') : t('create.recommend.submit'),
              loading: isSubmitting,
              loadingText: t('create.recommend.submitting'),
              onClick: handleSubmit,
              variant: 'primary',
            }}
          />
        )}

        {/* Desktop Actions */}
        {!isMobile && (
          <div className="flex gap-4 pt-4">
            <Button disabled={isSubmitting} variant="secondary" onClick={handleBack}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
              loadingText={t('create.recommend.submitting')}
              variant="primary"
              onClick={handleSubmit}
            >
              {isSubmitting ? t('create.recommend.submitting') : t('create.recommend.submit')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
