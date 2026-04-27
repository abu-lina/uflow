import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WasCategoryResults, type WasSelection } from './WasCategoryResults';

let enableSearchExpandShowAllPreview = false;

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => {
    if (key === 'enableSearchExpandShowAllPreview') {
      return enableSearchExpandShowAllPreview;
    }
    return false;
  },
}));

const t = (key: string, variables?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'suchen.was.loading': 'Suche laeuft...',
    'suchen.was.searchError': 'Suche nicht verfuegbar. Bitte versuche es erneut.',
    'suchen.was.categoryCount': `${variables?.count ?? 0} Restaurants`,
    'suchen.was.cuisineLabel': 'KUECHE',
    'suchen.was.popularLabel': 'BELIEBT',
    'suchen.was.recentLabel': 'ZULETZT GESUCHT',
    'suchen.was.selectionLabel': 'AUSWAHL',
    'suchen.was.dishLabel': 'Gericht',
    'suchen.was.removeSelection': 'Auswahl entfernen',
    'suchen.was.showAllCuisines': 'Show all cuisines',
  };
  return map[key] ?? key;
};

describe('WasCategoryResults (Plan 098)', () => {
  beforeEach(() => {
    enableSearchExpandShowAllPreview = false;
  });

  it('renders active selection with bg-background-selection and remove button aria label', () => {
    const onClearSelection = vi.fn();

    const { container } = render(
      <WasCategoryResults
        items={[]}
        recentSearches={[]}
        selectedWas={{ label: 'Pizza', type: 'dish', dishName: 'Pizza' }}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        onClearSelection={onClearSelection}
        t={t}
      />,
    );

    expect(container.querySelector('.bg-background-selection')).not.toBeNull();

    const removeButton = screen.getByRole('button', { name: 'Auswahl entfernen' });
    expect(removeButton).toBeInTheDocument();
    fireEvent.click(removeButton);
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders dish recent row with dish subtitle and no remove button', () => {
    render(
      <WasCategoryResults
        items={[]}
        recentSearches={[
          { label: 'Burger', type: 'dish', dishName: 'Burger' },
        ]}
        selectedWas={null}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('Gericht')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Auswahl entfernen' })).not.toBeInTheDocument();
  });

  it('renders selected category with categoryCount subtitle', () => {
    const selectedCategory: WasSelection = {
      label: 'Levantine',
      type: 'category',
      categoryId: 'cat-1',
      providerCount: 4,
    };

    render(
      <WasCategoryResults
        items={[]}
        recentSearches={[]}
        selectedWas={selectedCategory}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('4 Restaurants')).toBeInTheDocument();
  });

  it('renders category image in recent rows even when items list is empty', () => {
    const recentCategory: WasSelection = {
      label: 'Levantine',
      type: 'category',
      categoryId: 'cat-2',
      categoryImages: '{"urls":["https://example.com/cat.png"]}',
    };

    render(
      <WasCategoryResults
        items={[]}
        recentSearches={[recentCategory]}
        selectedWas={null}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
        t={t}
      />,
    );

    const categoryImage = screen.getByRole('img', { name: 'Levantine' }) as HTMLImageElement;
    expect(categoryImage.src).toContain(encodeURIComponent('https://example.com/cat.png'));
  });

  it('shows only first three cuisine results with show-all action when more exist', () => {
    enableSearchExpandShowAllPreview = true;

    render(
      <WasCategoryResults
        items={[
          { category_id: 'cat-1', name_de: 'Levantine', name_en: 'Levantine', description_de: '', description_en: '', provider_count: 5, category_images: null },
          { category_id: 'cat-2', name_de: 'Turkish', name_en: 'Turkish', description_de: '', description_en: '', provider_count: 6, category_images: null },
          { category_id: 'cat-3', name_de: 'Afghan', name_en: 'Afghan', description_de: '', description_en: '', provider_count: 3, category_images: null },
          { category_id: 'cat-4', name_de: 'Syrian', name_en: 'Syrian', description_de: '', description_en: '', provider_count: 2, category_images: null },
        ]}
        recentSearches={[]}
        selectedWas={null}
        isLoading={false}
        isError={false}
        query="ku"
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Levantine')).toBeInTheDocument();
    expect(screen.getByText('Turkish')).toBeInTheDocument();
    expect(screen.getByText('Afghan')).toBeInTheDocument();
    expect(screen.queryByText('Syrian')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all cuisines' }));

    expect(screen.getByText('Syrian')).toBeInTheDocument();
  });

  it('renders only recent section when recent searches exist', () => {
    render(
      <WasCategoryResults
        items={[
          { category_id: 'cat-1', name_de: 'Levantine', name_en: 'Levantine', description_de: '', description_en: '', provider_count: 5, category_images: null },
          { category_id: 'cat-2', name_de: 'Turkish', name_en: 'Turkish', description_de: '', description_en: '', provider_count: 6, category_images: null },
        ]}
        recentSearches={[
          { label: 'Burger', type: 'dish', dishName: 'Burger' },
        ]}
        selectedWas={null}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('ZULETZT GESUCHT')).toBeInTheDocument();
    expect(screen.queryByText('BELIEBT')).not.toBeInTheDocument();
    expect(screen.queryByText('Levantine')).not.toBeInTheDocument();
    expect(screen.getByText('Burger')).toBeInTheDocument();
  });

  it('renders popular section when no recent searches exist', () => {
    render(
      <WasCategoryResults
        items={[
          { category_id: 'cat-1', name_de: 'Levantine', name_en: 'Levantine', description_de: '', description_en: '', provider_count: 5, category_images: null },
        ]}
        recentSearches={[]}
        selectedWas={null}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        onClearSelection={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('BELIEBT')).toBeInTheDocument();
    expect(screen.queryByText('ZULETZT GESUCHT')).not.toBeInTheDocument();
    expect(screen.getByText('Levantine')).toBeInTheDocument();
  });
});
