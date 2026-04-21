'use client';

import type { ProviderMenuItem } from '@/services/provider-catalog';

interface WasMealResultsProps {
  items: ProviderMenuItem[];
  isLoading: boolean;
  isError: boolean;
  query: string;
  onSelect: (itemName: string) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export function WasMealResults({
  items,
  isLoading,
  isError,
  query,
  onSelect,
  t,
}: WasMealResultsProps) {
  if (query.length === 0) {
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
        const imageSrc = item.provider_image?.trim() || '/images/placeholder.jpg';
        const itemLabel = item.name_de || item.name_en || '';

        return (
          <button
            key={item.item_id}
            aria-label={`${itemLabel} - ${item.provider_name}`}
            className="flex w-full items-center gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-muted"
            type="button"
            onClick={() => onSelect(item.name_de)}
          >
            <img
              alt={item.provider_name}
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
              src={imageSrc}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">{itemLabel}</p>
              <p className="truncate text-base font-light text-text-muted">{item.provider_name}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
