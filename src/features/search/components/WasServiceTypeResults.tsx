import { BriefcaseBusiness, X } from 'lucide-react';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

interface WasServiceTypeResultsProps {
  query: string;
  selectedServiceType: WasSelection | null;
  onSelect: (selection: WasSelection) => void;
  onClearSelection: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

interface ServiceTypeItem {
  id: string;
  labelKey: string;
}

const SERVICE_TYPES: ServiceTypeItem[] = [
  { id: 'islamische-bildung', labelKey: 'suchen.was.ummah.items.islamischeBildung' },
  { id: 'beratung', labelKey: 'suchen.was.ummah.items.beratung' },
  { id: 'rechtshilfe', labelKey: 'suchen.was.ummah.items.rechtshilfe' },
  { id: 'jugenddienste', labelKey: 'suchen.was.ummah.items.jugenddienste' },
  { id: 'gesundheitsversorgung', labelKey: 'suchen.was.ummah.items.gesundheitsversorgung' },
  { id: 'eheberatung', labelKey: 'suchen.was.ummah.items.eheberatung' },
  { id: 'bestattungsdienste', labelKey: 'suchen.was.ummah.items.bestattungsdienste' },
  { id: 'soziale-hilfe', labelKey: 'suchen.was.ummah.items.sozialeHilfe' },
  { id: 'sprachkurse', labelKey: 'suchen.was.ummah.items.sprachkurse' },
  { id: 'quran-unterricht', labelKey: 'suchen.was.ummah.items.quranUnterricht' },
];

export function WasServiceTypeResults({
  query,
  selectedServiceType,
  onSelect,
  onClearSelection,
  t,
}: WasServiceTypeResultsProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = normalizedQuery.length < 2
    ? SERVICE_TYPES
    : SERVICE_TYPES.filter((item) => t(item.labelKey).toLowerCase().includes(normalizedQuery));

  return (
    <div className="mb-2">
      {selectedServiceType ? (
        <>
          <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t('suchen.was.selectionLabel')}
          </p>
          <div className="space-y-1">
            <div className="flex w-full items-center justify-between rounded-xl bg-background-selection px-2 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
                  <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-inter-tight text-base font-semibold text-text-primary">
                    {selectedServiceType.label}
                  </p>
                  <p className="truncate font-inter text-sm text-text-muted">
                    {t('suchen.was.ummah.serviceTypeLabel')}
                  </p>
                </div>
              </div>
              <button
                aria-label={t('suchen.was.removeSelection')}
                className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary"
                type="button"
                onClick={onClearSelection}
              >
                <X aria-hidden="true" className="h-3 w-3 text-white" />
              </button>
            </div>
          </div>
        </>
      ) : null}

      {visibleItems.length > 0 ? (
        <>
          <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t('suchen.was.ummah.browseServiceTypes')}
          </p>
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const label = t(item.labelKey);
              return (
                <button
                  key={item.id}
                  aria-label={label}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-muted"
                  type="button"
                  onClick={() =>
                    onSelect({
                      label,
                      type: 'service-type',
                      serviceTypeId: item.id,
                    })
                  }
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
                    <BriefcaseBusiness aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-inter-tight text-base font-semibold text-text-primary">{label}</p>
                    <p className="truncate font-inter text-sm text-text-muted">
                      {t('suchen.was.ummah.serviceTypeLabel')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
