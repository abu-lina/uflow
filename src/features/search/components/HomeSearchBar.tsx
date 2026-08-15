'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import type { Section } from '@/providers/search-provider';
import { useLanguage } from '@/providers/LanguageProvider';

interface HomeSearchBarProps {
  /** The currently active section — used for sliders navigation and search submission */
  activeSection: Section;
  className?: string;
  isNearMe?: boolean;
  isOpenNow?: boolean;
  onNearMeChange?: (v: boolean) => void;
  onOpenNowChange?: (v: boolean) => void;
}

/**
 * Plan 090 M2 / Plan 091 M3: Home screen search affordance.
 *
 * Renders an inline search bar with a sliders button:
 * - Typing and pressing Enter navigates to the providers results page
 *   with the query pre-filled (/providers?q=...&section=...).
 * - The SlidersHorizontal button navigates to /search?section=... for
 *   the full filter experience.
 *
 * Does NOT use autoFocus to avoid triggering the iOS PWA keyboard on
 * home page load.
 */
export function HomeSearchBar({
  activeSection,
  className = '',
  isNearMe = false,
  isOpenNow = false,
  onNearMeChange,
  onOpenNowChange,
}: HomeSearchBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const placeholder = t('home.searchPlaceholder');
  const ariaLabel = t('home.searchAriaLabel');

  const handleSubmit = () => {
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

  const handleSlidersClick = () => {
    router.push(`/search?section=${activeSection}`);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        aria-label={ariaLabel}
        className="flex h-12 items-center gap-0 rounded-xl border border-gray-200 bg-white px-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
        role="search"
      >
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-400" />
        <input
          className="flex-1 min-w-0 appearance-none border-0 bg-transparent text-sm text-gray-800 shadow-none outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0"
          placeholder={placeholder}
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
          onClick={handleSlidersClick}
        >
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {/* Quick-filter chips */}
      <div className="flex items-center gap-2">
        <button
          aria-pressed={isNearMe}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
            isNearMe
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
          }`}
          type="button"
          onClick={() => onNearMeChange?.(!isNearMe)}
        >
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span>Near me</span>
        </button>

        <button
          aria-pressed={isOpenNow}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
            isOpenNow
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
          }`}
          type="button"
          onClick={() => onOpenNowChange?.(!isOpenNow)}
        >
          <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span>Open now</span>
        </button>
      </div>
    </div>
  );
}
