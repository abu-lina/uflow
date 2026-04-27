'use client';

import Image from 'next/image';
import { UtensilsCrossed, X } from 'lucide-react';
import type { FoodCategory } from '@/services/offers';
import { safeJsonParse } from '@/utils/json';

export interface WasSelection {
  label: string;
  type: 'category' | 'dish' | 'service-type';
  categoryId?: string;
  categoryImages?: string | null;
  providerCount?: number;
  dishName?: string;
  serviceTypeId?: string;
}

interface WasCategoryResultsProps {
  items: FoodCategory[];
  recentSearches: WasSelection[];
  selectedWas: WasSelection | null;
  isLoading: boolean;
  isError: boolean;
  query: string;
  onSelect: (selection: WasSelection) => void;
  onClearSelection: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

function isCategoryImageData(value: unknown): value is { urls?: unknown } {
  return typeof value === 'object' && value !== null;
}

function getCategoryImageUrl(categoryImages: string | null): string | null {
  if (!categoryImages) {
    return null;
  }

  const parsed = safeJsonParse(categoryImages, isCategoryImageData);
  const urls = parsed?.urls;

  if (!Array.isArray(urls) || urls.length === 0) {
    return null;
  }

  return typeof urls[0] === 'string' && urls[0].length > 0 ? urls[0] : null;
}

function IconSlot({ imageUrl, label }: { imageUrl: string | null; label: string }) {
  if (imageUrl) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <Image
          fill
          alt={label}
          className="object-cover"
          sizes="48px"
          src={imageUrl}
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
      <UtensilsCrossed aria-hidden="true" className="h-5 w-5" />
    </div>
  );
}

export function WasCategoryResults({
  items,
  recentSearches,
  selectedWas,
  isLoading,
  isError,
  query,
  onSelect,
  onClearSelection,
  t,
}: WasCategoryResultsProps) {
  if (isLoading) {
    return (
      <p className="py-2 text-center text-sm text-text-muted">
        {t('suchen.was.loading')}
      </p>
    );
  }

  if (isError) {
    return (
      <p aria-live="polite" className="py-2 text-center text-sm text-danger" role="status">
        {t('suchen.was.searchError')}
      </p>
    );
  }

  if (items.length === 0 && recentSearches.length === 0 && !selectedWas) {
    return null;
  }

  const visiblePopularItems = items.slice(0, 3);
  const visibleRecentSearches = recentSearches.slice(0, 3);

  const CategoryRow = ({ category }: { category: FoodCategory }) => {
    const label = category.name_de || category.name_en || '';
    const countLabel = t('suchen.was.categoryCount', { count: category.provider_count });
    const imageUrl = getCategoryImageUrl(category.category_images);

    return (
      <button
        key={category.category_id}
        aria-label={`${label} - ${countLabel}`}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-muted"
        type="button"
        onClick={() =>
          onSelect({
            label,
            type: 'category',
            categoryId: category.category_id,
            categoryImages: category.category_images,
            providerCount: category.provider_count,
          })
        }
      >
        <IconSlot imageUrl={imageUrl} label={label} />
        <div className="min-w-0">
          <p className="truncate font-inter-tight text-base font-semibold text-text-primary">{label}</p>
          <p className="truncate font-inter text-sm text-text-muted">{countLabel}</p>
        </div>
      </button>
    );
  };

  // Empty query state: show selection (if any), then popular + recent
  if (query.length < 2) {
    return (
      <div className="mb-2">
        {/* Active selection row */}
        {selectedWas && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.was.selectionLabel')}
            </p>
            <div className="space-y-1">
              <div className="flex w-full items-center justify-between rounded-xl bg-background-selection px-2 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {selectedWas.type === 'category' ? (
                    <IconSlot
                      imageUrl={getCategoryImageUrl(
                        selectedWas.categoryImages ??
                          items.find((item) => item.category_id === selectedWas.categoryId)?.category_images ??
                          null,
                      )}
                      label={selectedWas.label}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-inter-tight text-base font-semibold text-text-primary">
                      {selectedWas.label}
                    </p>
                    {selectedWas.type === 'dish' ? (
                      <p className="truncate font-inter text-sm text-text-muted">{t('suchen.was.dishLabel')}</p>
                    ) : selectedWas.type === 'category' && selectedWas.providerCount !== undefined ? (
                      <p className="truncate font-inter text-sm text-text-muted">
                        {t('suchen.was.categoryCount', { count: selectedWas.providerCount })}
                      </p>
                    ) : null}
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
        )}
        {visiblePopularItems.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.was.popularLabel')}
            </p>
            <div className="space-y-1">
              {visiblePopularItems.map((category) => (
                <CategoryRow key={category.category_id} category={category} />
              ))}
            </div>
          </>
        )}
        {visibleRecentSearches.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.was.recentLabel')}
            </p>
            <div className="space-y-1">
              {visibleRecentSearches.map((recent) => (
                <button
                  key={`${recent.type}:${recent.label}`}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-muted"
                  type="button"
                  onClick={() => onSelect(recent)}
                >
                  {recent.type === 'category' ? (
                    <IconSlot
                      imageUrl={getCategoryImageUrl(
                        recent.categoryImages ??
                          items.find((item) => item.category_id === recent.categoryId)?.category_images ??
                          null,
                      )}
                      label={recent.label}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-inter-tight text-base font-semibold text-text-primary">
                      {recent.label}
                    </p>
                    {recent.type === 'dish' ? (
                      <p className="truncate font-inter text-sm text-text-muted">{t('suchen.was.dishLabel')}</p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Search results state: show matched categories under "KÜCHE" heading
  return (
    <div className="mb-2">
      <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t('suchen.was.cuisineLabel')}
      </p>
      <div className="space-y-1">
        {items.map((category) => (
          <CategoryRow key={category.category_id} category={category} />
        ))}
      </div>
    </div>
  );
}
