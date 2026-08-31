'use client';

import { forwardRef } from 'react';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import type { Section } from '@/providers/search-provider';

interface DiscoveryHeaderProps {
  /** Canonical section value used for section change routing context. */
  section: Section;
  /** Currently selected section passed to SectionSelector. */
  selectedSection: Section;
  /** Called when the user selects a different section. */
  onSectionChange: (section: Section) => void;
  /** Search affordance rendered below the section selector (home text input or results SearchContextBar). */
  searchSlot: React.ReactNode;
  /** Optional filter bar rendered below the search slot (home DiscoveryFilterBar). */
  filterBarSlot?: React.ReactNode;
  /** Backdrop blur strength. Map view uses subtle blur so the map remains readable. */
  viewMode?: 'map' | 'list';
  className?: string;
}

/**
 * DiscoveryHeader — unified fixed glass header for discovery surfaces.
 *
 * Merges the inline home header and ProvidersPageHeader into one shell:
 * safe-area padding, backdrop-filter, border, z-50. The caller supplies the
 * search affordance via `searchSlot`, so home can pass its inline search input
 * and results can pass SearchContextBar without forking the header.
 */
export const DiscoveryHeader = forwardRef<HTMLElement, DiscoveryHeaderProps>(
  function DiscoveryHeader(
    { section, selectedSection, onSectionChange, searchSlot, filterBarSlot, viewMode = 'list', className = '' },
    ref,
  ) {
    return (
      <header
        ref={ref}
        className={`fixed left-0 right-0 top-0 z-50 sm:hidden ${className}`}
        data-testid="discovery-header"
        data-view-mode={viewMode}
        style={{
          transition:
            'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: viewMode === 'list' ? 'blur(20px) saturate(180%)' : 'blur(1.5px)',
          WebkitBackdropFilter: viewMode === 'list' ? 'blur(20px) saturate(180%)' : 'blur(1.5px)',
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
          <div className="pb-3">
            <SectionSelector
              selectedSection={selectedSection}
              onSectionChange={onSectionChange}
            />
          </div>
          {searchSlot}
          {filterBarSlot ? <div className="pt-2">{filterBarSlot}</div> : null}
        </div>
      </header>
    );
  },
);
