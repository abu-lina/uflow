import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPage from './page';

let mockSection: 'food' | 'ummah' | 'business' = 'food';
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(`section=${mockSection}`),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'suchen.cityNotRecognized') {
        return `City not recognized: ${String(params?.city ?? '')}`;
      }
      if (key === 'suchen.accordions.wo') {
        return 'Wo';
      }
      if (key === 'suchen.accordions.woEmpty') {
        return 'Wo?';
      }
      if (key === 'suchen.accordions.was') {
        return 'Was';
      }
      if (key === 'suchen.was.searchPlaceholder') {
        return 'Angebote suchen';
      }
      if (key === 'suchen.was.ummah.searchPlaceholder') {
        return 'Welchen Dienst suchst du?';
      }
      if (key === 'suchen.accordions.wer') {
        return 'Wer';
      }
      if (key === 'suchen.accordions.filter') {
        return 'Values & Amenities';
      }
      if (key === 'suchen.citySearchPlaceholder') {
        return 'Search city';
      }
      if (key === 'suchen.searchCityPrompt') {
        return 'Search for a city';
      }
      if (key === 'suchen.clearAll') {
        return 'Clear all';
      }
      if (key === 'suchen.wo.loading') {
        return 'Searching...';
      }
      if (key === 'suchen.wo.searchError') {
        return 'Search unavailable';
      }
      if (key === 'suchen.wo.providerCount') {
        return `${params?.count ?? 0} Anbieter`;
      }
      if (key === 'suchen.wo.popularLabel') {
        return 'BELIEBT';
      }
      if (key === 'suchen.wo.recentLabel') {
        return 'ZULETZT GESUCHT';
      }
      if (key === 'suchen.wo.selectionLabel') {
        return 'AUSWAHL';
      }
      if (key === 'suchen.wo.removeSelection') {
        return 'Auswahl entfernen';
      }
      if (key === 'suchen.wo.noResults') {
        return 'Keine Staedte gefunden';
      }
      if (key === 'suchen.searchButton') {
        return 'Search';
      }
      if (key === 'suchen.nearMe.chipLabel') {
        return 'In der Nähe';
      }
      if (key === 'suchen.nearMe.radiusLabel') {
        return 'Radius:';
      }
      if (key === 'suchen.nearMe.permissionDenied') {
        return 'Standort nicht verfügbar';
      }
      if (key === 'suchen.openNow.chipLabel') {
        return 'Jetzt geöffnet';
      }
      if (key === 'suchen.wer.forMe') {
        return 'For me';
      }
      if (key === 'suchen.wer.subtitle') {
        return 'Passende Angebote anzeigen';
      }
      if (key === 'suchen.wer.maennerLabel') {
        return 'Männer';
      }
      if (key === 'suchen.wer.frauenLabel') {
        return 'Frauen';
      }
      if (key === 'suchen.wer.kinderLabel') {
        return 'Kinder';
      }
      if (key === 'suchen.wer.decrementAriaLabel') {
        return `${String(params?.audience ?? '')} verringern`;
      }
      if (key === 'suchen.wer.incrementAriaLabel') {
        return `${String(params?.audience ?? '')} erhöhen`;
      }
      if (key === 'suchen.filter.items.muslim.title') {
        return 'Inhaber ist Muslim';
      }
      if (key === 'suchen.filter.items.muslim.subtitle') {
        return 'Muslimischer Inhaber';
      }
      if (key === 'suchen.filter.items.spenden.title') {
        return 'Spendet fuer Gute Zwecke';
      }
      if (key === 'suchen.filter.items.spenden.subtitle') {
        return 'Spendet fuer Gute Zwecke';
      }
      if (key === 'suchen.filter.items.solidaritaet.title') {
        return 'Unterstuetzt Muslime';
      }
      if (key === 'suchen.filter.items.solidaritaet.subtitle') {
        return 'Solidaritaet mit der Ummah';
      }
      if (key === 'suchen.filter.items.parken.title') {
        return 'Bietet Parkmoeglichkeiten';
      }
      if (key === 'suchen.filter.items.parken.subtitle') {
        return 'Parkplaetze vorhanden';
      }
      if (key === 'suchen.filter.items.gebet.title') {
        return 'Bietet Gebetsmoeglichkeiten';
      }
      if (key === 'suchen.filter.items.gebet.subtitle') {
        return 'Gebetsraum vorhanden';
      }
      if (key === 'suchen.title') {
        return 'Search Page';
      }
      if (key === 'common.loading') {
        return 'Loading';
      }
      return key;
    },
  }),
}));

vi.mock('@/services/providers', () => ({
  fetchProviderCities: vi.fn(async () => ['Berlin', 'Frankfurt', 'Stuttgart']),
  fetchPopularCities: vi.fn(async () => [
    { city: 'Berlin', provider_count: 10 },
    { city: 'Frankfurt', provider_count: 6 },
    { city: 'Stuttgart', provider_count: 4 },
  ]),
  checkCityExists: vi.fn(async () => true),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
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
  ExpandSection: ({
    title,
    children,
    isOpen,
    onToggle,
  }: {
    title: string;
    children: React.ReactNode;
    isOpen?: boolean;
    onToggle?: (next: boolean) => void;
  }) => (
    <section>
      <button type="button" onClick={() => onToggle?.(!isOpen)}>
        <h3>{title}</h3>
      </button>
      {isOpen ? <div>{children}</div> : null}
    </section>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/features/search/components/EmptyCityCard', () => ({
  EmptyCityCard: ({ cityName }: { cityName: string }) => <div>Empty city: {cityName}</div>,
}));

describe('Search page Wo defaults and selection behavior', () => {
  const openWoAccordion = () => {
    const woHeading = screen.getByRole('heading', { name: /^Wo/ });
    const woToggle = woHeading.closest('button');

    if (!woToggle) {
      throw new Error('Wo accordion toggle button not found');
    }

    fireEvent.click(woToggle);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSection = 'food';
    localStorage.clear();
    sessionStorage.clear();
  });

  it('[pre-fix FAILS] shows filter controls on mobile food section', () => {
    render(<SearchPage />);

    expect(screen.getByRole('heading', { name: 'Values & Amenities' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('shows Wer accordion when inactive section resolves to food', async () => {
    mockSection = 'business';

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Wer: For me' })).toBeInTheDocument();
    });
  });

  it('keeps Wer accordion open when switching from food to inactive section', async () => {
    const { rerender } = render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Wer: For me' }));
    expect(screen.getByRole('button', { name: 'Männer erhöhen' })).toBeInTheDocument();

    mockSection = 'business';
    rerender(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Wer: For me' })).toBeInTheDocument();
    });
  });

  it('uses onboarding selectedCity as active Wo selection without requiring typing', async () => {
    localStorage.setItem('selectedCity', 'Berlin');

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wo: Berlin' })).toBeInTheDocument();
    });

    openWoAccordion();
    await screen.findByLabelText('Search city');

    // Selection should be visible immediately, matching Was UX (no typing needed).
    expect(screen.getByLabelText('Search city')).toHaveValue('');
    expect(screen.getByText('AUSWAHL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auswahl entfernen' })).toBeInTheDocument();
  });

  it('closes Wo city options after selecting a city and shows selection clear action', async () => {
    localStorage.setItem('selectedCity', 'Berlin');
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wo: Berlin' })).toBeInTheDocument();
    });

    openWoAccordion();
    expect(screen.getByText('AUSWAHL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auswahl entfernen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wo: Berlin' })).toBeInTheDocument();
  });

  it('clear all resets Wo selected state and header', async () => {
    localStorage.setItem('selectedCity', 'Berlin');

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wo: Berlin' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Wo: Berlin' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByRole('heading', { name: 'Wo?' })).toBeInTheDocument();
    expect(screen.queryByText('AUSWAHL')).not.toBeInTheDocument();
  });

  it('clear all resets Wer title and counters to default', async () => {
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Wer: For me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Frauen erhöhen' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Wer: Männer, Frauen' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByRole('button', { name: 'Wer: For me' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wer: For me' }));
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('keeps only one accordion open at a time', () => {
    localStorage.removeItem('selectedCity');
    render(<SearchPage />);

    expect(screen.getByLabelText('Angebote suchen')).toBeInTheDocument();

    openWoAccordion();
    expect(screen.getByLabelText('Search city')).toBeInTheDocument();
    expect(screen.queryByLabelText('Angebote suchen')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wer: For me' }));
    expect(screen.getByRole('button', { name: 'Männer erhöhen' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Search city')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Values & Amenities' }));
    expect(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Männer erhöhen' })).not.toBeInTheDocument();

    openWoAccordion();
    expect(screen.getByLabelText('Search city')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Inhaber ist Muslim/i })).not.toBeInTheDocument();
  });

  it('shows filter count in title and clears it with clear all', async () => {
    render(<SearchPage />);

    expect(screen.getByRole('heading', { name: 'Values & Amenities' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Values & Amenities' }));

    fireEvent.click(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i }));

    expect(screen.getByRole('heading', { name: 'Values & Amenities: 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByRole('heading', { name: 'Values & Amenities' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Values & Amenities: 1' })).not.toBeInTheDocument();
  });

  it('[Plan 196 — corrected placement] does not render the near-me/open-now chip row on the filter page', () => {
    render(<SearchPage />);

    expect(screen.queryByRole('button', { name: /In der Nähe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Jetzt geöffnet/i })).not.toBeInTheDocument();
  });
});
