import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NearMeResultsGrid } from './NearMeResultsGrid';
import type { NearMeFoodResult } from '@/services/providers';

vi.mock('@/components/providers/ProviderCard', () => ({
  ProviderCard: ({
    provider_name,
    distanceKm,
  }: {
    provider_name: string;
    distanceKm?: number;
  }) => (
    <div>
      {provider_name} — {distanceKm} km
    </div>
  ),
}));

const t = (key: string) => {
  const map: Record<string, string> = {
    'suchen.empty.noNearby': 'No nearby restaurants found.',
    'suchen.nearMe.loading': 'Loading providers...',
    'suchen.nearMe.errorLoading': 'Search is currently unavailable. Please try again.',
  };
  return map[key] ?? key;
};

const results: NearMeFoodResult[] = [
  {
    provider_id: 'p1',
    provider_name: 'Sultan Kitchen',
    provider_images: null,
    address_city: 'Berlin',
    opening_hours: null,
    location_latitude: 52.5,
    location_longitude: 13.4,
    distance_km: 0.4,
  },
  {
    provider_id: 'p2',
    provider_name: 'Habibi Falafel',
    provider_images: null,
    address_city: 'Berlin',
    opening_hours: null,
    location_latitude: 52.51,
    location_longitude: 13.41,
    distance_km: 1.2,
  },
];

describe('NearMeResultsGrid', () => {
  it('renders a card per result with its distance', () => {
    render(
      <NearMeResultsGrid
        bookmarkedProviderIds={[]}
        error={null}
        isLoading={false}
        results={results}
        t={t}
        onBookmarkChange={vi.fn()}
        onProviderClick={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sultan Kitchen/)).toBeInTheDocument();
    expect(screen.getByText(/Habibi Falafel/)).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    render(
      <NearMeResultsGrid
        bookmarkedProviderIds={[]}
        error={null}
        isLoading={true}
        results={[]}
        t={t}
        onBookmarkChange={vi.fn()}
        onProviderClick={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Loading providers...')).toBeInTheDocument();
  });

  it('shows an empty state when there are no results', () => {
    render(
      <NearMeResultsGrid
        bookmarkedProviderIds={[]}
        error={null}
        isLoading={false}
        results={[]}
        t={t}
        onBookmarkChange={vi.fn()}
        onProviderClick={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('No nearby restaurants found.')).toBeInTheDocument();
  });

  it('shows an error state with a retry action', () => {
    const onRetry = vi.fn();
    render(
      <NearMeResultsGrid
        bookmarkedProviderIds={[]}
        error={new Error('boom')}
        isLoading={false}
        results={[]}
        t={t}
        onBookmarkChange={vi.fn()}
        onProviderClick={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Search is currently unavailable. Please try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
