'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { createProviderOrService } from '@/services/providerService';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { RecommendSuccessScreen } from '@/components/shared/RecommendSuccessScreen';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/supabase';
import { getCategories } from '@/services/categories';
import { normalizeCountryNameForDisplay } from '@/utils/addressValidation';

interface StreamlinedRecommendFormProps {
  onSuccess?: () => void;
  initialCity?: string;
}

// ContactCheckbox component - MUST be outside parent component for memo to work
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

const ContactCheckbox = memo(({
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

  // Focus input when checkbox is checked
  useEffect(() => {
    if (checked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [checked]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = autoFormat ? autoFormat(e.target.value) : e.target.value;
    onChange(newValue);
  }, [onChange, autoFormat]);

  return (
    <div
      aria-checked={checked}
      className={cn(
        'flex w-full items-center rounded-2xl border border-border bg-white px-3 py-2 cursor-pointer transition-[height,min-height]',
        checked ? 'min-h-[54px]' : 'h-[54px]'
      )}
      role="checkbox"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full flex-row items-center gap-2">
        {/* Checkbox Icon */}
        <div className="flex-shrink-0">
          <Icon
            className="h-6 w-6 text-content"
            icon={checked ? 'lucide:square-check' : 'lucide:square'}
          />
        </div>

        {/* Label + Input Container */}
        <div className="flex flex-1 flex-col gap-1">
          {checked ? (
            <>
              {/* Small label when checked */}
              <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
                {label}
              </label>
              {/* Input field */}
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
            /* Large label when unchecked */
            <span className="font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  // Only re-render if relevant props changed
  if (prevProps.checked !== nextProps.checked) return false;
  if (prevProps.value !== nextProps.value) return false;
  if (prevProps.label !== nextProps.label) return false;
  if (prevProps.placeholder !== nextProps.placeholder) return false;
  if (prevProps.type !== nextProps.type) return false;
  if (prevProps.onToggle !== nextProps.onToggle) return false;
  if (prevProps.onChange !== nextProps.onChange) return false;
  if (prevProps.autoFormat !== nextProps.autoFormat) return false;
  // All props are equal, skip re-render
  return true;
});

ContactCheckbox.displayName = 'ContactCheckbox';

interface RecommendFormData {
  // Step 1: Basics (all required)
  title: string;
  category: string;
  city: string;
  offers_ids: string[];
  
  // Step 2: Contact (at least one required)
  email: string;
  phone: string;
  website: string;
  instagram: string;
  userEmail: string; // User's email for follow-up
  message: string; // optional
}

interface SavedRecommendFormData {
  formData: RecommendFormData;
  selectedContacts: {
    email: boolean;
    phone: boolean;
    website: boolean;
    instagram: boolean;
  };
}

const RECOMMEND_FORM_STORAGE_KEY = 'recommendFormData';

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

export function StreamlinedRecommendForm({ onSuccess: _onSuccess, initialCity }: StreamlinedRecommendFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData: contextFormData, updateFormData, setCreationMode } = useFormData();
  const { t, language } = useLanguage();
  const isMobile = useIsSmallMobile();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === 'true';
  const [categories, setCategories] = useState<Category[]>([]);
  const userEmailInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const cityInitializedRef = useRef(false); // Track if initial city has been loaded
  const formDataInitializedRef = useRef(false); // Track if form data has been loaded from storage
  
  // City search state
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [citySearchResults, setCitySearchResults] = useState<NominatimCityResult[]>([]);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
  const citySearchAbortControllerRef = useRef<AbortController | null>(null);
  
  // Initialize form state - use lazy initializer to check localStorage first
  const [formData, setFormData] = useState<RecommendFormData>(() => {
    if (typeof window === 'undefined') {
      return {
        title: contextFormData.title || '',
        category: contextFormData.category || '',
        city: initialCity || '',
        offers_ids: contextFormData.offers_ids || [],
        email: contextFormData.email || '',
        phone: contextFormData.phone || '',
        website: contextFormData.website || '',
        instagram: contextFormData.instagram || '',
        userEmail: '',
        message: contextFormData.description || '',
      };
    }

    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(RECOMMEND_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedRecommendFormData;
        // Prioritize contextFormData.category/offers if they exist (user just selected them)
        return {
          ...parsed.formData,
          category: contextFormData.category || parsed.formData.category,
          offers_ids: (contextFormData.offers_ids && contextFormData.offers_ids.length > 0)
            ? contextFormData.offers_ids
            : parsed.formData.offers_ids,
        };
      }
    } catch (error) {
      console.error('[StreamlinedRecommendForm] Error loading initial form data:', error);
    }

    // Fallback to contextFormData and initialCity
    return {
      title: contextFormData.title || '',
      category: contextFormData.category || '',
      city: initialCity || '',
      offers_ids: contextFormData.offers_ids || [],
      email: contextFormData.email || '',
      phone: contextFormData.phone || '',
      website: contextFormData.website || '',
      instagram: contextFormData.instagram || '',
      userEmail: '',
      message: contextFormData.description || '',
    };
  });

  // Initialize selected contacts - use lazy initializer to check localStorage first
  const [selectedContacts, setSelectedContacts] = useState<{
    email: boolean;
    phone: boolean;
    website: boolean;
    instagram: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return {
        email: false,
        phone: false,
        website: false,
        instagram: false,
      };
    }

    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(RECOMMEND_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedRecommendFormData;
        return parsed.selectedContacts;
      }
    } catch (error) {
      console.error('[StreamlinedRecommendForm] Error loading initial contacts:', error);
    }

    // Fallback: determine from formData if fields have values
    // Note: This will use the formData from the useState above
    try {
      const saved = localStorage.getItem(RECOMMEND_FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedRecommendFormData;
        return {
          email: !!parsed.formData.email,
          phone: !!parsed.formData.phone,
          website: !!parsed.formData.website,
          instagram: !!parsed.formData.instagram,
        };
      }
    } catch {
      // Ignore
    }

    return {
      email: false,
      phone: false,
      website: false,
      instagram: false,
    };
  });
  

  // Helper function to load saved recommend form data
  const loadSavedRecommendFormData = useCallback((): SavedRecommendFormData | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const saved = localStorage.getItem(RECOMMEND_FORM_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as SavedRecommendFormData;
      }
    } catch (error) {
      console.error('[StreamlinedRecommendForm] Error loading saved form data:', error);
    }
    return null;
  }, []);

  // Helper function to save recommend form data
  const saveRecommendFormData = useCallback((data: RecommendFormData, contacts: typeof selectedContacts) => {
    if (typeof window === 'undefined') return;
    
    try {
      const dataToSave: SavedRecommendFormData = {
        formData: data,
        selectedContacts: contacts,
      };
      localStorage.setItem(RECOMMEND_FORM_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('[StreamlinedRecommendForm] Error saving form data:', error);
    }
  }, []);

  // Helper function to clear saved recommend form data
  const clearSavedRecommendFormData = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RECOMMEND_FORM_STORAGE_KEY);
  }, []);

  // Set creation mode to recommendation on mount
  useEffect(() => {
    setCreationMode('recommendation');
  }, [setCreationMode]);

  // Load saved form data from localStorage on mount and sync with context
  useEffect(() => {
    if (!formDataInitializedRef.current && typeof window !== 'undefined') {
      formDataInitializedRef.current = true;
      
      const saved = loadSavedRecommendFormData();
      if (saved) {
        // Restore form data, but prioritize contextFormData.category/offers if they exist
        // (user might have just selected them on sub-pages)
        const restoredFormData = {
          ...saved.formData,
          // Use contextFormData category/offers if they exist (newly selected), otherwise use saved
          category: contextFormData.category || saved.formData.category,
          offers_ids: (contextFormData.offers_ids && contextFormData.offers_ids.length > 0) 
            ? contextFormData.offers_ids 
            : saved.formData.offers_ids,
        };
        setFormData(restoredFormData);
        // Restore selected contacts - ensure checkboxes match field values
        setSelectedContacts({
          email: saved.selectedContacts.email || !!saved.formData.email,
          phone: saved.selectedContacts.phone || !!saved.formData.phone,
          website: saved.selectedContacts.website || !!saved.formData.website,
          instagram: saved.selectedContacts.instagram || !!saved.formData.instagram,
        });
        // Sync with contextFormData to ensure all data is available in context
        updateFormData({
          title: restoredFormData.title,
          category: restoredFormData.category,
          city: restoredFormData.city,
          offers_ids: restoredFormData.offers_ids,
          email: restoredFormData.email,
          phone: restoredFormData.phone,
          website: restoredFormData.website,
          instagram: restoredFormData.instagram,
          description: restoredFormData.message,
        });
        // Mark city as initialized since we loaded it from saved data
        cityInitializedRef.current = true;
      } else {
        // No saved form data, so initialize from contextFormData or defaults
        if (contextFormData.category) {
          setFormData(prev => ({ ...prev, category: contextFormData.category }));
        }
        if (contextFormData.offers_ids && contextFormData.offers_ids.length > 0) {
          setFormData(prev => ({ ...prev, offers_ids: contextFormData.offers_ids }));
        }
        // Initialize city from initialCity or localStorage
        if (!cityInitializedRef.current) {
          cityInitializedRef.current = true;
          
          // Use initialCity prop if provided and formData.city is empty
          if (initialCity && !formData.city) {
            setFormData(prev => ({ ...prev, city: initialCity }));
          } else if (!formData.city) {
            // Fallback to localStorage/sessionStorage
            const savedCity = localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity');
            if (savedCity) {
              setFormData(prev => ({ ...prev, city: savedCity }));
            }
          }
        }
      }
    }
  }, [loadSavedRecommendFormData, initialCity, updateFormData, formData.city, contextFormData.category, contextFormData.offers_ids]);

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
        }
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
    setFormData(prev => ({ ...prev, city: cityName }));
    setCitySearchQuery('');
    setCitySearchResults([]);
    setShowCityDropdown(false);
    setSelectedCityIndex(-1);
    cityInputRef.current?.blur();
  }, []);

  // Handle city input change
  const handleCityInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, city: value }));
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
  const handleCityInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCityDropdown || citySearchResults.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCityIndex((prev) => 
        prev < citySearchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCityIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedCityIndex >= 0 && citySearchResults[selectedCityIndex]) {
      e.preventDefault();
      handleCitySelect(citySearchResults[selectedCityIndex]);
    } else if (e.key === 'Escape') {
      setShowCityDropdown(false);
      setSelectedCityIndex(-1);
    }
  }, [showCityDropdown, citySearchResults, selectedCityIndex, handleCitySelect]);

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

  // Sync with context formData when it changes (from navigation)
  // This ensures that when user selects category/offers on sub-pages, it updates local formData
  useEffect(() => {
    // Always sync category if it exists in contextFormData (user just selected it)
    if (contextFormData.category && contextFormData.category !== formData.category) {
      setFormData(prev => ({ ...prev, category: contextFormData.category }));
    }
    // Always sync offers_ids if they exist in contextFormData (user just selected them)
    if (contextFormData.offers_ids && contextFormData.offers_ids.length > 0 && 
        JSON.stringify(contextFormData.offers_ids) !== JSON.stringify(formData.offers_ids)) {
      setFormData(prev => ({ ...prev, offers_ids: contextFormData.offers_ids }));
    }
  }, [contextFormData.category, contextFormData.offers_ids, formData.category, formData.offers_ids]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (formDataInitializedRef.current) {
      saveRecommendFormData(formData, selectedContacts);
    }
  }, [formData, selectedContacts, saveRecommendFormData]);

  // Helper to get category name - memoized
  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(c => c.category_id === categoryId);
    if (!category) return '';
    if (language === 'en') {
      return category.name_en || category.name_de || '';
    }
    return category.name_de || category.name_en || '';
  }, [categories, language]);

  // Memoize category name display to prevent re-renders
  const categoryDisplayName = useMemo(() => {
    return formData.category ? getCategoryName(formData.category) : t('create.recommend.selectCategory');
  }, [formData.category, getCategoryName, t]);

  // Validation - memoized to prevent unnecessary re-renders
  const isFormValid = useMemo(() => {
    const hasBasics = !!formData.title && !!formData.category && !!formData.city;
    const hasContact = 
      (selectedContacts.email && formData.email.trim().length > 0) ||
      (selectedContacts.phone && formData.phone.trim().length > 0) ||
      (selectedContacts.website && formData.website.trim().length > 0) ||
      (selectedContacts.instagram && formData.instagram.trim().length > 0);
    return hasBasics && hasContact;
  }, [formData.title, formData.category, formData.city, formData.email, formData.phone, formData.website, formData.instagram, selectedContacts.email, selectedContacts.phone, selectedContacts.website, selectedContacts.instagram]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  // Handle "Weiteren Anbieter empfehlen" - reset form and show form again
  const handleRecommendAnother = useCallback(() => {
    // Remove success param from URL to show form again
    router.replace('/create/recommend', { scroll: false });
    // Reset form data
    setFormData({
      title: '',
      category: '',
      city: initialCity || '',
      offers_ids: [],
      email: '',
      phone: '',
      website: '',
      instagram: '',
      userEmail: '',
      message: '',
    });
    // Reset contact checkboxes
    setSelectedContacts({
      email: false,
      phone: false,
      website: false,
      instagram: false,
    });
    // Clear context form data
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
    // Clear saved form data from localStorage
    clearSavedRecommendFormData();
  }, [initialCity, updateFormData, router, clearSavedRecommendFormData]);

  // Handle "Zurück zur Übersicht" - navigate to home
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
      } else if (!formData.city) {
        toast.error(t('create.recommend.cityRequired'));
      } else {
        toast.error(t('create.recommend.contactRequired'));
      }
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare formData for service function
      const serviceFormData = {
        ...contextFormData,
        title: formData.title,
        category: formData.category,
        city: formData.city,
        offers_ids: formData.offers_ids,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        instagram: formData.instagram,
        userEmail: formData.userEmail,
        description: formData.message,
        creationMode: 'recommendation' as const,
        entityType: 'provider' as const,
        isOnlineBusiness: false,
        street: '',
        zip: '',
        country: '',
        showAddress: false,
        needs_ids: [],
        images: [],
        selectedCommunityServiceIds: [],
        tags: [],
        socialCategory: '',
        socialTitle: '',
        socialDescription: '',
      };

      await createProviderOrService(
        serviceFormData,
        null, // Anonymous user
        true // Recommendation mode
      );

      // Clear form data
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
      // Also clear local userEmail state
      setFormData(prev => ({ ...prev, userEmail: '' }));
      // Clear selected contacts
      setSelectedContacts({
        email: false,
        phone: false,
        website: false,
        instagram: false,
      });
      // Clear saved form data from localStorage
      clearSavedRecommendFormData();

      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });

      // Show success screen by updating URL
      router.replace('/create/recommend?success=true', { scroll: false });
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast.error(t('create.recommend.error'));
    } finally {
      setIsSubmitting(false);
    }
    }, [formData, isFormValid, contextFormData, updateFormData, queryClient, router, t, clearSavedRecommendFormData]);

  // Navigate to category selection
  const handleSelectCategory = useCallback(() => {
    // Save current form state
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

  // Memoized handlers for ContactCheckbox components to prevent unnecessary re-renders
  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
  }, []);

  const handleEmailToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.email;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, email: '' }));
      }
      return { ...prev, email: !prev.email };
    });
  }, []);

  const handleWebsiteChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, website: value }));
  }, []);

  const handleWebsiteToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.website;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, website: '' }));
      }
      return { ...prev, website: !prev.website };
    });
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
  }, []);

  const handlePhoneToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.phone;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, phone: '' }));
      }
      return { ...prev, phone: !prev.phone };
    });
  }, []);

  const handleInstagramChange = useCallback((value: string) => {
    // Auto-add @ if user types without it
    let formattedValue = value;
    if (formattedValue && !formattedValue.startsWith('@')) {
      formattedValue = '@' + formattedValue;
    }
    setFormData(prev => ({ ...prev, instagram: formattedValue }));
  }, []);

  const handleInstagramToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.instagram;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, instagram: '' }));
      }
      return { ...prev, instagram: !prev.instagram };
    });
  }, []);

  // Memoize translation strings to prevent ContactCheckbox re-renders
  const emailLabel = useMemo(() => t('create.recommend.email'), [t]);
  const emailPlaceholder = useMemo(() => t('create.recommend.emailPlaceholder'), [t]);
  const websiteLabel = useMemo(() => t('create.recommend.website'), [t]);
  const websitePlaceholder = useMemo(() => t('create.recommend.websitePlaceholder'), [t]);
  const phoneLabel = useMemo(() => t('create.recommend.phone'), [t]);
  const phonePlaceholder = useMemo(() => t('create.recommend.phonePlaceholder'), [t]);
  const instagramLabel = useMemo(() => t('create.recommend.instagram'), [t]);
  const instagramPlaceholder = useMemo(() => t('create.recommend.instagramPlaceholder'), [t]);

  // Show success screen if submission was successful
  if (showSuccess) {
    return (
      <RecommendSuccessScreen
        onGoBack={handleGoBack}
        onRecommendAnother={handleRecommendAnother}
      />
    );
  }

  return (
    <div className={cn(
      'flex flex-col gap-6',
      // Add extra bottom padding on mobile to account for fixed FooterAction
      isMobile ? 'pb-[calc(80px+24px+env(safe-area-inset-bottom))]' : 'pb-8'
    )}>
      {/* Section 1: Basics */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-content-heading">{t('create.recommend.step1Title')}</h2>
        
        <div className="flex flex-col gap-3">
          {/* Provider Name */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.providerName')} *
              </label>
              <input
                aria-label={t('create.recommend.providerName')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.providerNamePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>

          {/* Category */}
          <div 
            aria-label={t('create.recommend.selectCategory')}
            className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 cursor-pointer relative"
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
            <div className="flex w-full flex-col gap-1 pr-6">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.category')} *
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
                  {categoryDisplayName}
                </span>
              </div>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-content-muted" icon="material-symbols:chevron-right" />
            </div>
          </div>

          {/* City */}
          <div className="relative">
            <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
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
                className="absolute z-50 mt-1 w-full max-h-[300px] overflow-y-auto rounded-2xl border border-[#D4D4D4] bg-white shadow-lg"
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
                    const cityName = city.address?.city || city.address?.town || city.address?.village || city.name;
                    const country = normalizeCountryNameForDisplay(city.address?.country || '');
                    const isSelected = index === selectedCityIndex;

                    return (
                      <button
                        key={city.place_id}
                        aria-selected={isSelected}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors',
                          'hover:bg-neutral-muted',
                          isSelected && 'bg-primary/5'
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
                          {country && (
                            <span className="text-xs text-content-muted">{country}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Contact */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-content-heading">{t('create.recommend.contactTitle')}</h3>
          <p className="text-base text-content-muted">
            {t('create.recommend.contactDescription')}
          </p>
        </div>

        {/* Contact Checkboxes */}
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

      {/* Section 3: User Email */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-content-heading">{t('create.recommend.userEmailTitle')}</h3>
          <p className="text-base text-content-muted">
            {t('create.recommend.userEmailDescription')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* User Email Input */}
          <div className="flex h-[54px] w-full items-center rounded-2xl border border-border bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
                {t('create.recommend.userEmailLabel')}
              </label>
              <input
                ref={userEmailInputRef}
                aria-label={t('create.recommend.userEmailLabel')}
                className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.userEmailPlaceholder')}
                type="email"
                value={formData.userEmail}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const cursorPosition = e.target.selectionStart || newValue.length;
                  setFormData(prev => ({ ...prev, userEmail: newValue }));
                  // Maintain focus and cursor position after state update
                  setTimeout(() => {
                    if (userEmailInputRef.current) {
                      userEmailInputRef.current.focus();
                      userEmailInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                    }
                  }, 0);
                }}
              />
            </div>
          </div>

          {/* Message (Optional) */}
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
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
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
          <Button
            disabled={isSubmitting}
            variant="secondary"
            onClick={handleBack}
          >
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
  );
}

