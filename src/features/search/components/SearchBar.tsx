'use client';
// React imports
import { Suspense, useEffect, useState, useRef } from 'react';

import { useSearchParams, usePathname } from 'next/navigation';

// Third-party imports
import { ChevronDown, Search, X } from 'lucide-react';

// Local imports
import { useSearch } from '@/providers/search-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { fetchUsedCategories, fetchFilteredCategories, type Category } from '@/services/categories';
import { logSupabaseError } from '@/utils/errorUtils';
import { fetchProviderCities, fetchFilteredCities } from '@/services/providers';

interface SearchBarProps {
  className?: string;
  hideCategoryFilter?: boolean;
  // Custom cities to use instead of fetching from database
  customCities?: string[];
  // Callbacks for parent to handle behavior
  onSearchSubmit?: (query: string, category: string | null, location: string) => void;
  onClearSearch?: () => void;
  onCategoryChange?: (category: string | null) => void;
  onLocationChange?: (location: string) => void;
}

function SearchBarContent({ 
  className = '', 
  hideCategoryFilter, 
  customCities,
  onSearchSubmit,
  onClearSearch,
  onCategoryChange,
  onLocationChange 
}: SearchBarProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  // State for input and dropdowns
  const [isTyping, setIsTyping] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedLocation,
    setSelectedLocation,
  } = useSearch();
  const [categories, setCategories] = useState<Category[]>([]);

  const [locations, setLocations] = useState<string[]>([t('search.everywhere')]);
  const hasSyncedFromUrl = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Helper function to get category name based on language
  const getCategoryName = (category: Category) => {
    if (language === 'en') {
      return category.name_en || category.name_de || category.category_id || t('search.unnamed');
    } else {
      return category.name_de || category.name_en || category.category_id || t('search.unnamed');
    }
  };

  // Handle clicks outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if clicking on the button itself
      const target = event.target as HTMLElement;
      const isButtonClick = target.closest('button[aria-expanded]');

      if (isButtonClick) {
        return;
      }

      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocationOpen(false);
      }
    }

    // Add event listener if any dropdown is open
    if (isCategoryOpen || isLocationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen, isLocationOpen]);

  // Fetch categories based on current filters
  useEffect(() => {
    async function fetchCategories() {
      try {
        // If we have location or search query filters, use filtered categories
        if ((selectedLocation && selectedLocation !== t('search.everywhere')) || searchQuery.trim()) {
          const filteredCategories = await fetchFilteredCategories(selectedLocation, searchQuery);
          setCategories(filteredCategories);
        } else {
          const allCategories = await fetchUsedCategories();
          setCategories(allCategories);
        }
      } catch (error) {
        logSupabaseError('SearchBar.fetchCategories', error);
        setCategories([]);
        // Re-throw to ensure error is visible in console
        if (error instanceof Error) {
          console.error('Error fetching categories:', error.message, error);
        } else {
          console.error('Error fetching categories:', error);
        }
      }
    }

    void fetchCategories();
  }, [selectedLocation, searchQuery, t]);

  // Fetch cities based on current filters
  useEffect(() => {
    async function fetchCities() {
      try {
        // If custom cities are provided, use them instead of fetching from database
        if (customCities) {
          setLocations([t('search.everywhere'), ...customCities]);
          return;
        }

        // If we have category or search query filters, use filtered cities
        if (selectedCategory || searchQuery.trim()) {
          const filteredCities = await fetchFilteredCities(selectedCategory, searchQuery);
          setLocations([t('search.everywhere'), ...filteredCities]);
        } else {
          // Otherwise, fetch all cities
          const allCities = await fetchProviderCities();
          setLocations([t('search.everywhere'), ...allCities]);
        }
      } catch (error) {
        logSupabaseError('SearchBar.fetchCities', error);
        setLocations([t('search.everywhere')]);
        // Re-throw to ensure error is visible in console
        if (error instanceof Error) {
          console.error('Error fetching cities:', error.message, error);
        } else {
          console.error('Error fetching cities:', error);
        }
      }
    }

    void fetchCities();
  }, [selectedCategory, searchQuery, customCities, t]);

  // Sync state with URL params only on initial mount or when the page changes
  useEffect(() => {
    if (!hasSyncedFromUrl.current) {
      const q = searchParams.get('q') || '';
      const category = searchParams.get('category') || null;
      const location = searchParams.get('location') || t('search.everywhere');
      setSearchQuery(q);
      setSelectedCategory(category === t('search.all') ? null : category);
      setSelectedLocation(location);
      hasSyncedFromUrl.current = true;
    }
  }, [pathname, searchParams, setSearchQuery, setSelectedCategory, setSelectedLocation, t]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handle search submission
  const handleSearch = () => {
    // Call parent callback to handle the search
    onSearchSubmit?.(searchQuery, selectedCategory, selectedLocation);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Helper to get the label for the selected category
  const getCategoryLabel = (catId: string | null) => {
    if (!catId || catId === t('search.all')) {
      return t('search.all');
    }
    const cat = categories.find((c) => c.category_id === catId);
    return cat ? getCategoryName(cat) : t('search.unnamed');
  };

  return (
    <div
      aria-label={t('search.ariaLabel')}
      className={`relative flex h-10 w-full flex-row items-center gap-4 rounded-lg bg-white px-2 ${className}`}
      role="search"
    >
      <div suppressHydrationWarning className="flex w-full flex-row items-center justify-between">
        {/* Search Section */}
        <div className="relative flex flex-1 flex-row items-center gap-0 sm:gap-4">
          <Search aria-hidden="true" className="size-6 shrink-0 text-[#1B1D1D]" />
          <input
            ref={inputRef}
            className={`w-full appearance-none truncate border-none bg-transparent px-1 text-base font-normal leading-[19px] outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${isTyping ? 'text-content' : 'text-gray-400'}`}
            placeholder={t('search.placeholder')}
            type="text"
            value={searchQuery}
            onBlur={() => setIsTyping(false)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsTyping(true);
            }}
            onFocus={() => setIsTyping(true)}
            onKeyDown={handleKeyPress}
          />
          {hasMounted && searchQuery && (
            <button
              aria-label={t('common.delete')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100 focus:outline-none"
              type="button"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
                // Call parent callback to handle clear
                onClearSearch?.();
              }}
            >
              <X className="text-gray-400" size={16} />
            </button>
          )}
        </div>

        {/* Filters Section */}
        <div className="flex flex-row items-center gap-4">
          {/* Divider */}
          <div className="h-6 border-l border-[#999999]" />

          {/* Categories */}
          {!hideCategoryFilter ? (
            <>
              <div className="relative flex flex-row items-center">
                <button
                  aria-expanded={isCategoryOpen}
                  aria-haspopup="listbox"
                  className="flex items-center gap-1"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCategoryOpen(!isCategoryOpen);
                    if (!isCategoryOpen) {
                      setIsLocationOpen(false);
                    }
                  }}
                >
                  <span className="base·font-normal·text-content max-w-[120px] truncate sm:max-w-none">
                    {getCategoryLabel(selectedCategory)}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-6·text-content transition-transform duration-200 ${
                      isCategoryOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isCategoryOpen && (
                  <div
                    ref={categoryDropdownRef}
                    className="dropdown-container absolute left-0 top-full z-50 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
                  >
                    <button
                      key="Alle"
                      className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                        !selectedCategory ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedCategory(null);
                        setIsCategoryOpen(false);
                        setIsLocationOpen(false);
                        // Call parent callback to handle category change
                        onCategoryChange?.(null);
                      }}
                    >
                      {t('search.all')}
                    </button>
                    {categories.map((cat, idx) => (
                      <button
                        key={cat.category_id || idx}
                        className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                          selectedCategory === cat.category_id ? 'bg-gray-50' : ''
                        }`}
                        onClick={() => {
                          const newCategory = cat.category_id ?? null;
                          setSelectedCategory(newCategory);
                          setIsCategoryOpen(false);
                          setIsLocationOpen(false);
                          // Call parent callback to handle category change
                          onCategoryChange?.(newCategory);
                        }}
                      >
                        {getCategoryName(cat)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Divider */}
              <div className="h-6 border-l border-[#999999]" />
            </>
          ) : null}

          {/* Location */}
          <div className="relative flex flex-row items-center">
            <button
              aria-expanded={isLocationOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLocationOpen(!isLocationOpen);
                if (!isLocationOpen) {
                  setIsCategoryOpen(false);
                }
              }}
            >
              <span className="text-base·font-normal·text-content max-w-[120px] truncate sm:max-w-none">
                {selectedLocation}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-6·text-content transition-transform duration-200 ${
                  isLocationOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isLocationOpen && (
              <div
                ref={locationDropdownRef}
                className="dropdown-container absolute right-0 top-full z-50 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                {locations.map((location) => (
                  <button
                    key={location}
                    className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                      location === selectedLocation ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedLocation(location);
                      setIsLocationOpen(false);
                      setIsCategoryOpen(false);
                      // Call parent callback to handle location change
                      onLocationChange?.(location);
                    }}
                  >
                    {location}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchBar(props: SearchBarProps) {
  return (
    <Suspense
      fallback={
        <div
          className={`
            flex h-10 w-full flex-row items-center gap-4 rounded-lg bg-white px-2
            ${props.className}
          `}
        >
          <div className="flex w-full flex-row items-center justify-between">
            <div className="relative flex flex-1 flex-row items-center gap-4">
              <Search aria-hidden="true" className="size-6 shrink-0 text-[#1B1D1D]" />
              <input
                disabled
                className="w-full appearance-none border-none bg-transparent text-base font-normal leading-[19px] text-gray-400 outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                placeholder="Search in your Ummah"
                type="text"
              />
            </div>
          </div>
        </div>
      }
    >
      <SearchBarContent {...props} />
    </Suspense>
  );
}

SearchBar.displayName = 'SearchBar';
