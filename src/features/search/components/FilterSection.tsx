import { Check, CircleParking, HandHeart, HeartHandshake, Moon } from 'lucide-react';
import type { SVGProps } from 'react';
import { useState } from 'react';
import { getFeatureFlag } from '@/config/feature-flags';
import { PrayerRug } from '@/components/icons/PrayerRug';
import type { Section } from '@/providers/search-provider';

interface FilterSectionProps {
  selectedSection: Section;
  selectedFilters: string[];
  onToggleFilter: (key: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface FilterItem {
  key: string;
  titleKey: string;
  subtitleKey: string;
  Icon: React.ComponentType<SVGProps<SVGSVGElement>>;
}

const FILTER_ITEMS: FilterItem[] = [
  {
    key: 'muslim',
    titleKey: 'suchen.filter.items.muslim.title',
    subtitleKey: 'suchen.filter.items.muslim.subtitle',
    Icon: Moon,
  },
  {
    key: 'spenden',
    titleKey: 'suchen.filter.items.spenden.title',
    subtitleKey: 'suchen.filter.items.spenden.subtitle',
    Icon: HandHeart,
  },
  {
    key: 'solidaritaet',
    titleKey: 'suchen.filter.items.solidaritaet.title',
    subtitleKey: 'suchen.filter.items.solidaritaet.subtitle',
    Icon: HeartHandshake,
  },
  {
    key: 'parken',
    titleKey: 'suchen.filter.items.parken.title',
    subtitleKey: 'suchen.filter.items.parken.subtitle',
    Icon: CircleParking,
  },
  {
    key: 'gebet',
    titleKey: 'suchen.filter.items.gebet.title',
    subtitleKey: 'suchen.filter.items.gebet.subtitle',
    Icon: PrayerRug,
  },
];

export function FilterSection({ selectedSection, selectedFilters, onToggleFilter, t }: FilterSectionProps) {
  const isShowAllPreviewEnabled = getFeatureFlag('enableSearchExpandShowAllPreview');
  const [showAllFilters, setShowAllFilters] = useState(false);

  const sectionFilterItems =
    selectedSection === 'ummah'
      ? []
      : selectedSection === 'business'
        ? FILTER_ITEMS.filter((item) => item.key !== 'muslim')
        : FILTER_ITEMS;

  const visibleFilterItems = isShowAllPreviewEnabled
    ? (showAllFilters ? sectionFilterItems : sectionFilterItems.slice(0, 3))
    : sectionFilterItems;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {visibleFilterItems.map(({ key, titleKey, subtitleKey, Icon }) => {
        const selected = selectedFilters.includes(key);

        return (
          <button
            key={key}
            aria-checked={selected}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-background-selection/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            role="checkbox"
            type="button"
            onClick={() => onToggleFilter(key)}
          >
            <span
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary ${
                selected ? 'ring-2 ring-primary' : ''
              }`}
            >
              <Icon aria-hidden className="h-6 w-6" />
              {selected ? <Check aria-hidden="true" className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary p-0.5 text-white" /> : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold text-content-heading">
                {t(titleKey)}
              </span>
              <span className="text-base font-light text-text-muted">
                {t(subtitleKey)}
              </span>
            </span>
          </button>
        );
      })}

      {isShowAllPreviewEnabled && !showAllFilters && sectionFilterItems.length > 3 ? (
        <button
          className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
          type="button"
          onClick={() => setShowAllFilters(true)}
        >
          {t('suchen.filter.showAllFilters')}
        </button>
      ) : null}
    </div>
  );
}
