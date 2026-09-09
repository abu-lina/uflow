// @vitest-environment jsdom
/**
 * Plan 229 - Provider count display in DiscoveryResultsGrid
 *
 * Tests that the results grid shows the total provider count above the grid,
 * using section-aware i18n labels, proper accessibility attributes, and
 * correct visibility behavior (hidden during loading and empty states).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/providers',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useLanguage to return section-aware translations
const mockT = vi.fn((key: string, vars?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'discovery.resultsCount.food': `${vars?.count ?? 0} Restaurants`,
    'discovery.resultsCount.store': `${vars?.count ?? 0} Stores`,
    'discovery.resultsCount.ummah': `${vars?.count ?? 0} Community Services`,
    'map.noProviders': 'No providers found',
    'map.noProvidersHint': 'Try a different search',
    'map.noOpenProviders': 'No open providers',
    'map.noOpenProvidersHint': 'Try again later',
    'suchen.nearMe.errorLoading': 'Error loading',
    'suchen.nearMe.errorTitle': 'Error',
    'suchen.nearMe.retry': 'Try again',
  };
  return translations[key] ?? key;
});

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

// Mock useIsMobile
let mockIsMobile = false;
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: function MockNextImage(props: Record<string, unknown>) {
    return React.createElement('img', {
      src: String(props.src || ''),
      alt: String(props.alt || ''),
    });
  },
}));

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock auth provider (ProviderCard uses useAuth)
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock Supabase client (used by ProviderCard for bookmarks)
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  DiscoveryResultsGrid,
  type DiscoveryCardItem,
} from '@/features/search/components/DiscoveryResultsGrid';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function makeItem(id: string): DiscoveryCardItem {
  return {
    id,
    provider_id: id,
    provider_name: `Provider ${id}`,
    provider_images: null,
    category: { name_de: 'Test Category' },
    category_id: 'cat-1',
    address_city: 'Berlin',
    listing_type: 'food',
  };
}

// IntersectionObserver mock for jsdom
beforeEach(() => {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe('Plan 229 - Provider count display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
  });

  it('renders the count above the grid when totalCount is provided', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1'), makeItem('2')]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
      { wrapper: Wrapper },
    );

    const countEl = screen.getByRole('status');
    expect(countEl).toBeTruthy();
    expect(countEl.textContent).toContain('42');
    expect(countEl.textContent).toContain('Restaurants');
  });

  it('uses section-aware label for store section', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="store"
        totalCount={10}
      />,
      { wrapper: Wrapper },
    );

    const countEl = screen.getByRole('status');
    expect(countEl.textContent).toContain('10');
    expect(countEl.textContent).toContain('Stores');
  });

  it('uses section-aware label for ummah section', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="ummah"
        totalCount={5}
      />,
      { wrapper: Wrapper },
    );

    const countEl = screen.getByRole('status');
    expect(countEl.textContent).toContain('5');
    expect(countEl.textContent).toContain('Community Services');
  });

  it('hides count during loading', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={true}
        items={[]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
    );

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides count when results are empty', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[]}
        openNow={false}
        section="food"
        totalCount={0}
      />,
    );

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides count when totalCount is undefined', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="food"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides count when isOpenNow is active (totalCount omitted to avoid mismatch)', () => {
    // When "Open Now" filter is active, ProvidersContent passes totalCount={undefined}
    // because the Supabase count reflects unfiltered results while filterOpenNow()
    // removes closed providers client-side, causing a mismatch.
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1'), makeItem('2')]}
        openNow={true}
        section="food"
        totalCount={undefined}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
      { wrapper: Wrapper },
    );

    const countEl = screen.getByRole('status');
    expect(countEl.getAttribute('aria-live')).toBe('polite');
  });

  it('applies correct design tokens (font-inter, text-sm, text-text-muted)', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
      { wrapper: Wrapper },
    );

    const countEl = screen.getByRole('status');
    const classes = countEl.className;
    expect(classes).toContain('font-inter');
    expect(classes).toContain('text-sm');
    expect(classes).toContain('text-text-muted');
  });

  it('renders count on both mobile and desktop', () => {
    // Desktop
    mockIsMobile = false;
    const { unmount } = render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('status')).toBeTruthy();
    unmount();

    // Mobile
    mockIsMobile = true;
    render(
      <DiscoveryResultsGrid
        headerOffset={100}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('calls t() with the correct translation key and count variable', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1')]}
        openNow={false}
        section="food"
        totalCount={42}
      />,
      { wrapper: Wrapper },
    );

    expect(mockT).toHaveBeenCalledWith('discovery.resultsCount.food', { count: 42 });
  });
});
