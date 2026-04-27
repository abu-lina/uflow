import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import SearchPage from '@/app/(public)/search/page';

const mockSearchFoodConcepts = vi.fn();
const mockSearchFoodCategories = vi.fn();
const mockSearchFoodMenuItems = vi.fn();
const mockFetchProviderCities = vi.fn();
const mockCheckCityExists = vi.fn();
const mockRouterPush = vi.fn();
let lastWasMealProps: { isError?: boolean } | null = null;
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
    'suchen.accordions.filter': 'Values & Amenities',
    'suchen.clearAll': 'Alles loeschen',
    'suchen.searchButton': 'Suchen',
    'suchen.citySearchPlaceholder': 'Stadt suchen',
    'suchen.searchCityPrompt': 'Suche nach deiner Stadt',
    'suchen.was.searchPlaceholder': 'Was suchst du?',
    'suchen.was.ummah.searchPlaceholder': 'Welchen Dienst suchst du?',
    'suchen.was.loading': 'Suche laeuft...',
    'suchen.was.searchError': 'Suche nicht verfuegbar. Bitte versuche es erneut.',
    'suchen.was.noResults': 'Noch nichts gefunden - aber wir wachsen!',
    'suchen.was.notFoundEncouragement': 'Vielleicht bald verfuegbar.',
    'suchen.was.providerCount': '{{count}} Restaurants',
    'suchen.was.selectedWhat': 'Was: {{item}}',
    'suchen.was.selectionLabel': 'AUSWAHL',
    'suchen.was.removeSelection': 'Auswahl entfernen',
    'suchen.was.ummah.browseServiceTypes': 'Dienste durchsuchen',
    'suchen.was.ummah.serviceTypeLabel': 'Dienst',
    'suchen.was.ummah.items.islamischeBildung': 'Islamische Bildung',
    'suchen.was.ummah.items.beratung': 'Beratung',
    'suchen.was.ummah.items.rechtshilfe': 'Rechtshilfe',
    'suchen.was.ummah.items.jugenddienste': 'Jugenddienste',
    'suchen.was.ummah.items.gesundheitsversorgung': 'Gesundheitsversorgung',
    'suchen.was.ummah.items.eheberatung': 'Eheberatung',
    'suchen.was.ummah.items.bestattungsdienste': 'Bestattungsdienste',
    'suchen.was.ummah.items.sozialeHilfe': 'Soziale Hilfe',
    'suchen.was.ummah.items.sprachkurse': 'Sprachkurse',
    'suchen.was.ummah.items.quranUnterricht': 'Quran-Unterricht',
    'suchen.filter.items.muslim.title': 'Inhaber ist Muslim',
    'suchen.filter.items.muslim.subtitle': 'Muslimischer Inhaber',
    'suchen.filter.items.spenden.title': 'Spendet fuer Gute Zwecke',
    'suchen.filter.items.spenden.subtitle': 'Spendet fuer Gute Zwecke',
    'suchen.filter.items.solidaritaet.title': 'Unterstuetzt Muslime',
    'suchen.filter.items.solidaritaet.subtitle': 'Solidaritaet mit der Ummah',
    'suchen.filter.items.parken.title': 'Bietet Parkmoeglichkeiten',
    'suchen.filter.items.parken.subtitle': 'Parkplaetze vorhanden',
    'suchen.filter.items.gebet.title': 'Bietet Gebetsmoeglichkeiten',
    'suchen.filter.items.gebet.subtitle': 'Gebetsraum vorhanden',
    'suchen.filter.ummahItems.kostenlos.title': 'Kostenlos',
    'suchen.filter.ummahItems.kostenlos.subtitle': 'Kostenfreies Angebot',
    'suchen.filter.ummahItems.online.title': 'Online verfügbar',
    'suchen.filter.ummahItems.online.subtitle': 'Fernberatung möglich',
    'suchen.filter.ummahItems.sprache.title': 'Mehrsprachig',
    'suchen.filter.ummahItems.sprache.subtitle': 'Arabisch, Türkisch, Urdu u.v.m.',
    'suchen.filter.ummahItems.zertifiziert.title': 'Zertifiziert',
    'suchen.filter.ummahItems.zertifiziert.subtitle': 'Anerkannte Qualifikation',
    'suchen.filter.ummahItems.geschlechtergetrennt.title': 'Geschlechtergetrennt',
    'suchen.filter.ummahItems.geschlechtergetrennt.subtitle': 'Separate Bereiche für Männer & Frauen',
    'common.loading': 'Loading',
    'location.unnamed': 'Unbenannt',
  };
  return map[key] ?? key;
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: mockRouterPush,
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
  SectionSelector: ({
    selectedSection,
    onSectionChange,
  }: {
    selectedSection: 'food' | 'ummah' | 'business';
    onSectionChange: (section: 'food' | 'ummah' | 'business') => void;
  }) => (
    <div>
      <p>SectionSelector: {selectedSection}</p>
      <button type="button" onClick={() => onSectionChange('food')}>Go Food</button>
      <button type="button" onClick={() => onSectionChange('ummah')}>Go Ummah</button>
      <button type="button" onClick={() => onSectionChange('business')}>Go Business</button>
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
    <button disabled={disabled} type="button" onClick={onClick}>{children}</button>
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
  Gift: () => <span>gift</span>,
  Globe: () => <span>globe</span>,
  Languages: () => <span>languages</span>,
  BadgeCheck: () => <span>badge-check</span>,
  Users: () => <span>users</span>,
  BriefcaseBusiness: () => <span>briefcase-business</span>,
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
    localStorage.removeItem('uflow:recent-was-searches');
    mockRouterPush.mockReset();
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

  it('[regression] includes selected filters in providers URL on search submit', async () => {
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i }));

    const input = screen.getByRole('searchbox', { name: 'Angebote suchen' });
    fireEvent.change(input, { target: { value: 'doe' } });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runOnlyPendingTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: /Select result for doe/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));

    expect(mockRouterPush).toHaveBeenCalledWith('/providers?section=food&q=Doener&filters=muslim');
  });

  it('[regression] excludes non-food recent items from food What section', async () => {
    localStorage.setItem(
      'uflow:recent-was-searches',
      JSON.stringify([
        { label: 'Burger', type: 'dish', dishName: 'Burger' },
        { label: 'Islamic Education', type: 'service-type', serviceTypeId: 'islamic-education' },
      ]),
    );

    render(<SearchPage />);

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.queryByText('Islamic Education')).not.toBeInTheDocument();
  });

  it('[regression] shows Wo? when no Wo city is selected', () => {
    render(<SearchPage />);

    expect(screen.getByRole('heading', { name: 'Wo?' })).toBeInTheDocument();
  });

  it('clears food WAS selection when switching from food to ummah section', async () => {
    render(<SearchPage />);

    const input = screen.getByRole('searchbox', { name: 'Angebote suchen' });
    fireEvent.change(input, { target: { value: 'doe' } });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runOnlyPendingTimersAsync();
    });

    fireEvent.click(screen.getByRole('button', { name: /Select result for doe/i }));
    expect(screen.getByText('Was: Doener')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go Ummah' }));

    expect(screen.queryByText('Was: Doener')).not.toBeInTheDocument();
    expect(screen.getByText('Was?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suchen' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Kostenlos/i })).toBeInTheDocument();
  });
});
