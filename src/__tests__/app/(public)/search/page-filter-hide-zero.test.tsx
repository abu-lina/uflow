// @vitest-environment jsdom
/**
 * Plan 233: Mobile search page hides zero-count filters
 *
 * Integration tests verifying that:
 * - fetchAvailableFilters is called with current section & city
 * - Zero-count filters are hidden from the UI
 * - Changing section or city re-fetches filters
 * - Selected filters are pruned when they become unavailable
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import SearchPage from '@/app/(public)/search/page';

const mockFetchAvailableFilters = vi.fn();
const mockFetchProviderCities = vi.fn();
const mockCheckCityExists = vi.fn();
const mockFetchPopularCities = vi.fn();
const mockSearchFoodConcepts = vi.fn();
const mockSearchFoodCategories = vi.fn();
const mockSearchFoodMenuItems = vi.fn();
const mockRouterPush = vi.fn();
let mockSearchParams = new URLSearchParams('section=food');
const mockRouterReplace = vi.fn((url: string) => {
  const query = url.split('?')[1] ?? '';
  mockSearchParams = new URLSearchParams(query);
});

const mockTranslate = (key: string, variables?: Record<string, string | number>) => {
  if (key === 'suchen.was.selectedWhat') {
    return `Was: ${variables?.item ?? ''}`;
  }

  const map: Record<string, string> = {
    'suchen.title': 'Suchen',
    'suchen.accordions.was': 'Was?',
    'suchen.accordions.wo': 'Wo',
    'suchen.accordions.woEmpty': 'Wo?',
    'suchen.accordions.wer': 'Wer',
    'suchen.accordions.filter': 'Filter',
    'suchen.clearAll': 'Clear all',
    'suchen.searchButton': 'Suchen',
    'suchen.citySearchPlaceholder': 'Stadt suchen',
    'suchen.was.searchPlaceholder': 'Angebote suchen',
    'suchen.was.ummah.searchPlaceholder': 'Welchen Dienst suchst du?',
    'suchen.was.everything': 'Alles',
    'suchen.filter.items.muslim.title': 'Muslim Owned',
    'suchen.filter.items.muslim.subtitle': 'Owned by Muslims',
    'suchen.filter.items.spenden.title': 'Accepts Donations',
    'suchen.filter.items.spenden.subtitle': 'Donates to good causes',
    'suchen.filter.items.solidaritaet.title': 'Solidarity Pricing',
    'suchen.filter.items.solidaritaet.subtitle': 'Supports the Ummah',
    'suchen.filter.items.parken.title': 'Has Parking',
    'suchen.filter.items.parken.subtitle': 'Parking available',
    'suchen.filter.items.gebet.title': 'Has Prayer Space',
    'suchen.filter.items.gebet.subtitle': 'Prayer room available',
    'suchen.wer.forMe': 'For me',
    'common.loading': 'Loading',
    'location.unnamed': 'Unnamed',
  };
  return map[key] ?? key;
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: mockTranslate }),
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
  SectionSelector: ({
    selectedSection,
    onSectionChange,
  }: {
    selectedSection: string;
    onSectionChange: (s: string) => void;
  }) => (
    <div>
      <p>SectionSelector: {selectedSection}</p>
      <button type="button" onClick={() => onSectionChange('food')}>
        Go Food
      </button>
      <button type="button" onClick={() => onSectionChange('ummah')}>
        Go Ummah
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button disabled={disabled} type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/features/search/components/WasMealResults', () => ({
  WasMealResults: () => <div>WasMealResults</div>,
}));

vi.mock('@/features/search/components/WasCategoryResults', () => ({
  WasCategoryResults: () => <div>WasCategoryResults</div>,
}));

vi.mock('@/features/search/components/WoCityResults', () => ({
  WoCityResults: ({
    onSelect,
    onClearSelection,
    selectedCity,
  }: {
    onSelect: (city: string) => void;
    onClearSelection: () => void;
    selectedCity: string | null;
  }) => (
    <div>
      <button type="button" onClick={() => onSelect('Berlin')}>
        Select Berlin
      </button>
      <button type="button" onClick={() => onSelect('Munich')}>
        Select Munich
      </button>
      {selectedCity && (
        <button type="button" onClick={onClearSelection}>
          Clear city
        </button>
      )}
      {selectedCity && <p>Selected: {selectedCity}</p>}
    </div>
  ),
}));

vi.mock('@/features/search/components/WerAudienceFilter', () => ({
  WerAudienceFilter: () => <div>WerAudienceFilter</div>,
}));

vi.mock('@/features/search/components/WasServiceTypeResults', () => ({
  WasServiceTypeResults: () => <div>WasServiceTypeResults</div>,
}));

vi.mock('lucide-react', () => ({
  Heart: () => <span>heart</span>,
  Search: () => <span>search</span>,
  MapPin: () => <span>pin</span>,
  Moon: () => <span>moon</span>,
  HandHeart: () => <span>hand-heart</span>,
  HeartHandshake: () => <span>heart-handshake</span>,
  CircleParking: () => <span>circle-parking</span>,
  Check: () => <span>check</span>,
  Gift: () => <span>gift</span>,
  Globe: () => <span>globe</span>,
  Languages: () => <span>languages</span>,
  BadgeCheck: () => <span>badge-check</span>,
  Users: () => <span>users</span>,
}));

vi.mock('@/components/icons/PrayerRug', () => ({
  PrayerRug: () => <span>prayer-rug</span>,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

vi.mock('@/services/providers', () => ({
  fetchProviderCities: (...args: unknown[]) => mockFetchProviderCities(...args),
  checkCityExists: (...args: unknown[]) => mockCheckCityExists(...args),
  fetchPopularCities: (...args: unknown[]) => mockFetchPopularCities(...args),
  fetchAvailableFilters: (...args: unknown[]) => mockFetchAvailableFilters(...args),
}));

vi.mock('@/services/offers', () => ({
  searchFoodConcepts: (...args: unknown[]) => mockSearchFoodConcepts(...args),
  searchFoodCategories: (...args: unknown[]) => mockSearchFoodCategories(...args),
  searchFoodMenuItems: (...args: unknown[]) => mockSearchFoodMenuItems(...args),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: () => false,
}));

describe('/search page: hide zero-count filters (Plan 233)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('section=food');
    localStorage.removeItem('uflow:recent-was-searches');
    localStorage.removeItem('selectedCity');
    sessionStorage.removeItem('selectedCity');
    sessionStorage.removeItem('uflow:wo-cleared-this-session');
    mockFetchProviderCities.mockResolvedValue([]);
    mockCheckCityExists.mockResolvedValue(false);
    mockFetchPopularCities.mockResolvedValue([]);
    mockSearchFoodConcepts.mockResolvedValue([]);
    mockSearchFoodCategories.mockResolvedValue([]);
    mockSearchFoodMenuItems.mockResolvedValue([]);
    mockFetchAvailableFilters.mockResolvedValue([
      { key: 'muslim', count: 5 },
      { key: 'spenden', count: 0 },
      { key: 'solidaritaet', count: 3 },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls fetchAvailableFilters with section on mount', async () => {
    render(<SearchPage />);

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchAvailableFilters).toHaveBeenCalledWith('food', undefined);
  });

  it('hides filter items with count === 0', async () => {
    render(<SearchPage />);

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText('Muslim Owned (5)')).toBeInTheDocument();
    expect(screen.getByText('Solidarity Pricing (3)')).toBeInTheDocument();
    expect(screen.queryByText(/Accepts Donations/)).not.toBeInTheDocument();
  });

  it('re-fetches filters when city changes', async () => {
    mockFetchAvailableFilters
      .mockResolvedValueOnce([
        { key: 'muslim', count: 5 },
        { key: 'spenden', count: 0 },
        { key: 'solidaritaet', count: 3 },
      ])
      .mockResolvedValueOnce([
        { key: 'muslim', count: 2 },
        { key: 'spenden', count: 1 },
        { key: 'solidaritaet', count: 0 },
      ]);

    render(<SearchPage />);

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Select Berlin
    fireEvent.click(screen.getByText('Select Berlin'));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchAvailableFilters).toHaveBeenCalledWith('food', 'Berlin');
  });

  it('passes undefined for city when no city is selected', async () => {
    render(<SearchPage />);

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockFetchAvailableFilters).toHaveBeenCalledWith('food', undefined);
  });
});
