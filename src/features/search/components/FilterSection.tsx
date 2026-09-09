import { CircleParking, HandHeart, HeartHandshake, Moon } from 'lucide-react';
import type { SVGProps } from 'react';
import { useState } from 'react';
import { RowItem } from '@/components/ui/RowItem';
import { getFeatureFlag } from '@/config/feature-flags';
import { PrayerRug } from '@/components/icons/PrayerRug';
import type { Section } from '@/providers/search-provider';

interface FilterSectionProps {
  selectedSection: Section;
  selectedFilters: string[];
  onToggleFilter: (key: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** When provided, only filters with count > 0 are shown and counts are displayed. */
  availableFilters?: { key: string; count: number }[];
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

export function FilterSection({
  selectedSection,
  selectedFilters,
  onToggleFilter,
  t,
  availableFilters,
}: FilterSectionProps) {
  const isShowAllPreviewEnabled = getFeatureFlag('enableSearchExpandShowAllPreview');
  const [showAllFilters, setShowAllFilters] = useState(false);

  const sectionFilterItems =
    selectedSection === 'ummah'
      ? []
      : selectedSection === 'store'
        ? FILTER_ITEMS.filter((item) => item.key !== 'muslim')
        : FILTER_ITEMS;

  // When availableFilters is provided, keep only items with count > 0
  const countMap = availableFilters
    ? new Map(availableFilters.filter((f) => f.count > 0).map((f) => [f.key, f.count]))
    : null;

  const filteredByAvailability = countMap
    ? sectionFilterItems.filter((item) => countMap.has(item.key))
    : sectionFilterItems;

  const visibleFilterItems = isShowAllPreviewEnabled
    ? showAllFilters
      ? filteredByAvailability
      : filteredByAvailability.slice(0, 3)
    : filteredByAvailability.slice(0, 3);

  return (
    <div className="mt-3 flex flex-col gap-3">
      {visibleFilterItems.map(({ key, titleKey, subtitleKey, Icon }) => {
        const selected = selectedFilters.includes(key);
        const count = countMap?.get(key);
        const title = count != null ? `${t(titleKey)} (${count})` : t(titleKey);

        return (
          <RowItem
            key={key}
            multiSelect
            selectable
            className="hover:bg-background-selection/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            icon={
              <span className="bg-background-selection flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary">
                <Icon aria-hidden className="h-6 w-6" />
              </span>
            }
            selected={selected}
            subtitle={t(subtitleKey)}
            title={title}
            onSelect={() => onToggleFilter(key)}
          />
        );
      })}

      {isShowAllPreviewEnabled && !showAllFilters && filteredByAvailability.length > 3 ? (
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
