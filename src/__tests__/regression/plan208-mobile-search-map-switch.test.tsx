import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import SearchPage from '@/app/(public)/search/page';

let mockSection: 'food' | 'ummah' | 'store' = 'food';
let mockIsMobile = false;
let mockView: string | null = null;

// Hoisted refs available inside vi.mock factories
const { capturedPins, mockSupabaseFrom } = vi.hoisted(() => {
  // Default query chain: resolves with empty data
  function makeChain(data: unknown[] = []) {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.then = (onfulfilled?: (v: { data: unknown[] }) => unknown, onrejected?: (e: unknown) => unknown) =>
      Promise.resolve({ data }).then(onfulfilled, onrejected);
    return chain;
  }
  return {
    capturedPins: { current: [] as unknown[] },
    mockSupabaseFrom: vi.fn(() => makeChain()),
    _makeChain: makeChain,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => {
    const params = new URLSearchParams(`section=${mockSection}`);
    if (mockView) params.set('view', mockView);
    return params;
  },
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: (props: { pins: unknown[] }) => {
    capturedPins.current = props.pins;
    return <div data-testid="search-map">Map</div>;
  },
}));

vi.mock('@/components/common/error-boundary/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/services/providers', () => ({
  fetchProviderCities: vi.fn(async () => []),
  fetchPopularCities: vi.fn(async () => []),
  checkCityExists: vi.fn(async () => true),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: mockSupabaseFrom,
  },
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/layout/ScrollablePageLayout', () => ({
  ScrollablePageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageContent', () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: ({ onSectionChange }: { onSectionChange: (section: 'food' | 'ummah' | 'store') => void }) => (
    <div>
      <button type="button" onClick={() => onSectionChange('food')}>Section food</button>
      <button type="button" onClick={() => onSectionChange('ummah')}>Section ummah</button>
      <button type="button" onClick={() => onSectionChange('store')}>Section store</button>
    </div>
  ),
}));

vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

describe('Plan 208 mobile map switch', () => {
  beforeEach(() => {
    mockIsMobile = false;
    mockSection = 'food';
    mockView = null;
    capturedPins.current = [];
    mockSupabaseFrom.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('[pre-fix FAILS / post-fix PASSES] mobile food without view param renders filters, not map', async () => {
    mockIsMobile = true;
    mockSection = 'food';
    mockView = null;

    render(<SearchPage />);

    expect(screen.queryByTestId('search-map')).not.toBeInTheDocument();
    expect(await screen.findByText('suchen.accordions.woEmpty')).toBeInTheDocument();
  });

  it('[pre-fix FAILS / post-fix PASSES] mobile food with view=filters renders filters, not map', async () => {
    mockIsMobile = true;
    mockSection = 'food';
    mockView = 'filters';

    render(<SearchPage />);

    expect(screen.queryByTestId('search-map')).not.toBeInTheDocument();
    expect(await screen.findByText('suchen.accordions.woEmpty')).toBeInTheDocument();
  });

  it('renders map on mobile food when view=map', async () => {
    mockIsMobile = true;
    mockSection = 'food';
    mockView = 'map';

    render(<SearchPage />);

    expect(await screen.findByTestId('search-map')).toBeInTheDocument();
  });

  it('does not render map on desktop even with view=map', async () => {
    mockIsMobile = false;
    mockSection = 'food';
    mockView = 'map';

    render(<SearchPage />);

    expect(screen.queryByTestId('search-map')).not.toBeInTheDocument();
  });

  it('[post-fix] passes provider pins to SearchMap when location data is returned', async () => {
    const locationData = [
      { provider_id: 'p1', location_latitude: 52.52, location_longitude: 13.405, providers: { provider_name: 'Test Restaurant' } },
      { provider_id: 'p2', location_latitude: 48.14, location_longitude: 11.58, providers: [{ provider_name: 'Second Place' }] },
    ];
    // Override default empty chain with one that returns pin data
    mockSupabaseFrom.mockReturnValueOnce((() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.not = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.then = (onfulfilled?: (v: { data: unknown[] }) => unknown, onrejected?: (e: unknown) => unknown) =>
        Promise.resolve({ data: locationData }).then(onfulfilled, onrejected);
      return chain;
    })());

    mockIsMobile = true;
    mockSection = 'food';
    mockView = 'map';

    render(<SearchPage />);

    await screen.findByTestId('search-map');
    await waitFor(() => {
      expect(capturedPins.current.length).toBeGreaterThan(0);
    });
  });

  it('[post-fix] does not fetch pins when filters shown (mobile food, no view)', async () => {
    mockIsMobile = true;
    mockSection = 'food';
    mockView = null;

    render(<SearchPage />);

    expect(screen.queryByTestId('search-map')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockSupabaseFrom).not.toHaveBeenCalledWith('locations');
    });
  });
});
