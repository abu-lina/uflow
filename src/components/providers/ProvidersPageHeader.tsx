'use client';

import { SearchBar } from '@/features/search/components/SearchBar';
import { CategoryFilter } from '@/components/providers/CategoryFilter';

interface ProvidersPageHeaderProps {
  onSearchSubmit: (query: string, category: string | null, location: string) => void;
  onClearSearch: () => void;
  onCategoryChange: (category: string | null) => void;
  onLocationChange: (location: string) => void;
}

export function ProvidersPageHeader({
  onSearchSubmit,
  onClearSearch,
  onCategoryChange,
  onLocationChange,
}: ProvidersPageHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden pt-[calc(env(safe-area-inset-top)+24px)]">
      <div className="px-4 pb-3">
        <SearchBar
          className="rounded-lg border border-gray-200 shadow-sm"
          hideCategoryFilter={true}
          onCategoryChange={onCategoryChange}
          onClearSearch={onClearSearch}
          onLocationChange={onLocationChange}
          onSearchSubmit={onSearchSubmit}
        />
      </div>

      <div className="pb-1.5 pl-6 pr-0">
        <CategoryFilter />
      </div>
    </header>
  );
}

