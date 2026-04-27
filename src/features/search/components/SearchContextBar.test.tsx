import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchContextBar } from './SearchContextBar';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'search.everywhere': 'Everywhere',
        'sections.food': 'Food',
        'sections.ummah': 'Ummah',
        'sections.stores': 'Stores',
        'search.context.edit': 'Edit search',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('SearchContextBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search term, location, and people summary', () => {
    render(
      <SearchContextBar
        location="Berlin"
        peopleSummary="2 Adults"
        searchTerm="Doner"
        section="food"
      />,
    );

    expect(screen.getByText('Doner')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('2 Adults')).toBeInTheDocument();
    expect(screen.getAllByText('•')).toHaveLength(2);
  });

  it('hides people summary segment when no people summary is provided', () => {
    render(
      <SearchContextBar
        location="Berlin"
        searchTerm="Doner"
        section="food"
      />,
    );

    expect(screen.getByText('Doner')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.queryByText('2 Adults')).not.toBeInTheDocument();
    expect(screen.getAllByText('•')).toHaveLength(1);
  });

  it('falls back to section label when category id exists without q', () => {
    render(
      <SearchContextBar
        categoryId="8204a370-26fb-4c8d-8183-2e5550a09dcb"
        location=""
        section="food"
      />,
    );

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Everywhere')).toBeInTheDocument();
  });

  it('navigates back to /search with section when edit button is clicked', () => {
    render(
      <SearchContextBar
        location="Berlin"
        searchTerm="Doner"
        section="ummah"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }));

    expect(mockPush).toHaveBeenCalledWith('/search?section=ummah');
  });
});
