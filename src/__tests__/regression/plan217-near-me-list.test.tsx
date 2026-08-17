import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RootPageContent } from '@/components/shared/RootPageContent';
import type { UseHomeNearMeInput } from '@/features/search/hooks/useHomeNearMe';
import type { NearMeFoodResult } from '@/services/providers';

const mockUseHomeNearMe = vi.fn();

vi.mock('@/features/search/hooks/useHomeNearMe', () => ({
  useHomeNearMe: (input: UseHomeNearMeInput) => mockUseHomeNearMe(input),
}));

vi.mock('@/features/search/components/HomeNearMeList', () => ({
  HomeNearMeList: () => <div data-testid="home-near-me-list" />,
}));

vi.mock('@/features/search/components/HomeListView', () => ({
  HomeListView: () => <div data-testid="home-list-view" />,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => <div data-testid="search-map" />,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => <div data-testid="section-selector" />,
}));

vi.mock('@/features/search/components/HomeSearchBar', () => ({
  HomeSearchBar: () => <div data-testid="home-search-bar" />,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({
    stage: 'stage2',
    cityName: 'Berlin',
    isLoading: false,
  }),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: () => true,
}));

vi.mock('@/lib/utils/onboarding-state', () => ({
  getOnboardingState: () => ({ earlyAccessUnlocked: true }),
  setOnboardingState: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => {
  const query = {
    select: vi.fn(() => query),
    not: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (resolve: (value: { data: unknown[] }) => unknown) => Promise.resolve(resolve({ data: [] })),
  };

  return {
    supabase: {
      from: vi.fn(() => query),
    },
  };
});

vi.mock('@/components/shared/AboutSection', () => ({
  AboutSection: () => <div />,
}));

vi.mock('@/components/shared/DesktopWaitlistSection', () => ({
  DesktopWaitlistSection: () => <div />,
}));

vi.mock('@/components/shared/ExploreSection', () => ({
  ExploreSection: () => <div />,
}));

vi.mock('@/components/shared/LandingHero', () => ({
  LandingHero: () => <div />,
}));

vi.mock('@/components/shared/MobileSplashScreen', () => ({
  MobileSplashScreen: () => <div />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function mockHomeNearMe(overrides: {
  isActive?: boolean;
  results?: NearMeFoodResult[];
  isLoading?: boolean;
  error?: Error | null;
} = {}) {
  return {
    isActive: false,
    results: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('Plan 217 near-me List view regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHomeNearMe.mockReturnValue(mockHomeNearMe());
  });

  async function switchToListView() {
    const toggleButton = await screen.findByRole('button', { name: 'map.switchToList' });
    fireEvent.click(toggleButton);
  }

  it('[pre-fix FAILS / post-fix PASSES] near-me granted + list view renders the near-me list component (not HomeListView)', async () => {
    mockUseHomeNearMe.mockReturnValue(
      mockHomeNearMe({
        isActive: true,
        results: [
          {
            provider_id: 'p-near',
            provider_name: 'Near',
            provider_images: null,
            category_id: null,
            category_name_de: null,
            category_name_en: null,
            category_images: null,
            address_city: 'Berlin',
            opening_hours: null,
            location_latitude: 52.5,
            location_longitude: 13.4,
            distance_km: 0.5,
          },
        ],
        isLoading: false,
        error: null,
      }),
    );

    render(<RootPageContent />);
    await switchToListView();

    await waitFor(() => {
      expect(screen.getByTestId('home-near-me-list')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('home-list-view')).not.toBeInTheDocument();
  });

  it('[pre-fix FAILS / post-fix PASSES] near-me denied/idle + list view renders HomeListView, near-me list NOT rendered', async () => {
    mockUseHomeNearMe.mockReturnValue(mockHomeNearMe({ isActive: false }));

    render(<RootPageContent />);
    await switchToListView();

    await waitFor(() => {
      expect(screen.getByTestId('home-list-view')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('home-near-me-list')).not.toBeInTheDocument();
  });

  it('[post-fix PASSES] map view with granted coords still renders SearchMap, near-me list NOT rendered', async () => {
    mockUseHomeNearMe.mockReturnValue(mockHomeNearMe({ isActive: false }));

    render(<RootPageContent />);

    await waitFor(() => {
      expect(screen.getByTestId('search-map')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('home-near-me-list')).not.toBeInTheDocument();
  });
});
