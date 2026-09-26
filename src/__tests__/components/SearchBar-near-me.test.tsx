// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/features/search/components/SearchBar';

const { mockRouterPush, mockSetSelectedLocation, geoMock, navMock, searchCtxMock } = vi.hoisted(
  () => ({
    mockRouterPush: vi.fn(),
    mockSetSelectedLocation: vi.fn(),
    geoMock: {
      status: 'idle' as string,
      coords: null as { latitude: number; longitude: number } | null,
      requestLocation: vi.fn(),
      reset: vi.fn(),
    },
    navMock: {
      searchParams: new URLSearchParams(),
      pathname: '/food/stuttgart',
    },
    searchCtxMock: {
      searchQuery: '',
      selectedLocation: 'Stuttgart',
      selectedSection: 'food' as string,
    },
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => navMock.searchParams,
  usePathname: () => navMock.pathname,
}));

vi.mock('@/providers/search-provider', () => ({
  useSearch: () => ({
    searchQuery: searchCtxMock.searchQuery,
    setSearchQuery: vi.fn(),
    selectedLocation: searchCtxMock.selectedLocation,
    setSelectedLocation: mockSetSelectedLocation,
    selectedSection: searchCtxMock.selectedSection,
  }),
  LOCATION_ALL: '',
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => geoMock,
}));

vi.mock('@/services/providers', () => ({
  fetchSearchSuggestions: vi.fn(() => Promise.resolve([])),
  fetchAvailableFilters: vi.fn(() => Promise.resolve([])),
  fetchProviderCities: vi.fn(() => Promise.resolve([])),
  fetchFilteredCities: vi.fn(() => Promise.resolve([])),
}));

const renderSearchBar = () =>
  render(<SearchBar customCities={['Berlin', 'Stuttgart']} />);

function openLocationDropdown(container: HTMLElement) {
  const chip = container.querySelector('button[aria-haspopup="listbox"]') as HTMLElement;
  fireEvent.click(chip);
}

function clickNearMeOption() {
  const options = screen.getAllByText('suchen.nearMe.chipLabel');
  fireEvent.click(options[options.length - 1]);
}

beforeEach(() => {
  vi.clearAllMocks();
  geoMock.status = 'idle';
  geoMock.coords = null;
  navMock.searchParams = new URLSearchParams();
  navMock.pathname = '/food/stuttgart';
  searchCtxMock.selectedLocation = 'Stuttgart';
});

describe('SearchBar Near Me (deferred navigation)', () => {
  it('requests geolocation and does not navigate while prompting', () => {
    geoMock.status = 'prompting';
    const { container } = renderSearchBar();
    // Initial mount syncs location from the (empty) URL params; ignore it.
    mockSetSelectedLocation.mockClear();
    openLocationDropdown(container);
    clickNearMeOption();

    expect(geoMock.requestLocation).toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockSetSelectedLocation).not.toHaveBeenCalledWith('');
  });

  it('navigates to the section root and clears the location once granted', () => {
    geoMock.status = 'prompting';
    const { container, rerender } = renderSearchBar();
    openLocationDropdown(container);
    clickNearMeOption();
    expect(mockRouterPush).not.toHaveBeenCalled();

    geoMock.status = 'granted';
    geoMock.coords = { latitude: 48.7, longitude: 9.1 };
    rerender(<SearchBar customCities={['Berlin', 'Stuttgart']} />);

    expect(mockSetSelectedLocation).toHaveBeenCalledWith('');
    expect(mockRouterPush).toHaveBeenCalledWith('/food?near_me=1');
  });

  it('keeps the city and never navigates when geolocation is denied', () => {
    geoMock.status = 'prompting';
    const { container, rerender } = renderSearchBar();
    mockSetSelectedLocation.mockClear();
    openLocationDropdown(container);
    clickNearMeOption();

    geoMock.status = 'denied';
    rerender(<SearchBar customCities={['Berlin', 'Stuttgart']} />);

    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockSetSelectedLocation).not.toHaveBeenCalledWith('');
    // Chip still shows the city name, not the Near Me label
    const chip = container.querySelector('button[aria-haspopup="listbox"]') as HTMLElement;
    expect(chip.textContent).toContain('Stuttgart');
    expect(chip.textContent).not.toContain('suchen.nearMe.chipLabel');
  });

  it('does not navigate on a late granted after a city was picked', () => {
    geoMock.status = 'prompting';
    const { container, rerender } = renderSearchBar();
    openLocationDropdown(container);
    clickNearMeOption();
    expect(geoMock.requestLocation).toHaveBeenCalled();

    // User picks a city before the prompt resolves
    openLocationDropdown(container);
    fireEvent.click(screen.getByText('Berlin'));

    geoMock.status = 'granted';
    geoMock.coords = { latitude: 48.7, longitude: 9.1 };
    rerender(<SearchBar customCities={['Berlin', 'Stuttgart']} />);

    expect(mockRouterPush).not.toHaveBeenCalledWith('/food?near_me=1');
  });
});
