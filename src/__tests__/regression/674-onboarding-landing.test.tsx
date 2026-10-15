// @vitest-environment jsdom
/**
 * #674 (widened scope, owner direction): where onboarding lands.
 *
 *   Flow 1 A city at or above the stage 2 threshold lands on the map view,
 *          zoomed to the city picked during onboarding.
 *   Flow 2 A city below the threshold shows "currently being built" with two
 *          buttons: recommend, and Explore UmmahFlow, which opens the map of
 *          the nearest city above the threshold (all providers when none).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPush, mockRpc, mockFrom, mockFindNearest, mockGetCityCenter, mockSearch } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockFindNearest: vi.fn(),
    mockGetCityCenter: vi.fn(),
    mockSearch: vi.fn(async () => ({ results: [], hasMore: false, totalCount: 0 })),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/components/ui/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: mockRpc, from: mockFrom } }));

vi.mock('@/services/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/providers')>()),
  findNearestCityWithProviders: mockFindNearest,
  getCityCenter: mockGetCityCenter,
  searchProvidersAndCommunityServices: mockSearch,
}));

vi.mock('@/app/(public)/providers/ProvidersContent', () => ({
  ProvidersContent: () => null,
}));

vi.mock('@/services/categories', () => ({ getCategoryById: vi.fn(async () => null) }));

import { getCityMapPath } from '@/config/sectionFilters';
import { STAGE2_MIN_PROVIDERS } from '@/hooks/useAppStage';
import { getSelectedCityCoords, setSelectedCityCoords } from '@/lib/utils/selected-city-coords';
import { CityEarlyAccessEmptyState } from '@/components/shared/CityEarlyAccessEmptyState';
import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
});

describe('#674 flow 1: onboarding lands on the map view of the onboarding city', () => {
  it('builds the map path for a city: /food?location=<city>&view=map', () => {
    expect(getCityMapPath('Berlin')).toBe('/food?location=Berlin&view=map');
    expect(getCityMapPath('Frankfurt am Main')).toBe(
      '/food?location=Frankfurt+am+Main&view=map',
    );
  });

  it('keeps explicit params: an incoming location or view wins', () => {
    expect(getCityMapPath('Berlin', new URLSearchParams('view=list&q=doener'))).toBe(
      '/food?view=list&q=doener&location=Berlin',
    );
    expect(getCityMapPath('Berlin', new URLSearchParams('location=Hamburg'))).toBe(
      '/food?location=Hamburg&view=map',
    );
  });

  it('without a city, opens the map of all providers', () => {
    expect(getCityMapPath(null)).toBe('/food?view=map');
  });

  it('passes the center of ?location= to the section page so the map can zoom to it', async () => {
    mockGetCityCenter.mockResolvedValue({ lat: 52.52, lng: 13.405 });

    const element = (await renderProvidersPage({
      searchParams: Promise.resolve({ location: 'Berlin', view: 'map' }),
      routeSection: 'food',
    })) as ReactElement<{ children: ReactElement<Record<string, unknown>> }>;

    expect(mockGetCityCenter).toHaveBeenCalledWith('Berlin');
    expect(element.props.children.type).toBe(ProvidersContent);
    expect(element.props.children.props.mapCenter).toEqual({ lat: 52.52, lng: 13.405 });
  });

  it('looks up no center when no city is in scope', async () => {
    const element = (await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
    })) as ReactElement<{ children: ReactElement<Record<string, unknown>> }>;

    expect(mockGetCityCenter).not.toHaveBeenCalled();
    expect(element.props.children.props.mapCenter).toBeNull();
  });
});

describe('#674 flow 2: below the threshold, "currently being built" offers two ways on', () => {
  const renderEmptyState = () => render(<CityEarlyAccessEmptyState cityName="Bielefeld" />);

  it('shows the recommend button and the Explore UmmahFlow button', () => {
    renderEmptyState();

    expect(
      screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.suggestProvider' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.exploreUmmahFlow' }),
    ).toBeInTheDocument();
  });

  it('recommend opens the recommend form', () => {
    renderEmptyState();

    fireEvent.click(screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.suggestProvider' }));

    expect(mockPush).toHaveBeenCalledWith('/create/recommend');
  });

  it('Explore UmmahFlow opens the map of the nearest city above the threshold', async () => {
    mockFindNearest.mockResolvedValue('Hannover');
    setSelectedCityCoords({ lat: 52.02, lon: 8.53 });
    renderEmptyState();

    fireEvent.click(screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.exploreUmmahFlow' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/food?location=Hannover&view=map'));
    expect(mockFindNearest).toHaveBeenCalledWith('Bielefeld', STAGE2_MIN_PROVIDERS, {
      lat: 52.02,
      lon: 8.53,
    });
  });

  it('shows a loading state while the nearest city is looked up', async () => {
    mockFindNearest.mockReturnValue(new Promise(() => {}));
    renderEmptyState();

    const explore = screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.exploreUmmahFlow' });
    fireEvent.click(explore);

    await waitFor(() => expect(explore).toBeDisabled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the map of all providers when no city is above the threshold', async () => {
    mockFindNearest.mockResolvedValue(null);
    renderEmptyState();

    fireEvent.click(screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.exploreUmmahFlow' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/food?view=map'));
  });

  it('opens the map of all providers when the lookup fails', async () => {
    mockFindNearest.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderEmptyState();

    fireEvent.click(screen.getByRole('button', { name: 'waitlist.cityEarlyAccess.exploreUmmahFlow' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/food?view=map'));
  });

  it('the threshold matches the stage 2 boundary used by useAppStage (6 providers)', () => {
    expect(STAGE2_MIN_PROVIDERS).toBe(6);
  });
});

describe('#674 flow 2: city coordinates from onboarding search', () => {
  it('stores and reads the coordinates of a city picked through search', () => {
    setSelectedCityCoords({ lat: 52.02, lon: 8.53 });
    expect(getSelectedCityCoords()).toEqual({ lat: 52.02, lon: 8.53 });
  });

  it('clears them when a city without coordinates is picked', () => {
    setSelectedCityCoords({ lat: 52.02, lon: 8.53 });
    setSelectedCityCoords(null);
    expect(getSelectedCityCoords()).toBeNull();
  });

  it('ignores corrupt stored values', () => {
    localStorage.setItem('selectedCityCoords', '{"lat":"x"}');
    expect(getSelectedCityCoords()).toBeNull();
  });
});

describe('#674 flow 2: nearest city and city center services', () => {
  it('asks the RPC for the nearest city with at least the threshold of providers', async () => {
    const { findNearestCityWithProviders } = await vi.importActual<
      typeof import('@/services/providers')
    >('@/services/providers');
    mockRpc.mockResolvedValue({ data: [{ city_name: 'Hannover' }], error: null });

    await expect(
      findNearestCityWithProviders('Bielefeld', 6, { lat: 52.02, lon: 8.53 }),
    ).resolves.toBe('Hannover');
    expect(mockRpc).toHaveBeenCalledWith('get_nearest_city_with_providers', {
      p_city_name: 'Bielefeld',
      p_min_providers: 6,
      p_lat: 52.02,
      p_lon: 8.53,
    });
  });

  it('sends null coordinates when the city was not picked through search', async () => {
    const { findNearestCityWithProviders } = await vi.importActual<
      typeof import('@/services/providers')
    >('@/services/providers');
    mockRpc.mockResolvedValue({ data: [], error: null });

    await expect(findNearestCityWithProviders('Bielefeld', 6)).resolves.toBeNull();
    expect(mockRpc).toHaveBeenCalledWith(
      'get_nearest_city_with_providers',
      expect.objectContaining({ p_lat: null, p_lon: null }),
    );
  });

  it('throws when the RPC fails, so the caller can fall back', async () => {
    const { findNearestCityWithProviders } = await vi.importActual<
      typeof import('@/services/providers')
    >('@/services/providers');
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(findNearestCityWithProviders('Bielefeld', 6)).rejects.toBeTruthy();
  });

  it('reads a city center from the cities table', async () => {
    const { getCityCenter } = await vi.importActual<typeof import('@/services/providers')>(
      '@/services/providers',
    );
    const maybeSingle = vi.fn(async () => ({
      data: { latitude: 52.52, longitude: 13.405 },
      error: null,
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    await expect(getCityCenter('Berlin')).resolves.toEqual({ lat: 52.52, lng: 13.405 });
    expect(mockFrom).toHaveBeenCalledWith('cities');
    expect(eq).toHaveBeenCalledWith('city_name', 'Berlin');
  });

  it('returns null for a city without coordinates or on error', async () => {
    const { getCityCenter } = await vi.importActual<typeof import('@/services/providers')>(
      '@/services/providers',
    );
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: { latitude: null, longitude: null }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getCityCenter('Nowhere')).resolves.toBeNull();
    await expect(getCityCenter('Berlin')).resolves.toBeNull();
  });
});
