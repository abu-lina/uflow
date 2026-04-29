import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import CitySelectionPage from './page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'berlin-id',
        city_name: 'Berlin',
        country: 'Germany',
        is_unlocked: true,
        provider_count: 10,
        interest_count: 2,
      },
      {
        id: 'frankfurt-id',
        city_name: 'Frankfurt',
        country: 'Germany',
        is_unlocked: true,
        provider_count: 8,
        interest_count: 2,
      },
      {
        id: 'stuttgart-id',
        city_name: 'Stuttgart',
        country: 'Germany',
        is_unlocked: true,
        provider_count: 6,
        interest_count: 2,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      if (key === 'waitlist.citySelection.title') return 'Your City';
      if (key === 'waitlist.citySelection.subtitle') {
        return 'Choose a city to discover Muslim providers in your area.';
      }
      if (key === 'waitlist.citySelection.searchPlaceholder') return 'Search other city ...';
      if (key === 'waitlist.citySelection.searchButton') return 'Search other city ...';
      if (key === 'waitlist.citySelection.discoverButton') return 'Show city';
      if (key === 'waitlist.citySelection.providerCount_other') return '{{count}} providers';
      if (key === 'common.loading') return 'Loading';
      if (key === 'common.delete') return 'Delete';
      if (key === 'common.error') return 'Error';
      return key;
    },
  }),
}));

vi.mock('@/utils/addressValidation', () => ({
  normalizeCountryNameForDisplay: (country: string) => country,
}));

vi.mock('@/lib/utils/onboarding-state', () => ({
  getOnboardingState: () => ({ earlyAccessUnlocked: true }),
  setOnboardingState: vi.fn(),
}));

describe('CitySelectionPage redirect behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('[post-fix PASSES] routes to / after selecting city and pressing CTA', () => {
    render(<CitySelectionPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Berlin, 10 providers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show city' }));

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
