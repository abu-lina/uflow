import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RootPageContent } from '@/components/shared/RootPageContent';

const requestLocation = vi.fn();
const reset = vi.fn();
const mockUseGeolocation = vi.fn();

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => mockUseGeolocation(),
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

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => <div data-testid="section-selector" />,
}));

vi.mock('@/features/search/components/HomeListView', () => ({
  HomeListView: () => <div data-testid="home-list-view" />,
}));

vi.mock('@/features/search/hooks/useHomeNearMe', () => ({
  useHomeNearMe: () => ({
    isActive: false,
    results: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/search/components/HomeNearMeList', () => ({
  HomeNearMeList: () => <div data-testid="home-near-me-list" />,
}));

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

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => <div data-testid="search-map" />,
}));

vi.mock('@/features/search/components/HomeSearchBar', () => ({
  HomeSearchBar: (props: { onNearMeChange?: (v: boolean) => void }) => (
    <button data-testid="near-me-chip" onClick={() => props.onNearMeChange?.(true)} type="button">
      near me
    </button>
  ),
}));

describe('Plan 212 Near Me viewport regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestLocation.mockReset();
    reset.mockReset();
  });

  it('[pre-fix FAILS / post-fix PASSES] RootPageContent near-me chip calls requestLocation on activate and reset on deactivate', () => {
    mockUseGeolocation.mockReturnValue({
      status: 'idle',
      coords: null,
      requestLocation,
      reset,
    });

    const { rerender, getByTestId } = render(<RootPageContent />);

    fireEvent.click(getByTestId('near-me-chip'));
    expect(requestLocation).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(0);

    mockUseGeolocation.mockReturnValue({
      status: 'granted',
      coords: { latitude: 52.52, longitude: 13.405 },
      requestLocation,
      reset,
    });

    rerender(<RootPageContent />);
    fireEvent.click(getByTestId('near-me-chip'));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(requestLocation).toHaveBeenCalledTimes(1);
  });
});
