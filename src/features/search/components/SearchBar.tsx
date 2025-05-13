// React imports
import { useEffect, useState } from 'react';

// Third-party imports
import { ChevronDown, Search } from 'lucide-react';

// Local imports
import { useSearch } from '@/providers/search-provider';
import { fetchUsedCategories, type Category } from '@/services/categories';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string, category: string, location: string) => void;
}

export function SearchBar({ className = '', onSearch }: SearchBarProps) {
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

  // Available options
  const locations = ['Überall', 'Berlin', 'Hamburg', 'München', 'Köln'];

  useEffect(() => {
    fetchUsedCategories()
      .then((data) => {
        setCategories(data);
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  // Handle search submission
  const handleSearch = () => {
    onSearch?.(searchQuery, selectedCategory ?? 'Alle', selectedLocation);
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
          <Search aria-hidden="true" className="size-6 shrink-0 text-primary" />
          <input
            className={`w-full appearance-none border-none bg-transparent text-base font-normal leading-[19px] outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${isTyping ? 'text-primary' : 'text-gray-400'}`}
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
          <div className="h-6 border-l border-primary" />

          {/* Categories */}
          <div className="relative flex flex-row items-center">
            <button
              aria-expanded={isCategoryOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1"
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <span className="text-base font-normal text-gray-600">
                {getCategoryLabel(selectedCategory)}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-6 text-primary transition-transform duration-200 ${
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
                  }}
                >
                  Alle
                </button>
                {categories.map((cat, idx) => (
                  <button
                    key={cat.category_id || idx}
                    className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                      selectedCategory === cat.category_id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedCategory(cat.category_id ?? null);
                      setIsCategoryOpen(false);
                    }}
                  >
                    {cat.name_de || cat.category_id || 'Unbenannt'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 border-l border-primary" />

          {/* Location */}
          <div className="relative flex flex-row items-center">
            <button
              aria-expanded={isLocationOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1"
              type="button"
              onClick={() => setIsLocationOpen(!isLocationOpen)}
            >
              <span className="text-base font-normal text-gray-600">{selectedLocation}</span>
              <ChevronDown
                aria-hidden="true"
                className={`size-6 text-primary transition-transform duration-200 ${
                  isLocationOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isLocationOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
                {locations.map((location) => (
                  <button
                    key={location}
                    className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                      location === selectedLocation ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedLocation(location);
                      setIsLocationOpen(false);
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
