'use client';
// React imports
import { Suspense, useEffect, useState, useRef } from 'react';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Third-party imports
import { ChevronDown, Search, X } from 'lucide-react';

// Local imports
import { useSearch } from '@/providers/search-provider';
import { fetchUsedCategories, type Category } from '@/services/categories';
import { fetchSoukCities } from '@/services/souks';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string, category: string, location: string) => void;
  hideCategoryFilter?: boolean;
}

function SearchBarContent({ className = '', onSearch, hideCategoryFilter }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
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
  const [locations, setLocations] = useState<string[]>(['Überall']);
  const hasSyncedFromUrl = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    fetchUsedCategories()
      .then((data) => {
        setCategories(data);
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    fetchSoukCities()
      .then((cities) => {
        setLocations(['Überall', ...cities]);
      })
      .catch(() => {
        setLocations(['Überall']);
      });
  }, []);

  // Sync state with URL params only on initial mount or when the page changes
  useEffect(() => {
    if (!hasSyncedFromUrl.current) {
      const q = searchParams.get('q') || '';
      const category = searchParams.get('category') || null;
      const location = searchParams.get('location') || 'Überall';
      setSearchQuery(q);
      setSelectedCategory(category === 'Alle' ? null : category);
      setSelectedLocation(location);
      hasSyncedFromUrl.current = true;
    }
  }, [pathname, searchParams, setSearchQuery, setSelectedCategory, setSelectedLocation]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handle search submission
  const handleSearch = () => {
    onSearch?.(searchQuery, selectedCategory ?? 'Alle', selectedLocation);
    // Navigate to souks page with search parameters
    const searchParams = new URLSearchParams();
    if (searchQuery) {
      searchParams.set('q', searchQuery);
    }
    if (selectedLocation) {
      searchParams.set('location', selectedLocation);
    }
    router.push(`/souks?${searchParams.toString()}`);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Helper to get the label for the selected category
  const getCategoryLabel = (catId: string | null) => {
    if (!catId || catId === 'Alle') {
      return 'Alle';
    }
    const cat = categories.find((c) => c.category_id === catId);
    return cat?.name_de || cat?.category_id || 'Unbenannt';
  };

  return (
    <div
      aria-label="Suche in der Ummah"
      className={`flex h-10 flex-row items-center gap-4 rounded-lg bg-white px-2 ${className}`}
      role="search"
    >
      <div className="flex w-full flex-row items-center justify-between">
        {/* Search Section */}
        <div className="relative flex flex-1 flex-row items-center gap-0 sm:gap-4">
          <Search aria-hidden="true" className="size-6 shrink-0 text-[#1B1D1D]" />
          <input
            ref={inputRef}
            className={`w-full appearance-none truncate border-none bg-transparent px-1 text-base font-normal leading-[19px] outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${isTyping ? 'text-content' : 'text-gray-400'}`}
            placeholder="In deiner Ummah suchen"
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
              aria-label="Eingabe löschen"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100 focus:outline-none"
              type="button"
              onClick={() => {
                // Remove 'q' from the URL but keep other filters
                const params = new URLSearchParams(window.location.search);
                params.delete('q');
                if (selectedCategory) {
                  params.set('category', selectedCategory);
                }
                if (selectedLocation) {
                  params.set('location', selectedLocation);
                }
                router.push(`/souks?${params.toString()}`);
                setSearchQuery('');
                inputRef.current?.focus();
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
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
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
                  <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
                    <button
                      key="Alle"
                      className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                        !selectedCategory ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedCategory(null);
                        setIsCategoryOpen(false);
                        const params = new URLSearchParams();
                        if (searchQuery) {
                          params.set('q', searchQuery);
                        }
                        if (selectedLocation) {
                          params.set('location', selectedLocation);
                        }
                        router.push(`/souks?${params.toString()}`);
                      }}
                    >
                      Alle
                    </button>
                    {categories.map((cat, idx) => (
                      <button
                        key={cat.category_id || idx}
                        className={`$ {selectedCategory === cat.category_id ? 'bg-gray-50' : ''}
                      block w-full px-4
                        py-2 text-left
                        text-base hover:bg-gray-50
                    `}
                        onClick={() => {
                          setSelectedCategory(cat.category_id ?? null);
                          setIsCategoryOpen(false);
                          const params = new URLSearchParams();
                          if (searchQuery) {
                            params.set('q', searchQuery);
                          }
                          if (cat.category_id) {
                            params.set('category', cat.category_id);
                          }
                          if (selectedLocation) {
                            params.set('location', selectedLocation);
                          }
                          router.push(`/souks?${params.toString()}`);
                        }}
                      >
                        {cat.name_de || cat.category_id || 'Unbenannt'}
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
              onClick={() => setIsLocationOpen(!isLocationOpen)}
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
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
                {locations.map((location) => (
                  <button
                    key={location}
                    className={`$ {location === selectedLocation ? 'bg-gray-50' : ''}
                      block w-full px-4
                        py-2 text-left
                        text-base hover:bg-gray-50
                    `}
                    onClick={() => {
                      setSelectedLocation(location);
                      setIsLocationOpen(false);
                      const params = new URLSearchParams();
                      if (searchQuery) {
                        params.set('q', searchQuery);
                      }
                      if (selectedCategory) {
                        params.set('category', selectedCategory);
                      }
                      if (location) {
                        params.set('location', location);
                      }
                      router.push(`/souks?${params.toString()}`);
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
            flex h-10 flex-row items-center gap-4 rounded-lg bg-white px-2
            ${props.className}
          `}
        >
          <div className="flex w-full flex-row items-center justify-between">
            <div className="relative flex flex-1 flex-row items-center gap-4">
              <Search aria-hidden="true" className="size-6 shrink-0 text-[#1B1D1D]" />
              <input
                disabled
                className="w-full appearance-none border-none bg-transparent text-base font-normal leading-[19px] text-gray-400 outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                placeholder="In deiner Ummah suchen"
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
