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
    <header 
      className="fixed left-0 right-0 top-0 z-50 sm:hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(245, 245, 245, 0.85) 0%, rgba(251, 251, 251, 0.85) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        // Ensure header is in its own stacking context, isolated from PageTransition's motion.div
        isolation: 'isolate',
        // Don't add translateZ here as it can interfere with backdrop-filter on some devices
        // Background extends all the way to top edge (no padding on header itself)
      }}
    >
      <div 
        className="px-4 pb-3"
        style={{
          // Add safe area padding to content, not header background
          // Use max() to ensure minimum 24px padding on devices without safe area (like iPhone SE)
          // On iPhone SE: max(24px, calc(0 + 24px)) = 24px
          // On iPhone 15 Pro: max(24px, calc(59px + 24px)) = 83px
          paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
        }}
      >
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

