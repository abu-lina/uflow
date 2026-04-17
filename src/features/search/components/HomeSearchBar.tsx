'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Section } from '@/providers/search-provider';
import { useLanguage } from '@/providers/LanguageProvider';

interface HomeSearchBarProps {
  /** The currently active section — passed to /search as ?section= param */
  activeSection: Section;
  className?: string;
}

/**
 * Plan 090 M2 / Plan 091 M3: Home screen search affordance.
 *
 * Renders a styled, non-functional search bar that navigates to the
 * /search page on tap or Enter key press. /suchen remains as a legacy
 * redirect route for backward compatibility.
 * Passes the active section as a URL param so the user lands on the
 * correct section tab.
 *
 * Deliberately uses a div[role="search"] rather than <input> to avoid
 * triggering the iOS PWA keyboard on home page load.
 */
export function HomeSearchBar({ activeSection, className = '' }: HomeSearchBarProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const placeholder = t('home.searchPlaceholder');
  const ariaLabel = t('home.searchAriaLabel');

  const navigate = () => {
    router.push(`/search?section=${activeSection}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate();
    }
  };

  return (
    <div
      aria-label={ariaLabel}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.99] ${className}`}
      role="search"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={handleKeyDown}
    >
      <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-400" />
      <span className="flex-1 truncate text-sm text-gray-400 select-none">{placeholder}</span>
    </div>
  );
}
