'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Section } from '@/providers/search-provider';
import { useLanguage } from '@/providers/LanguageProvider';

interface HomeSearchBarProps {
  /** The currently active section — used for sliders navigation and search submission */
  activeSection: Section;
  className?: string;
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
export function HomeSearchBar({ activeSection, className = '' }: HomeSearchBarProps) {
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
    <div
      aria-label={ariaLabel}
      className={`flex h-12 items-center gap-3 rounded-xl border border-gray-200 bg-white/80 px-4 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-md ${className}`}
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
  );
}
