'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Section } from '@/providers/search-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import type { GeolocationStatus } from '@/hooks/useGeolocation';
import { DiscoveryFilterBar } from './DiscoveryFilterBar';

interface HomeSearchBarProps {
  /** The currently active section — used for sliders navigation and search submission */
  activeSection: Section;
  className?: string;
  geoStatus?: GeolocationStatus;
  nearMeActive?: boolean;
  isOpenNow?: boolean;
  onToggleNearMe?: () => void;
  onToggleOpenNow?: () => void;
  /** Optional admin-only content rendered inline with the filter chips. */
  adminSlot?: React.ReactNode;
  /** When provided, called on every keystroke instead of using internal state. */
  onQueryChange?: (query: string) => void;
  /** When provided, called on Enter/submit instead of navigating to /providers. */
  onSearchSubmit?: (query: string) => void;
  /** Controlled query value — use with onQueryChange for external state. */
  query?: string;
  /** Hide the DiscoveryFilterBar (near-me / open-now chips). */
  hideFilters?: boolean;
}

/**
 * Plan 090 M2 / Plan 091 M3: Home screen search affordance.
 *
 * Renders an inline search bar with a sliders button and delegates
 * the filter chip row to DiscoveryFilterBar. Typing and pressing
 * Enter navigates to the providers results page with the query
 * pre-filled; the sliders button navigates to /search for the full
 * filter experience.
 *
 * Does NOT use autoFocus to avoid triggering the iOS PWA keyboard on
 * home page load.
 */
export function HomeSearchBar({
  activeSection,
  className = '',
  geoStatus = 'idle',
  nearMeActive = false,
  isOpenNow = false,
  onToggleNearMe,
  onToggleOpenNow,
  adminSlot,
  onQueryChange,
  onSearchSubmit,
  query: controlledQuery,
  hideFilters = false,
}: HomeSearchBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [internalQuery, setInternalQuery] = useState('');

  // Support controlled and uncontrolled modes
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  const handleSubmit = () => {
    if (onSearchSubmit) {
      onSearchSubmit(query);
      return;
    }
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/providers?q=${encodeURIComponent(trimmed)}&section=${activeSection}`);
    } else {
      router.push(`/search?section=${activeSection}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Guard against ancestor form submission overriding our route push.
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        aria-label={t('home.searchAriaLabel')}
        className="flex h-12 items-center gap-0 rounded-xl border border-gray-200 bg-white px-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
        role="search"
      >
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-400" />
        <input
          className="flex-1 min-w-0 appearance-none border-0 bg-transparent text-sm text-gray-800 shadow-none outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0"
          placeholder={t('home.searchPlaceholder')}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span aria-hidden="true" className="h-5 w-px bg-gray-200" />
        <button
          aria-label={t('home.searchFiltersAriaLabel')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-500 transition-opacity hover:opacity-70 active:opacity-50"
          type="button"
          onClick={() => router.push(`/search?section=${activeSection}`)}
        >
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {!hideFilters && (
        <DiscoveryFilterBar
          geoStatus={geoStatus}
          nearMeActive={nearMeActive}
          openNowActive={isOpenNow}
          onToggleNearMe={onToggleNearMe ?? (() => {})}
          onToggleOpenNow={onToggleOpenNow ?? (() => {})}
          adminSlot={adminSlot}
        />
      )}
    </div>
  );
}
