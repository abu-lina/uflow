import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { mockProviders } from '../mocks/providerData';

describe('ProviderCard — distance label (Plan 196)', () => {
  const mockProvider = mockProviders[0];
  const mockOnBookmarkChange = vi.fn();

  it('renders a distance label when distanceKm is provided', () => {
    render(
      <ProviderCard
        {...mockProvider}
        distanceKm={1.2}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.getByText('1,2 km')).toBeInTheDocument();
  });

  it('renders a meters-based distance label for sub-kilometer distances', () => {
    render(
      <ProviderCard
        {...mockProvider}
        distanceKm={0.4}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.getByText('400 m')).toBeInTheDocument();
  });

  it('does not render a distance label when distanceKm is absent', () => {
    render(
      <ProviderCard
        {...mockProvider}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.queryByTestId('provider-distance')).not.toBeInTheDocument();
  });
});
