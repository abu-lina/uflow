// @vitest-environment jsdom
/**
 * #730 - Pin the exact discovery result-count string in de and en.
 * Uses the real LanguageProvider and real translation bundles (no mocked t).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/features/providers/components/ProviderCard', () => ({
  ProviderCard: () => null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/providers',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import {
  DiscoveryResultsGrid,
  type DiscoveryCardItem,
} from '@/features/search/components/DiscoveryResultsGrid';
import { LanguageProvider } from '@/providers/LanguageProvider';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
}

function makeItems(count: number): DiscoveryCardItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    provider_id: String(i + 1),
    provider_name: `Provider ${i + 1}`,
    provider_images: null,
    category: { name_de: 'Test Category' },
    category_id: 'cat-1',
    address_city: 'Berlin',
    listing_type: 'store',
  }));
}

function renderStoreList(locale: 'de' | 'en') {
  localStorage.setItem('preferred-language', locale);
  render(
    <DiscoveryResultsGrid
      headerOffset={0}
      isLoading={false}
      items={makeItems(7)}
      openNow={false}
      section="store"
      totalCount={7}
    />,
    { wrapper: Wrapper },
  );
}

describe('#730 - discovery result-count string in real locales', () => {
  beforeEach(() => {
    localStorage.clear();
    window.IntersectionObserver = vi.fn().mockImplementation(function () {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  it('renders the exact German count line for 7 store providers', async () => {
    renderStoreList('de');
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('7 Geschäfte'));
  });

  it('renders the exact English count line for 7 store providers', async () => {
    renderStoreList('en');
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('7 Stores'));
  });
});
