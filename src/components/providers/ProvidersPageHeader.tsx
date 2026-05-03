'use client';

import { SearchContextBar } from '@/features/search/components/SearchContextBar';
import type { Section } from '@/providers/search-provider';

interface ProvidersPageHeaderProps {
  section: Section;
  searchTerm?: string | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  location?: string | null;
  peopleSummary?: string | null;
}

export function ProvidersPageHeader({
  section,
  searchTerm,
  categoryId,
  categoryLabel,
  location,
  peopleSummary,
}: ProvidersPageHeaderProps) {
  return (
    <header
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
          paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
        }}
      >
        <SearchContextBar
          categoryId={categoryId}
          categoryLabel={categoryLabel}
          className="border border-gray-200 shadow-sm"
          location={location}
          peopleSummary={peopleSummary}
          searchTerm={searchTerm}
          section={section}
        />
      </div>
    </header>
  );
}

