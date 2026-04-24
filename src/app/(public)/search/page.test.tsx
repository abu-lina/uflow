import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('section=food'),
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
      if (key === 'suchen.accordions.was') {
        return 'Was';
      }
      if (key === 'suchen.accordions.wer') {
        return 'Wer';
      }
      if (key === 'suchen.accordions.filter') {
        return 'Filter';
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
  SectionSelector: () => <div>Section selector</div>,
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
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/features/search/components/EmptyCityCard', () => ({
  EmptyCityCard: ({ cityName }: { cityName: string }) => <div>Empty city: {cityName}</div>,
}));

describe('Search page Wo defaults and selection behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses onboarding selectedCity as active Wo selection without requiring typing', async () => {
    localStorage.setItem('selectedCity', 'Berlin');

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wo · Berlin' })).toBeInTheDocument();
    });

    // Selection should be visible immediately, matching Was UX (no typing needed).
    expect(screen.getByLabelText('Search city')).toHaveValue('');
    expect(screen.getByText('AUSWAHL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auswahl entfernen' })).toBeInTheDocument();
  });

  it('closes Wo city options after selecting a city and shows selection clear action', async () => {
    render(<SearchPage />);

    const cityInput = screen.getByLabelText('Search city');
    fireEvent.change(cityInput, { target: { value: 'ber' } });

    const berlinOption = await screen.findByRole('button', { name: /Berlin - 10 Anbieter/i });
    fireEvent.click(berlinOption);

    expect(screen.getByLabelText('Search city')).toHaveValue('');
    expect(screen.getByText('AUSWAHL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auswahl entfernen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wo · Berlin' })).toBeInTheDocument();
  });

  it('clear all resets Wo selected state and header', async () => {
    localStorage.setItem('selectedCity', 'Berlin');

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Wo · Berlin' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByLabelText('Search city')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Wo' })).toBeInTheDocument();
    expect(screen.queryByText('AUSWAHL')).not.toBeInTheDocument();
  });
});
