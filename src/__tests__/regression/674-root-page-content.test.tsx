// @vitest-environment jsdom
/**
 * #674: one discovery implementation.
 *
 *   AC3 RootPageContent no longer renders a provider list or map; onboarded
 *       users with enough providers (stage 2/3) are sent to the section route
 *       (owner direction on the issue). Section routes render from the search path.
 *   AC6 onboarding and stage 1 content on / are unchanged.
 *   AC8 no in-app navigation targets /?view= any more.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockReplace, nav, gate, appStage, mockGetMapLocations } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  nav: { search: '' },
  gate: { ready: true as boolean | null, city: 'Berlin' as string | null },
  appStage: { stage: 'stage2' as string },
  mockGetMapLocations: vi.fn(async () => []),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/hooks/useOnboardingGate', () => ({
  useOnboardingGate: () => ({ ready: gate.ready, city: gate.city, isRecovering: false }),
}));

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({ stage: appStage.stage, cityName: gate.city, isLoading: false }),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => key === 'skipWaitlist',
}));

vi.mock('@/services/providers', () => ({
  getMapLocations: mockGetMapLocations,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: 'idle',
    coords: null,
    requestLocation: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/features/search/hooks/useNearMe', () => ({
  useNearMe: () => ({ isActive: false, results: [], isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: () => <header data-testid="discovery-header" />,
}));

vi.mock('@/features/search/components/HomeSearchBar', () => ({
  HomeSearchBar: () => <div data-testid="home-search-bar" />,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => <div data-testid="search-map" />,
}));

vi.mock('@/components/shared/CityEarlyAccessEmptyState', () => ({
  CityEarlyAccessEmptyState: () => <div data-testid="stage1-empty" />,
}));

vi.mock('@/components/shared/MobileSplashScreen', () => ({
  MobileSplashScreen: () => <div data-testid="mobile-splash" />,
}));

vi.mock('@/components/shared/LandingHero', () => ({ LandingHero: () => <div /> }));
vi.mock('@/components/shared/AboutSection', () => ({ AboutSection: () => <div /> }));
vi.mock('@/components/shared/ExploreSection', () => ({ ExploreSection: () => <div /> }));
vi.mock('@/components/shared/DesktopWaitlistSection', () => ({
  DesktopWaitlistSection: () => <div />,
}));

import { RootPageContent } from '@/components/shared/RootPageContent';

const SRC = resolve(__dirname, '../..');
const readSrc = (relPath: string) => readFileSync(join(SRC, relPath), 'utf-8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = '';
  gate.ready = true;
  gate.city = 'Berlin';
  appStage.stage = 'stage2';
});

describe('#674 AC3: RootPageContent hands discovery to the section route', () => {
  it('sends an onboarded stage 2 user to the map view of their onboarding city', async () => {
    render(<RootPageContent />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/food?location=Berlin&view=map'),
    );
  });

  it('keeps the query string when a stage 3 user is sent on: /?view=list keeps view=list', async () => {
    appStage.stage = 'stage3';
    nav.search = 'view=list';

    render(<RootPageContent />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/food?view=list&location=Berlin'),
    );
  });

  it('renders no provider list or map on / and loads no map pins', async () => {
    render(<RootPageContent />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(screen.queryByTestId('discovery-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('search-map')).not.toBeInTheDocument();
    expect(mockGetMapLocations).not.toHaveBeenCalled();
  });

  it('removes the pin-derived list path instead of leaving it unreachable', () => {
    const src = readSrc('components/shared/RootPageContent.tsx');

    expect(src).not.toContain('useMapDiscovery');
    expect(src).not.toContain('HomeListView');
    expect(src).not.toContain('SearchMap');
    expect(existsSync(join(SRC, 'features/search/components/HomeListView.tsx'))).toBe(false);
  });

  it('every section route renders its list from the search path', () => {
    for (const route of ['food', 'stores', 'ummah']) {
      expect(readSrc(`app/(public)/${route}/page.tsx`)).toContain('renderProvidersPage(');
    }
    expect(readSrc('app/(public)/providers/renderProvidersPage.tsx')).toContain(
      'searchProvidersAndCommunityServices(',
    );
  });
});

describe('#674 AC6: onboarding and stage 1 on / are unchanged', () => {
  it('shows the onboarding splash and does not redirect when onboarding is incomplete', async () => {
    gate.ready = false;
    gate.city = null;

    render(<RootPageContent />);

    expect(await screen.findByTestId('mobile-splash')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the early-access empty state for stage 1 and does not redirect', async () => {
    appStage.stage = 'stage1';

    render(<RootPageContent />);

    expect(await screen.findByTestId('stage1-empty')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('#674 AC8: internal links point at section routes', () => {
  const files = sourceFiles(SRC);

  it('no source file navigates to /?view=', () => {
    const offenders = files.filter((file) => /['"`]\/\?view=/.test(readFileSync(file, 'utf-8')));
    expect(offenders).toEqual([]);
  });

  it('only section-route discovery syncs ?view= (useMapDiscovery is not used on /)', () => {
    const users = files
      .filter((file) => !file.endsWith('useMapDiscovery.ts'))
      .filter((file) => readFileSync(file, 'utf-8').includes('useMapDiscovery('))
      .map((file) => file.slice(SRC.length + 1));

    expect(users).toEqual(['app/(public)/providers/ProvidersContent.tsx']);
  });
});
