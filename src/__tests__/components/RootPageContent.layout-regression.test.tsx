import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RootPageContent } from '@/components/shared/RootPageContent';

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({
    stage: 'stage2',
    cityName: 'Berlin',
    isLoading: false,
  }),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => key === 'isAppLaunched',
}));

vi.mock('@/lib/utils/onboarding-state', () => ({
  getOnboardingState: () => ({ earlyAccessUnlocked: true }),
  setOnboardingState: vi.fn(),
}));

vi.mock('@/components/shared/CityEarlyAccessEmptyState', () => ({
  CityEarlyAccessEmptyState: () => <div data-testid="stage1-empty" />,
}));

vi.mock('@/components/shared/CategoryGallerySection', () => ({
  CategoryGallerySection: () => <div data-testid="category-gallery" />,
}));

vi.mock('@/features/search/components/HomeSearchBar', () => ({
  HomeSearchBar: () => <div data-testid="home-search-bar" />,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => (
    <div aria-label="browse sections" data-testid="home-section-selector" role="tablist" />
  ),
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
  MobileSplashScreen: () => <div data-testid="mobile-splash" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RootPageContent layout regression (Plan 109)', () => {
  it('renders section tabs above the search bar in the fixed header on mobile', async () => {
    render(<RootPageContent />);

    await waitFor(() => {
      expect(screen.getByTestId('home-search-bar')).toBeInTheDocument();
    });

    const searchHeader = screen.getByTestId('home-search-bar').closest('header');
    expect(searchHeader).toBeInTheDocument();
    expect(searchHeader).toHaveClass('fixed', 'left-0', 'right-0', 'top-0', 'z-50');

    const sectionTablist = screen.getByRole('tablist', { name: /browse sections/i });
    expect(sectionTablist).toBeInTheDocument();
    // Section tabs are now inside the fixed header, above the search bar
    expect(searchHeader).toContainElement(sectionTablist);
  });
});
