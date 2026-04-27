import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sections.food': 'Food',
        'sections.ummah': 'Ummah',
        'sections.stores': 'Stores',
        'search.everywhere': 'Everywhere',
        'search.context.edit': 'Edit search',
        'search.context.allResults': 'All results',
      };
      return map[key] ?? key;
    },
  }),
}));

import { ProvidersPageHeader } from './ProvidersPageHeader';

describe('ProvidersPageHeader (Plan 109)', () => {
  it('renders search context and does not render section tab row', () => {
    render(
      <ProvidersPageHeader
        categoryId="cat-1"
        location="Berlin"
        peopleSummary="2 Adults"
        searchTerm="Doner"
        section="food"
      />,
    );

    expect(screen.getByText('Doner')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: /browse sections/i })).not.toBeInTheDocument();
  });
});
