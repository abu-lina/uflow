import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { HomeNearMeList } from '@/features/search/components/HomeNearMeList';
import type { NearMeFoodResult } from '@/services/providers';

const capturedCards: Array<{
  provider_id: string;
  distanceKm?: number;
  category?: { name_de?: string; name_en?: string; category_images?: Record<string, unknown> };
}> = [];

vi.mock('@/components/providers/ProviderCard', () => ({
  ProviderCard: (props: {
    provider_id: string;
    distanceKm?: number;
    category?: { name_de?: string; name_en?: string; category_images?: Record<string, unknown> };
    provider_name: string;
  }) => {
    capturedCards.push({ provider_id: props.provider_id, distanceKm: props.distanceKm, category: props.category });
    return (
      <div data-testid={`provider-card-${props.provider_id}`}>
        <span data-testid={`provider-name-${props.provider_id}`}>{props.provider_name}</span>
        <span data-testid={`provider-distance-${props.provider_id}`}>{props.distanceKm ?? 'no-distance'}</span>
      </div>
    );
  },
}));

vi.mock('@/components/ui/SkeletonGrid', () => ({
  SkeletonGrid: ({ count }: { count?: number }) => <div data-testid="skeleton-grid">count={count}</div>,
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title?: string; description?: string }) => (
    <div data-testid="empty-state">
      <span data-testid="empty-title">{title}</span>
      <span data-testid="empty-description">{description}</span>
    </div>
  ),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'suchen.nearMe.loading': 'Loading providers...',
        'suchen.nearMe.errorTitle': 'Something went wrong',
        'suchen.nearMe.errorLoading': 'Could not load nearby providers.',
        'suchen.nearMe.retry': 'Retry',
        'suchen.nearMe.emptyTitle': 'No open restaurants nearby',
        'suchen.empty.noNearby': 'Try enabling location or expanding your search.',
      };
      return map[key] ?? key;
    },
  }),
}));

const makeResult = (id: string, distance_km: number): NearMeFoodResult => ({
  provider_id: id,
  provider_name: `Provider ${id}`,
  provider_images: null,
  category_id: 'cat-1',
  category_name_de: 'Turkisch',
  category_name_en: 'Turkish',
  category_images: { urls: ['https://example.com/cat.jpg'] },
  address_city: 'Berlin',
  opening_hours: null,
  location_latitude: 52.5,
  location_longitude: 13.4,
  distance_km,
});

describe('HomeNearMeList', () => {
  beforeEach(() => {
    capturedCards.length = 0;
  });

  it('[post-fix PASSES] loading → SkeletonGrid', () => {
    render(
      <HomeNearMeList
        error={null}
        headerOffset={120}
        isLoading
        onRetry={vi.fn()}
        results={[]}
      />,
    );

    expect(screen.getByTestId('skeleton-grid')).toHaveTextContent('count=8');
  });

  it('[post-fix PASSES] error → error message + retry button; clicking retry calls onRetry', () => {
    const onRetry = vi.fn();
    render(
      <HomeNearMeList
        error={new Error('boom')}
        headerOffset={120}
        isLoading={false}
        onRetry={onRetry}
        results={[]}
      />,
    );

    expect(screen.getByTestId('empty-title')).toHaveTextContent('Something went wrong');
    expect(screen.getByTestId('empty-description')).toHaveTextContent('Could not load nearby providers.');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('[post-fix PASSES] empty → empty-state message', () => {
    render(
      <HomeNearMeList
        error={null}
        headerOffset={120}
        isLoading={false}
        onRetry={vi.fn()}
        results={[]}
      />,
    );

    expect(screen.getByTestId('empty-title')).toHaveTextContent('No open restaurants nearby');
    expect(screen.getByTestId('empty-description')).toHaveTextContent('Try enabling location or expanding your search.');
  });

  it('[post-fix PASSES] renders a card per result in the given order', () => {
    const results: NearMeFoodResult[] = [
      makeResult('p-far', 10),
      makeResult('p-near', 1),
      makeResult('p-mid', 5),
    ];

    render(
      <HomeNearMeList
        error={null}
        headerOffset={120}
        isLoading={false}
        onRetry={vi.fn()}
        results={results}
      />,
    );

    const ids = capturedCards.map((card) => card.provider_id);
    expect(ids).toEqual(['p-far', 'p-near', 'p-mid']);
    expect(screen.getByTestId('provider-name-p-far')).toHaveTextContent('Provider p-far');
    expect(screen.getByTestId('provider-name-p-near')).toHaveTextContent('Provider p-near');
    expect(screen.getByTestId('provider-name-p-mid')).toHaveTextContent('Provider p-mid');
  });

  it('[post-fix PASSES] each card receives distanceKm = result.distance_km', () => {
    const results: NearMeFoodResult[] = [
      { ...makeResult('p1', 0.4), category_name_de: null, category_name_en: null, category_images: null },
      makeResult('p2', 12.5),
    ];

    render(
      <HomeNearMeList
        error={null}
        headerOffset={120}
        isLoading={false}
        onRetry={vi.fn()}
        results={results}
      />,
    );

    expect(screen.getByTestId('provider-distance-p1')).toHaveTextContent('0.4');
    expect(screen.getByTestId('provider-distance-p2')).toHaveTextContent('12.5');

    expect(capturedCards[0].category?.name_de).toBe('');
    expect(capturedCards[0].category?.name_en).toBeUndefined();
    expect(capturedCards[0].category?.category_images).toBeUndefined();

    expect(capturedCards[1].category?.name_de).toBe('Turkisch');
    expect(capturedCards[1].category?.name_en).toBe('Turkish');
    expect(capturedCards[1].category?.category_images).toEqual({ urls: ['https://example.com/cat.jpg'] });
  });
});
