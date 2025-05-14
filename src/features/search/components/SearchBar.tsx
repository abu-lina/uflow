// React imports
import { useEffect, useState, useRef } from 'react';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Third-party imports
import { ChevronDown, Search } from 'lucide-react';

// Local imports
import { useSearch } from '@/providers/search-provider';
import { fetchUsedCategories, type Category } from '@/services/categories';
import { fetchSoukCities } from '@/services/souks';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string, category: string, location: string) => void;
}

export function SearchBar({ className = '', onSearch }: SearchBarProps) {
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

  // Debug: log categories before rendering (removed for production)
  // console.log('Categories in state:', categories);

  return (
    <div
      aria-label="Suche in der Ummah"
      className={`flex h-10 flex-row items-center gap-4 rounded-lg bg-white px-2 ${className}`}
      role="search"
    >
      <div className="flex w-full flex-row items-center justify-between">
        {/* Search Section */}
        <div className="flex flex-1 flex-row items-center gap-4">
          <Search aria-hidden="true" className="size-6 shrink-0 text-[#1B1D1D]" />
          <input
            className={`w-full appearance-none border-none bg-transparent text-base font-normal leading-[19px] outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${isTyping ? 'text-content' : 'text-gray-400'}`}
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
        </div>

        {/* Filters Section */}
        <div className="flex flex-row items-center gap-4">
          {/* Divider */}
          <div className="h-6·border-l·border-content" />

          {/* Categories */}
          <div className="relative flex flex-row items-center">
            <button
              aria-expanded={isCategoryOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1"
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <span className="base·font-normal·text-content">
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
          <div className="h-6·border-l·border-content" />

          {/* Location */}
          <div className="relative flex flex-row items-center">
            <button
              aria-expanded={isLocationOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1"
              type="button"
              onClick={() => setIsLocationOpen(!isLocationOpen)}
            >
              <span className="text-base·font-normal·text-content">{selectedLocation}</span>
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

SearchBar.displayName = 'SearchBar';
