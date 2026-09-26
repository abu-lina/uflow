// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchPage from '@/app/(public)/search/page';

let mockSearchParams = new URLSearchParams('section=food');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, variables?: Record<string, string | number>) => {
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
        'suchen.citySearchPlaceholder': 'Stadt suchen',
      };
      return map[key] ?? key;
    },
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
  SectionSelector: () => null,
}));

vi.mock('@/features/search/components/EmptyCityCard', () => ({
  EmptyCityCard: () => null,
}));

vi.mock('@/features/search/components/WasMealResults', () => ({
  WasMealResults: () => null,
}));

vi.mock('@/features/search/components/WerAudienceFilter', () => ({
  WerAudienceFilter: () => null,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Heart: () => null,
  Search: () => null,
  MapPin: () => null,
  UtensilsCrossed: () => null,
  X: () => null,
  Moon: () => null,
  HandHeart: () => null,
  HeartHandshake: () => null,
  CircleParking: () => null,
  Check: () => null,
  Gift: () => null,
  Globe: () => null,
  Languages: () => null,
  BadgeCheck: () => null,
  LayoutGrid: () => null,
  Users: () => null,
  BriefcaseBusiness: () => null,
  ChevronDown: () => null,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  },
}));

vi.mock('@/services/providers', () => ({
  fetchProviderCities: vi.fn().mockResolvedValue([]),
  checkCityExists: vi.fn().mockResolvedValue(false),
  fetchAvailableFilters: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/offers', () => ({
  searchFoodConcepts: vi.fn().mockResolvedValue([]),
  searchFoodCategories: vi.fn().mockResolvedValue([]),
  searchFoodMenuItems: vi.fn().mockResolvedValue([]),
}));

describe('/search ?open=wo deep link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('opens the Wo accordion when the URL has open=wo', () => {
    mockSearchParams = new URLSearchParams('section=food&open=wo');
    render(<SearchPage />);
    expect(screen.getByRole('searchbox', { name: 'Stadt suchen' })).toBeInTheDocument();
  });

  it('keeps the Wo accordion closed without the open param', () => {
    mockSearchParams = new URLSearchParams('section=food');
    render(<SearchPage />);
    expect(screen.queryByRole('searchbox', { name: 'Stadt suchen' })).not.toBeInTheDocument();
  });
});
