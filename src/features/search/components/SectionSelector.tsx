'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Section } from '@/providers/search-provider';
import {
  SECTION_ICON_RENDERERS,
  SECTION_ORDER,
} from '@/features/search/constants/sectionIconRenderers';
import { SECTION_META } from '@/config/sectionFilters';

interface SectionSelectorProps {
  selectedSection: Section;
  onSectionChange: (section: Section) => void;
  className?: string;
}

/**
 * Plan 089 M6 / Plan 090 M1: Section Selector tab bar.
 *
 * Renders three tabs — Food / Ummah / Stores — and calls onSectionChange
 * when a different section is selected.
 *
 * Labels are i18n-aware via useLanguage(). The internal section value
 * for "Stores" is 'store' in the canonical Section type.
 *
 * The active tab is marked with aria-selected=true per ARIA tablist pattern.
 * Inactive sections (per SECTION_META) are disabled with muted styling
 * and show a "Soon" badge.
 */
export function SectionSelector({ selectedSection, onSectionChange, className = '' }: SectionSelectorProps) {
  const { t } = useLanguage();

  const getSectionLabel = (section: Section): string => {
    return t(SECTION_META[section].labelKey);
  };

  return (
    <div
      aria-label="Browse sections"
      className={`flex items-center justify-between w-full border border-border-light bg-background h-14 rounded-2xl px-2 ${className}`}
      role="tablist"
    >
      {SECTION_ORDER.map((value) => {
        const meta = SECTION_META[value];
        const label = getSectionLabel(value);
        const renderIcon = SECTION_ICON_RENDERERS[value];
        const isActive = selectedSection === value;
        const isDisabled = !meta.active;
        return (
          <button
            key={value}
            aria-label={label}
            aria-selected={isActive}
            disabled={isDisabled}
            className={[
              'flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 px-3 overflow-hidden font-inter-tight font-medium text-base transition-colors',
              isActive
                ? 'bg-primary text-white'
                : 'text-neutral-500 hover:text-neutral-700',
              isDisabled && 'opacity-50 cursor-not-allowed',
            ].join(' ')}
            role="tab"
            onClick={() => onSectionChange(value)}
          >
            {renderIcon(isActive)}
            <span>{label}</span>
            {isDisabled && meta.badgeKey && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-200 text-neutral-600 ml-1">
                {t(meta.badgeKey)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
