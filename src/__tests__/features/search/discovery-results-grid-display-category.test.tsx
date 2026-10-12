// @vitest-environment jsdom
/**
 * #254 post-QA: DiscoveryResultsGrid threads `displayCategory` to every card.
 *
 * When a category filter is active, every card in the filtered grid shows
 * the filtered category's name — whether the provider matched on its
 * primary or a secondary. Surfaces without a category filter (near-me,
 * home lists, map pins) never set the prop and keep the primary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const { mockProviderCard } = vi.hoisted(() => ({ mockProviderCard: vi.fn() }));

vi.mock('@/features/providers/components/ProviderCard', () => ({
  ProviderCard: (props: Record<string, unknown>) => {
    mockProviderCard(props);
    return null;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/food',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  DiscoveryResultsGrid,
  type DiscoveryCardItem,
} from '@/features/search/components/DiscoveryResultsGrid';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const KEBAB_DOENER = { name_de: 'Kebab / Döner', name_en: 'Kebab / Döner' };
const TURKISH = { name_de: 'Türkisch', name_en: 'Turkish' };

function makeItem(id: string, category: DiscoveryCardItem['category']): DiscoveryCardItem {
  return {
    id,
    provider_id: id,
    provider_name: `Provider ${id}`,
    provider_images: null,
    category,
    category_id: 'cat-1',
    address_city: 'Berlin',
    listing_type: 'food',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.IntersectionObserver = vi.fn().mockImplementation(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  });
});

describe('#254 post-QA: DiscoveryResultsGrid displayCategory', () => {
  it('hands the filtered category to EVERY card — primary-matched and secondary-matched alike', () => {
    render(
      <DiscoveryResultsGrid
        displayCategory={KEBAB_DOENER}
        headerOffset={0}
        isLoading={false}
        items={[
          makeItem('primary-match', KEBAB_DOENER), // matched on its primary
          makeItem('secondary-match', TURKISH), // matched on a secondary
        ]}
        openNow={false}
        section="food"
      />,
      { wrapper: Wrapper },
    );

    expect(mockProviderCard).toHaveBeenCalledTimes(2);
    for (const call of mockProviderCard.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ displayCategory: KEBAB_DOENER }));
    }
    // The provider's own category still flows through unchanged — the card
    // needs it for fallback imagery; only the badge text is overridden.
    const secondaryMatchProps = mockProviderCard.mock.calls[1][0] as Record<string, unknown>;
    expect(secondaryMatchProps.category).toEqual(TURKISH);
  });

  it('without displayCategory (no filter) cards get no override and keep their primary', () => {
    render(
      <DiscoveryResultsGrid
        headerOffset={0}
        isLoading={false}
        items={[makeItem('1', TURKISH)]}
        openNow={false}
        section="food"
      />,
      { wrapper: Wrapper },
    );

    const cardProps = mockProviderCard.mock.calls[0][0] as Record<string, unknown>;
    expect(cardProps.displayCategory).toBeUndefined();
    expect(cardProps.category).toEqual(TURKISH);
  });
});
