import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import SearchPage from '@/app/(public)/search/page';

const mockSearchFoodConcepts = vi.fn();
const mockSearchFoodCategories = vi.fn();
const mockSearchFoodMenuItems = vi.fn();
const mockFetchProviderCities = vi.fn();
const mockCheckCityExists = vi.fn();
let lastWasMealProps: { isError?: boolean } | null = null;
const mockTranslate = (key: string, variables?: Record<string, string | number>) => {
  if (key === 'suchen.was.selectedWhat') {
    return `Was: ${variables?.item ?? ''}`;
  }

  const map: Record<string, string> = {
    'suchen.title': 'Suchen',
    'suchen.accordions.was': 'Was?',
    'suchen.accordions.wo': 'Wo',
    'suchen.accordions.wer': 'Wer',
    'suchen.accordions.filter': 'Filter',
    'suchen.clearAll': 'Alles loeschen',
    'suchen.searchButton': 'Suchen',
    'suchen.citySearchPlaceholder': 'Stadt suchen',
    'suchen.searchCityPrompt': 'Suche nach deiner Stadt',
    'suchen.was.searchPlaceholder': 'Was suchst du?',
    'suchen.was.loading': 'Suche laeuft...',
    'suchen.was.searchError': 'Suche nicht verfuegbar. Bitte versuche es erneut.',
    'suchen.was.noResults': 'Noch nichts gefunden - aber wir wachsen!',
    'suchen.was.notFoundEncouragement': 'Vielleicht bald verfuegbar.',
    'suchen.was.providerCount': '{{count}} Restaurants',
    'suchen.was.selectedWhat': 'Was: {{item}}',
    'common.loading': 'Loading',
    'location.unnamed': 'Unbenannt',
  };
  return map[key] ?? key;
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('section=food'),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: mockTranslate,
  }),
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
  SectionSelector: () => <div>SectionSelector</div>,
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
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/features/search/components/EmptyCityCard', () => ({
  EmptyCityCard: () => <div>EmptyCityCard</div>,
}));

vi.mock('@/features/search/components/WasMealResults', () => ({
  WasMealResults: ({
    onSelect,
    query,
    isError,
  }: {
    onSelect: (itemName: string) => void;
    query: string;
    isError?: boolean;
  }) => {
    lastWasMealProps = { isError };
    return (
      <>
        {isError ? <p>Meal error</p> : null}
        <button type="button" onClick={() => onSelect('Doener')}>
          Select result for {query}
        </button>
      </>
    );
  },
}));

vi.mock('lucide-react', () => ({
  Heart: () => <span>heart</span>,
  Search: () => <span>search</span>,
  MapPin: () => <span>pin</span>,
  UtensilsCrossed: () => <span>utensils</span>,
  X: () => <span>x</span>,
  Moon: () => <span>moon</span>,
  HandHeart: () => <span>hand-heart</span>,
  HeartHandshake: () => <span>heart-handshake</span>,
  CircleParking: () => <span>circle-parking</span>,
  Check: () => <span>check</span>,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
      }),
    },
  },
}));

vi.mock('@/services/providers', () => ({
  fetchProviderCities: (...args: unknown[]) => mockFetchProviderCities(...args),
  checkCityExists: (...args: unknown[]) => mockCheckCityExists(...args),
}));

vi.mock('@/services/offers', () => ({
  searchFoodConcepts: (...args: unknown[]) => mockSearchFoodConcepts(...args),
  searchFoodCategories: (...args: unknown[]) => mockSearchFoodCategories(...args),
  searchFoodMenuItems: (...args: unknown[]) => mockSearchFoodMenuItems(...args),
}));

describe('/search page meal search wiring (Plan 096)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetchProviderCities.mockResolvedValue([]);
    mockCheckCityExists.mockResolvedValue(false);
    lastWasMealProps = null;
    mockSearchFoodCategories.mockResolvedValue([]);
    mockSearchFoodMenuItems.mockResolvedValue([]);
    mockSearchFoodConcepts.mockResolvedValue([
      {
        offer_id: 'offer-1',
        name_de: 'Doener',
        name_en: 'Doner',
        provider_count: 3,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call RPC for 1-character query', async () => {
    render(<SearchPage />);

    const input = screen.getByRole('searchbox', { name: 'Angebote suchen' });
    fireEvent.change(input, { target: { value: 'd' } });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockSearchFoodConcepts).not.toHaveBeenCalled();
  });

  it('calls RPC with default limit=10 for 2+ character query after debounce', async () => {
    render(<SearchPage />);

    const input = screen.getByRole('searchbox', { name: 'Angebote suchen' });
    fireEvent.change(input, { target: { value: 'doe' } });

    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(mockSearchFoodConcepts).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockSearchFoodConcepts).toHaveBeenCalledWith({
      search_query: 'doe',
      limit_count: 10,
    });
  });

  it('selecting a result clears the Was input after selection', async () => {
    render(<SearchPage />);

    const input = screen.getByRole('searchbox', { name: 'Angebote suchen' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'doe' } });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
    });

    const rowButton = screen.getByRole('button', { name: /Select result for doe/i });
    fireEvent.click(rowButton);

    expect(input.value).toBe('');
  });

  it('shows meal error when either meal source fails', async () => {
    mockSearchFoodConcepts.mockResolvedValue([]);
    mockSearchFoodMenuItems.mockRejectedValue(new Error('menu rpc failed'));

    render(<SearchPage />);

    const input = screen.getByRole('searchbox', { name: 'Angebote suchen' });
    fireEvent.change(input, { target: { value: 'doe' } });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runOnlyPendingTimersAsync();
    });

    expect(lastWasMealProps?.isError).toBe(true);
    expect(screen.getByText('Meal error')).toBeInTheDocument();
  });
});
