'use client';

import type { Section } from '@/providers/search-provider';

interface SectionSelectorProps {
  selectedSection: Section;
  onSectionChange: (section: Section) => void;
  className?: string;
}

/** Section metadata for rendering labels and icons */
const SECTIONS: { value: Section; label: string; icon: string }[] = [
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'ummah', label: 'Ummah', icon: '🕌' },
  { value: 'business', label: 'Business', icon: '🏪' },
];

/**
 * Plan 089 M6: Section Selector tab bar.
 *
 * Renders three tabs — FOOD / UMMAH / BUSINESS — and calls onSectionChange
 * when a different section is selected.
 *
 * The active tab is marked with aria-selected=true per ARIA tablist pattern.
 */
export function SectionSelector({ selectedSection, onSectionChange, className = '' }: SectionSelectorProps) {
  return (
    <div
      aria-label="Browse sections"
      className={`flex items-center gap-1 rounded-full bg-muted p-1 ${className}`}
      role="tablist"
    >
      {SECTIONS.map(({ value, label, icon }) => {
        const isActive = selectedSection === value;
        return (
          <button
            key={value}
            aria-label={label}
            aria-selected={isActive}
            className={[
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
            role="tab"
            onClick={() => onSectionChange(value)}
          >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
