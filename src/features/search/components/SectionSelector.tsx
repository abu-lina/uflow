'use client';

import type { ReactNode } from 'react';
import { Hamburger, Store } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { HomeIcon } from '@/components/ui/icons/HomeIcon';
import type { Section } from '@/providers/search-provider';

interface SectionSelectorProps {
  selectedSection: Section;
  onSectionChange: (section: Section) => void;
  className?: string;
}

/** Section metadata for rendering icons (labels come from i18n) */
const SECTION_ICONS: Record<Section, (isActive: boolean) => ReactNode> = {
  food: () => <Hamburger aria-hidden="true" className="h-4 w-4 shrink-0" />,
  // Reuse the exact Home icon component used by the mobile navbar.
  ummah: (isActive) => (
    <HomeIcon
      className="h-4 w-4 shrink-0"
      isActive={isActive}
      size={16}
      viewBox="12 12 24 24"
    />
  ),
  business: () => <Store aria-hidden="true" className="h-4 w-4 shrink-0" />,
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
      className={`flex items-center justify-between w-full border border-border-light bg-background h-14 rounded-2xl px-2 ${className}`}
      role="tablist"
    >
      {SECTION_ORDER.map((value) => {
        const label = getSectionLabel(value);
        const renderIcon = SECTION_ICONS[value];
        const isActive = selectedSection === value;
        return (
          <button
            key={value}
            aria-label={label}
            aria-selected={isActive}
            className={[
              'flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 px-3 overflow-hidden font-inter-tight font-medium text-base transition-colors',
              isActive
                ? 'bg-primary text-white'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
            role="tab"
            onClick={() => onSectionChange(value)}
          >
            {renderIcon(isActive)}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
