'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { LayoutGrid, UtensilsCrossed, X } from 'lucide-react';
import { RowItem } from '@/components/ui/RowItem';
import { getFeatureFlag } from '@/config/feature-flags';
import type { FoodCategory } from '@/services/offers';
import { safeJsonParse } from '@/utils/json';

export interface WasSelection {
  label: string;
  type: 'category' | 'dish' | 'service-type' | 'all-restaurants';
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
  const isShowAllPreviewEnabled = getFeatureFlag('enableSearchExpandShowAllPreview');
  const [showAllPopular, setShowAllPopular] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showAllCuisines, setShowAllCuisines] = useState(false);

  useEffect(() => {
    setShowAllPopular(false);
    setShowAllRecent(false);
    setShowAllCuisines(false);
  }, [query]);

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

  const shouldShowRecent = recentSearches.length > 0;
  const shouldShowAllRestaurants = selectedWas?.type !== 'all-restaurants';

  if (items.length === 0 && recentSearches.length === 0 && !selectedWas && !shouldShowAllRestaurants) {
    return null;
  }

  const visibleRecentSearches = isShowAllPreviewEnabled
    ? (showAllRecent ? recentSearches : recentSearches.slice(0, 3))
    : recentSearches.slice(0, 3);
  const visiblePopularItems = isShowAllPreviewEnabled
    ? (showAllPopular ? items : items.slice(0, 3))
    : items.slice(0, 3);
  const shouldShowPopular = !shouldShowRecent && items.length > 0;
  const hasMorePopularItems = isShowAllPreviewEnabled && !showAllPopular && items.length > 3;
  const hasMoreRecentSearches = isShowAllPreviewEnabled && !showAllRecent && recentSearches.length > 3;

  const CategoryRow = ({ category }: { category: FoodCategory }) => {
    const label = category.name_de || category.name_en || '';
    const countLabel = t('suchen.was.categoryCount', { count: category.provider_count });
    const imageUrl = getCategoryImageUrl(category.category_images);

    return (
      <RowItem
        key={category.category_id}
        selectable
        ariaLabel={`${label} - ${countLabel}`}
        className="transition-colors hover:bg-neutral-muted"
        icon={<IconSlot imageUrl={imageUrl} label={label} />}
        subtitle={countLabel}
        title={label}
        onSelect={() =>
          onSelect({
            label,
            type: 'category',
            categoryId: category.category_id,
            categoryImages: category.category_images,
            providerCount: category.provider_count,
          })
        }
      />
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
                  ) : selectedWas.type === 'all-restaurants' ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
                      <LayoutGrid aria-hidden="true" className="h-5 w-5" />
                    </div>
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
        {/* "Alle Restaurants" - always shown unless recent searches exist or already selected */}
        {shouldShowAllRestaurants && (
          <div className="space-y-1">
            <RowItem
              selectable
              ariaLabel={t('suchen.was.allRestaurants')}
              className="transition-colors hover:bg-neutral-muted"
              icon={
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
                  <LayoutGrid aria-hidden="true" className="h-5 w-5" />
                </div>
              }
              title={t('suchen.was.allRestaurants')}
              onSelect={() =>
                onSelect({
                  label: t('suchen.was.allRestaurants'),
                  type: 'all-restaurants',
                })
              }
            />
          </div>
        )}
        {shouldShowPopular && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.was.popularLabel')}
            </p>
            <div className="space-y-1">
              {visiblePopularItems.map((category) => (
                <CategoryRow key={category.category_id} category={category} />
              ))}
            </div>
            {hasMorePopularItems ? (
              <button
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
                type="button"
                onClick={() => setShowAllPopular(true)}
              >
                {t('suchen.was.showAllCuisines')}
              </button>
            ) : null}
          </>
        )}
        {shouldShowRecent && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.was.recentLabel')}
            </p>
            <div className="space-y-1">
              {visibleRecentSearches.map((recent) => (
                <RowItem
                  key={`${recent.type}:${recent.label}`}
                  selectable
                  ariaLabel={recent.label}
                  className="transition-colors hover:bg-neutral-muted"
                  icon={
                    recent.type === 'category' ? (
                      <IconSlot
                        imageUrl={getCategoryImageUrl(
                          recent.categoryImages ??
                            items.find((item) => item.category_id === recent.categoryId)?.category_images ??
                            null,
                        )}
                        label={recent.label}
                      />
                    ) : null
                  }
                  subtitle={recent.type === 'dish' ? t('suchen.was.dishLabel') : undefined}
                  title={recent.label}
                  onSelect={() => onSelect(recent)}
                />
              ))}
            </div>
            {hasMoreRecentSearches ? (
              <button
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
                type="button"
                onClick={() => setShowAllRecent(true)}
              >
                {t('suchen.was.showAllCuisines')}
              </button>
            ) : null}
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
        {(isShowAllPreviewEnabled ? (showAllCuisines ? items : items.slice(0, 3)) : items).map((category) => (
          <CategoryRow key={category.category_id} category={category} />
        ))}
      </div>
      {isShowAllPreviewEnabled && !showAllCuisines && items.length > 3 ? (
        <button
          className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
          type="button"
          onClick={() => setShowAllCuisines(true)}
        >
          {t('suchen.was.showAllCuisines')}
        </button>
      ) : null}
    </div>
  );
}
