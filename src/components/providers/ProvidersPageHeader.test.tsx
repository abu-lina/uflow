import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/providers',
  useSearchParams: () => new URLSearchParams('section=food&location=Berlin'),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sections.food': 'Food',
        'sections.ummah': 'Ummah',
        'sections.stores': 'Stores',
        'search.context.edit': 'Edit search',
        'search.context.allResults': 'All results',
      };
      return map[key] ?? key;
    },
  }),
}));

import { ProvidersPageHeader } from './ProvidersPageHeader';

describe('ProvidersPageHeader (Plan 109)', () => {
  it('renders search context and keeps section tabs outside header', () => {
    render(
      <ProvidersPageHeader
        categoryId="cat-1"
        location="Berlin"
        peopleSummary="2 Adults"
        searchTerm="Doner"
        section="food"
      />,
    );

    expect(screen.getByRole('searchbox')).toHaveValue('Doner');
    expect(screen.getByRole('combobox')).toHaveValue('Berlin');
    // Section tabs are now rendered in ProvidersContent (scrolls with page, not inside fixed header)
    expect(screen.queryByRole('tablist', { name: /browse sections/i })).not.toBeInTheDocument();
  });
});
