'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Section } from '@/providers/search-provider';

interface SectionSelectorProps {
  selectedSection: Section;
  onSectionChange: (section: Section) => void;
  className?: string;
}

/** Section metadata for rendering icons (labels come from i18n) */
const SECTION_ICONS: Record<Section, string> = {
  food: '🍽️',
  ummah: '🕌',
  business: '🏪',
};

/** Section values in display order */
const SECTION_ORDER: Section[] = ['food', 'ummah', 'business'];

/**
 * Plan 089 M6 / Plan 090 M1: Section Selector tab bar.
 *
 * Renders three tabs — Food / Ummah / Stores — and calls onSectionChange
 * when a different section is selected.
 *
 * Labels are i18n-aware via useLanguage(). The internal section value
 * for "Stores" remains 'business' throughout the data model.
 *
 * The active tab is marked with aria-selected=true per ARIA tablist pattern.
 */
export function SectionSelector({ selectedSection, onSectionChange, className = '' }: SectionSelectorProps) {
  const { t } = useLanguage();

  const getSectionLabel = (section: Section): string => {
    if (section === 'food') return t('sections.food');
    if (section === 'ummah') return t('sections.ummah');
    return t('sections.stores');
  };

  return (
    <div
      aria-label="Browse sections"
      className={`flex items-center gap-1 rounded-full bg-muted p-1 ${className}`}
      role="tablist"
    >
      {SECTION_ORDER.map((value) => {
        const label = getSectionLabel(value);
        const icon = SECTION_ICONS[value];
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
