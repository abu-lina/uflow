import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SearchPage from '@/app/(public)/search/page';

const { mockUseSearchParams } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(() => new URLSearchParams('section=food')),
}));

let localStorageStore: Record<string, string> = {};
let sessionStorageStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { localStorageStore = {}; }),
  get length() { return Object.keys(localStorageStore).length; },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};

const mockSessionStorage = {
  getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete sessionStorageStore[key]; }),
  clear: vi.fn(() => { sessionStorageStore = {}; }),
  get length() { return Object.keys(sessionStorageStore).length; },
  key: vi.fn((index: number) => Object.keys(sessionStorageStore)[index] ?? null),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'suchen.clearAll': 'Clear all',
        'suchen.was.everything': 'Everything',
        'suchen.was.selectedWhat': 'Selected: {item}',
        'suchen.wo.selectedWhere': 'Selected: {city}',
        'suchen.accordions.was': 'What?',
        'suchen.accordions.wo': 'Where?',
        'suchen.accordions.wer': 'Who?',
        'suchen.accordions.filter': 'Filter',
        'suchen.searchButton': 'Search',
        'suchen.wo.loading': 'Loading...',
        'suchen.wo.searchError': 'Error',
        'suchen.wo.selectionLabel': 'Your selection',
        'suchen.wo.removeSelection': 'Remove',
        'suchen.title': 'Search',
      };
      return map[key] ?? key;
    },
    language: 'en',
    locale: 'en',
  }),
}));

vi.mock('@/components/layout/ScrollablePageLayout', () => ({
  ScrollablePageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: () => null,
}));

vi.mock('@/components/layout/PageContent', () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => null,
}));

vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/features/search/components/WoCityResults', () => ({
  WoCityResults: ({ selectedCity, onClearSelection }: any) => (
    <div data-testid="wo-city-results">
      {selectedCity && (
        <div>
          <span data-testid="selected-city">{selectedCity}</span>
          <button data-testid="wo-clear-button" onClick={onClearSelection} type="button">
            Clear
          </button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('@/features/search/components/WasMealResults', () => ({
  WasMealResults: () => null,
}));

vi.mock('@/features/search/components/WasCategoryResults', () => ({
  WasCategoryResults: () => null,
}));

vi.mock('@/features/search/components/WasServiceTypeResults', () => ({
  WasServiceTypeResults: () => null,
}));

vi.mock('@/features/search/components/WerAudienceFilter', () => ({
  WerAudienceFilter: () => null,
}));

vi.mock('@/features/search/components/FilterSection', () => ({
  FilterSection: () => null,
}));

vi.mock('@/features/search/components/UmmahFilterSection', () => ({
  UmmahFilterSection: () => null,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })) },
  },
}));

vi.mock('@/services/offers', () => ({
  searchFoodConcepts: vi.fn(() => Promise.resolve([])),
  searchFoodCategories: vi.fn(() => Promise.resolve([])),
  searchFoodMenuItems: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/providers', () => ({
  fetchPopularCities: vi.fn(() => Promise.resolve([])),
  fetchProviderCities: vi.fn(() => Promise.resolve([])),
  checkCityExists: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('@/lib/search-params', () => ({
  buildSearchParams: vi.fn(() => new URLSearchParams('section=food')),
  toFoodRecentSearches: vi.fn((entries: any[]) => entries),
}));

vi.mock('@/config/sectionFilters', () => ({
  getResultsPathForSection: vi.fn(() => '/food'),
  SECTION_META: {
    food: { active: true, labelKey: 'sections.food' },
    ummah: { active: false, labelKey: 'sections.ummah', badgeKey: 'sections.soon' },
    store: { active: false, labelKey: 'sections.stores', badgeKey: 'sections.soon' },
  },
}));

vi.mock('lucide-react', () => {
  const NullIcon = () => null;
  return {
    Heart: NullIcon,
    Search: NullIcon,
    MapPin: NullIcon,
    LayoutGrid: NullIcon,
    UtensilsCrossed: NullIcon,
    X: NullIcon,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorageStore = {};
  sessionStorageStore = {};
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, configurable: true });
});

describe('Search page storage cleanup (Plan 172)', () => {
  it('sets session flag after Wo clear selection', async () => {
    localStorageStore['selectedCity'] = 'Stuttgart';

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-city')).toHaveTextContent('Stuttgart');
    });

    const clearButton = screen.getByTestId('wo-clear-button');
    await act(async () => { fireEvent.click(clearButton); });

    expect(localStorageStore['selectedCity']).toBeUndefined();
    expect(sessionStorageStore['selectedCity']).toBeUndefined();
    expect(sessionStorageStore['uflow:wo-cleared-this-session']).toBe('true');
  });

  it('sets session flag after Clear all button', async () => {
    localStorageStore['selectedCity'] = 'Stuttgart';

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-city')).toHaveTextContent('Stuttgart');
    });

    const clearAllButton = screen.getByText('Clear all');
    await act(async () => { fireEvent.click(clearAllButton); });

    expect(localStorageStore['selectedCity']).toBeUndefined();
    expect(sessionStorageStore['selectedCity']).toBeUndefined();
    expect(sessionStorageStore['uflow:wo-cleared-this-session']).toBe('true');
  });

  it('does not clear storage when Wo city is selected (not cleared)', async () => {
    localStorageStore['selectedCity'] = 'Stuttgart';

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-city')).toHaveTextContent('Stuttgart');
    });

    expect(localStorageStore['selectedCity']).toBe('Stuttgart');
    expect(sessionStorageStore['uflow:wo-cleared-this-session']).toBeUndefined();
  });
});
