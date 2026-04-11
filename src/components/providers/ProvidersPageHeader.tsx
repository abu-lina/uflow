'use client';

import { useRef } from 'react';
import { SearchBar } from '@/features/search/components/SearchBar';
import { CategoryFilter } from '@/components/providers/CategoryFilter';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import type { Section } from '@/providers/search-provider';

interface ProvidersPageHeaderProps {
  onSearchSubmit: (query: string, category: string | null, location: string) => void;
  onClearSearch: () => void;
  onCategoryChange: (category: string | null) => void;
  onLocationChange: (location: string) => void;
  /** Plan 089 M6: Active section for the section selector */
  selectedSection?: Section;
  /** Plan 089 M6: Callback when user switches section */
  onSectionChange?: (section: Section) => void;
}

export function ProvidersPageHeader({
  onSearchSubmit,
  onClearSearch,
  onCategoryChange,
  onLocationChange,
  selectedSection = 'food',
  onSectionChange,
}: ProvidersPageHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  return (
    <header 
      ref={headerRef}
      className="fixed left-0 right-0 top-0 z-50 sm:hidden"
      style={{
        // Smooth transition for all properties including backdrop-filter
        transition: 'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
        // Glassy blur effect - always applied for consistent visual effect
        // backdropFilter blurs everything behind the header element
        // blur(20px) creates the frosted glass blur effect
        // saturate(180%) makes colors more vibrant through the blur
        // isolation: isolate ensures backdrop-filter works correctly in stacking contexts
        // Background opacity - always visible for glass effect
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
        isolation: 'isolate',
        marginLeft: '-1px',
        marginRight: '-1px',
        paddingLeft: '1px',
        paddingRight: '1px',
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
        {/* Plan 089 M6: Section Selector tab bar */}
        {onSectionChange && (
          <SectionSelector
            className="mt-2 w-full"
            selectedSection={selectedSection}
            onSectionChange={onSectionChange}
          />
        )}
      </div>

      <div className="pb-1.5 pl-6 pr-0">
        <CategoryFilter />
      </div>
    </header>
  );
}

