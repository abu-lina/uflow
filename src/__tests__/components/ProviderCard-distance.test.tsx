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

  describe('dot separator (Plan 218)', () => {
    const providerWithOpeningHours = {
      ...mockProvider,
      opening_hours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' },
      },
    };

    it('renders the dot separator between open status and distance when both are present', () => {
      render(
        <ProviderCard
          {...providerWithOpeningHours}
          distanceKm={1.2}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const row = screen.getByTestId('provider-open-status');
      const separator = screen.getByTestId('provider-distance-separator');

      expect(separator).toBeInTheDocument();
      expect(row).toContainElement(separator);
    });

    it('does not render the dot separator when distanceKm is undefined', () => {
      render(
        <ProviderCard
          {...providerWithOpeningHours}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByTestId('provider-distance-separator')).not.toBeInTheDocument();
    });

    it('does not render the dot separator when open status is not visible', () => {
      render(
        <ProviderCard
          {...mockProvider}
          distanceKm={1.2}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByTestId('provider-distance-separator')).not.toBeInTheDocument();
    });
  });
});
