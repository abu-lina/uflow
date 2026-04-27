'use client';

import { useState, useRef, useEffect } from 'react';
import { Hamburger, SlidersHorizontal, X } from 'lucide-react';

import { useSearch, LOCATION_ALL } from '@/providers/search-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { logSupabaseError } from '@/utils/errorUtils';

interface FigmaSearchBarProps {
  onSearchSubmit?: (query: string, category: string | null, location: string) => void;
  onClearSearch?: () => void;
  onLocationChange?: (location: string) => void;
  className?: string;
}

/**
 * Compact Figma-design search bar.
 *
 * Collapsed: [teal hamburger btn] [query • location text] [sliders filter btn]
 * Expanded:  [teal hamburger btn] [text input + clear]   [sliders filter btn → location dropdown]
 */
export function FigmaSearchBar({
  onSearchSubmit,
  onClearSearch,
  onLocationChange,
  className = '',
}: FigmaSearchBarProps) {
  const { searchQuery, setSearchQuery, selectedLocation, setSelectedLocation, selectedCategory } =
    useSearch();
  const { t } = useLanguage();

  const [isActive, setIsActive] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLocation =
    !selectedLocation || selectedLocation === LOCATION_ALL
      ? t('search.everywhere')
      : selectedLocation;

  const displayQuery = searchQuery || t('search.placeholder');

  // Fetch cities for the location dropdown
  useEffect(() => {
    async function fetchCities() {
      try {
        const { fetchProviderCities, fetchFilteredCities } = await import('@/services/providers');
        const cities =
          selectedCategory || searchQuery.trim()
            ? await fetchFilteredCities(selectedCategory, searchQuery)
            : await fetchProviderCities();
        setLocations(cities);
      } catch (error) {
        logSupabaseError('FigmaSearchBar.fetchCities', error);
        setLocations([]);
      }
    }
    void fetchCities();
  }, [selectedCategory, searchQuery]);

  // Close expanded state and location dropdown on outside click
  useEffect(() => {
    if (!isActive && !isLocationOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsActive(false);
        setIsLocationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isActive, isLocationOpen]);

  const handleActivate = () => {
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSearch = () => {
    onSearchSubmit?.(searchQuery, selectedCategory, selectedLocation);
    setIsActive(false);
    setIsLocationOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') setIsActive(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    onClearSearch?.();
    inputRef.current?.focus();
  };

  const handleLocationSelect = (loc: string) => {
    setSelectedLocation(loc);
    onLocationChange?.(loc);
    setIsLocationOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 shadow-sm ${className}`}
    >
      {/* Left: Teal hamburger button — submits search when active, activates input when collapsed */}
      <button
        aria-label={isActive ? t('search.submit') || 'Search' : t('search.open') || 'Open search'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-opacity active:opacity-80"
        type="button"
        onClick={isActive ? handleSearch : handleActivate}
      >
        <Hamburger aria-hidden="true" className="h-5 w-5" />
      </button>

      {/* Middle: text input (active) or display text (collapsed) */}
      <div className="mx-2 flex flex-1 items-center gap-1 overflow-hidden">
        {isActive ? (
          <>
            <input
              ref={inputRef}
              aria-label={t('search.placeholder') || 'Search'}
              className="w-full appearance-none border-none bg-transparent text-sm font-medium text-[#585858] outline-none placeholder:text-gray-400 focus:outline-none focus:ring-0"
              placeholder={t('search.placeholder')}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button
                aria-label={t('common.delete') || 'Clear'}
                className="shrink-0 rounded p-0.5 hover:bg-gray-100"
                type="button"
                onClick={handleClear}
              >
                <X aria-hidden="true" className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </>
        ) : (
          <button
            className="flex min-w-0 items-center gap-1 text-left"
            type="button"
            onClick={handleActivate}
          >
            <span className="truncate text-sm font-medium text-[#585858]">{displayQuery}</span>
            <span aria-hidden="true" className="shrink-0 text-[#585858]">
              •
            </span>
            <span className="shrink-0 text-sm font-medium text-[#585858]">{displayLocation}</span>
          </button>
        )}
      </div>

      {/* Right: Sliders icon — opens location dropdown */}
      <div ref={locationRef} className="relative shrink-0">
        <button
          aria-expanded={isLocationOpen}
          aria-haspopup="listbox"
          aria-label={t('search.filter') || 'Filter by location'}
          className="flex h-6 w-6 items-center justify-center rounded text-[#585858] transition-opacity hover:opacity-70"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLocationOpen((prev) => !prev);
          }}
        >
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>

        {isLocationOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-2 max-h-64 w-48 overflow-y-auto rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5"
            role="listbox"
          >
            <button
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                !selectedLocation || selectedLocation === LOCATION_ALL
                  ? 'font-semibold text-primary'
                  : 'text-[#585858]'
              }`}
              role="option"
              type="button"
              aria-selected={!selectedLocation || selectedLocation === LOCATION_ALL}
              onClick={() => handleLocationSelect(LOCATION_ALL)}
            >
              {t('search.everywhere')}
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  selectedLocation === loc ? 'font-semibold text-primary' : 'text-[#585858]'
                }`}
                role="option"
                type="button"
                aria-selected={selectedLocation === loc}
                onClick={() => handleLocationSelect(loc)}
              >
                {loc}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
