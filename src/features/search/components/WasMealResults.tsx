'use client';

import type { FoodConcept } from '@/services/offers';

interface WasMealResultsProps {
  items: FoodConcept[];
  isLoading: boolean;
  isError: boolean;
  query: string;
  hasCategoryResults?: boolean;
  onSelect: (itemName: string) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export function WasMealResults({
  items,
  isLoading,
  isError,
  query,
  hasCategoryResults = false,
  onSelect,
  t,
}: WasMealResultsProps) {
  if (query.length === 0) {
    if (hasCategoryResults) return null;
    return (
      <p className="mt-4 py-2 text-center text-sm text-text-muted">
        {t('suchen.was.searchPlaceholder')}
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="mt-4 py-2 text-center text-sm text-text-muted">
        {t('suchen.was.loading')}
      </p>
    );
  }

  if (isError) {
    return (
      <p aria-live="polite" className="mt-4 py-2 text-center text-sm text-danger" role="status">
        {t('suchen.was.searchError')}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 space-y-1 py-2 text-center">
        <p className="text-sm text-text-muted">{t('suchen.was.noResults')}</p>
        <p className="text-sm text-text-muted">{t('suchen.was.notFoundEncouragement')}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const itemLabel = item.name_de || item.name_en || '';
        const providerCountLabel = t('suchen.was.providerCount', { count: item.provider_count });

        return (
          <button
            key={item.offer_id}
            aria-label={`${itemLabel} - ${providerCountLabel}`}
            className="flex w-full items-center gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-muted"
            type="button"
            onClick={() => onSelect(item.name_de)}
          >
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">{itemLabel}</p>
              <p className="truncate text-base font-light text-text-muted">{providerCountLabel}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
