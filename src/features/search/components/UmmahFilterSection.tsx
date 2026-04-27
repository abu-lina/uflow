import { BadgeCheck, Check, Gift, Globe, Languages, Users } from 'lucide-react';
import type { SVGProps } from 'react';
import { useState } from 'react';
import { getFeatureFlag } from '@/config/feature-flags';

interface UmmahFilterSectionProps {
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

const UMMAH_FILTER_ITEMS: FilterItem[] = [
  {
    key: 'kostenlos',
    titleKey: 'suchen.filter.ummahItems.kostenlos.title',
    subtitleKey: 'suchen.filter.ummahItems.kostenlos.subtitle',
    Icon: Gift,
  },
  {
    key: 'online',
    titleKey: 'suchen.filter.ummahItems.online.title',
    subtitleKey: 'suchen.filter.ummahItems.online.subtitle',
    Icon: Globe,
  },
  {
    key: 'sprache',
    titleKey: 'suchen.filter.ummahItems.sprache.title',
    subtitleKey: 'suchen.filter.ummahItems.sprache.subtitle',
    Icon: Languages,
  },
  {
    key: 'zertifiziert',
    titleKey: 'suchen.filter.ummahItems.zertifiziert.title',
    subtitleKey: 'suchen.filter.ummahItems.zertifiziert.subtitle',
    Icon: BadgeCheck,
  },
  {
    key: 'geschlechtergetrennt',
    titleKey: 'suchen.filter.ummahItems.geschlechtergetrennt.title',
    subtitleKey: 'suchen.filter.ummahItems.geschlechtergetrennt.subtitle',
    Icon: Users,
  },
];

export function UmmahFilterSection({ selectedFilters, onToggleFilter, t }: UmmahFilterSectionProps) {
  const isShowAllPreviewEnabled = getFeatureFlag('enableSearchExpandShowAllPreview');
  const [showAllFilters, setShowAllFilters] = useState(false);

  const visibleFilterItems = isShowAllPreviewEnabled
    ? (showAllFilters ? UMMAH_FILTER_ITEMS : UMMAH_FILTER_ITEMS.slice(0, 3))
    : UMMAH_FILTER_ITEMS.slice(0, 3);

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

      {isShowAllPreviewEnabled && !showAllFilters && UMMAH_FILTER_ITEMS.length > 3 ? (
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
