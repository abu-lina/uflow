'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Section } from '@/providers/search-provider';

interface HomeSearchInputProps {
  /** The currently active section — used for sliders navigation and search submission. */
  activeSection: Section;
  className?: string;
}

/**
 * HomeSearchInput — inline search affordance for the home page header slot.
 *
 * Replaces the search-input half of HomeSearchBar (Plan 221). The chip half is
 * now handled by DiscoveryFilterBar. Typing and pressing Enter navigates to the
 * providers results page with the query pre-filled; the sliders button navigates
 * to /search for the full filter experience.
 */
export function HomeSearchInput({ activeSection, className = '' }: HomeSearchInputProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

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
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <div
      aria-label={t('home.searchAriaLabel')}
      className={`flex h-12 items-center gap-0 rounded-xl border border-gray-200 bg-white px-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md ${className}`}
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
  );
}
