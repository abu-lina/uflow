import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FigmaSearchBar } from './FigmaSearchBar';

const mockSetSearchQuery = vi.fn();
const mockSetSelectedLocation = vi.fn();

const searchState = {
  searchQuery: '',
  selectedLocation: 'all',
  selectedCategory: null as string | null,
};

vi.mock('@/providers/search-provider', () => ({
  LOCATION_ALL: 'all',
  useSearch: () => ({
    searchQuery: searchState.searchQuery,
    setSearchQuery: mockSetSearchQuery,
    selectedLocation: searchState.selectedLocation,
    setSelectedLocation: mockSetSelectedLocation,
    selectedCategory: searchState.selectedCategory,
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'search.placeholder': 'Search in your Ummah',
        'search.everywhere': 'Everywhere',
        'search.open': 'Open search',
        'search.submit': 'Submit search',
        'search.filter': 'Filter by location',
        'common.delete': 'Delete',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/services/providers', () => ({
  fetchProviderCities: vi.fn(async () => ['Berlin', 'Hamburg']),
  fetchFilteredCities: vi.fn(async () => ['Berlin', 'Hamburg']),
}));

describe('FigmaSearchBar', () => {
  beforeEach(() => {
    searchState.searchQuery = '';
    searchState.selectedLocation = 'all';
    searchState.selectedCategory = null;

    mockSetSearchQuery.mockImplementation((next: string) => {
      searchState.searchQuery = next;
    });
    mockSetSelectedLocation.mockImplementation((next: string) => {
      searchState.selectedLocation = next;
    });

    vi.clearAllMocks();
  });

  it('renders localized aria labels for open and filter controls', () => {
    render(<FigmaSearchBar />);

    expect(screen.getByRole('button', { name: 'Open search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter by location' })).toBeInTheDocument();
    expect(screen.getByText('Search in your Ummah')).toBeInTheDocument();
    expect(screen.getByText('Everywhere')).toBeInTheDocument();
  });

  it('submits the current query/category/location', () => {
    searchState.searchQuery = 'Doner';
    searchState.selectedLocation = 'Berlin';
    searchState.selectedCategory = 'food';

    const onSearchSubmit = vi.fn();
    render(<FigmaSearchBar onSearchSubmit={onSearchSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(onSearchSubmit).toHaveBeenCalledWith('Doner', 'food', 'Berlin');
  });

  it('opens location dropdown and notifies location change', async () => {
    const onLocationChange = vi.fn();

    render(<FigmaSearchBar onLocationChange={onLocationChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter by location' }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Berlin' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option', { name: 'Berlin' }));

    expect(onLocationChange).toHaveBeenCalledWith('Berlin');
    expect(mockSetSelectedLocation).toHaveBeenCalledWith('Berlin');
  });
});
