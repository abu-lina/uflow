import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchContextBar } from './SearchContextBar';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/providers',
  useSearchParams: () => new URLSearchParams('section=food&location=Berlin'),
  useRouter: () => ({
    push: mockPush,
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
        'search.context.backToHome': 'Back to home',
        'search.ariaLabel': 'Search in the Ummah',
        'suchen.accordions.woEmpty': 'Where?',
        'suchen.clearAll': 'Clear all',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('SearchContextBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input value and people summary without location field', () => {
    render(
      <SearchContextBar
        peopleSummary="2 Adults"
        searchTerm="Doner"
        section="food"
      />,
    );

    expect(screen.getByRole('searchbox')).toHaveValue('Doner');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('2 Adults')).toBeInTheDocument();
  });

  it('hides people summary segment when no people summary is provided', () => {
    render(
      <SearchContextBar
        searchTerm="Doner"
        section="food"
      />,
    );

    expect(screen.getByRole('searchbox')).toHaveValue('Doner');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('2 Adults')).not.toBeInTheDocument();
  });

  it('falls back to section label when category id exists without q', () => {
    render(
      <SearchContextBar
        categoryId="8204a370-26fb-4c8d-8183-2e5550a09dcb"
        section="food"
      />,
    );

    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Food');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('prefers selected category label over section label when category is selected without q', () => {
    render(
      <SearchContextBar
        categoryId="a8d3cf09-b606-4de9-8744-b8c584c5e172"
        categoryLabel="Halal Restaurants"
        section="food"
      />,
    );

    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Halal Restaurants');
  });

  it('updates q param on Enter when user edits search term', () => {
    render(
      <SearchContextBar
        searchTerm="Doner"
        section="food"
      />,
    );

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Indigo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith('/providers?section=food&location=Berlin&q=Indigo');
  });

  it('clears q param via x button to show all results', () => {
    render(
      <SearchContextBar
        searchTerm="Indigo"
        section="food"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(mockPush).toHaveBeenCalledWith('/providers?section=food&location=Berlin');
  });

  it('does not render any location field in the providers search context bar', () => {
    render(
      <SearchContextBar
        searchTerm="Indigo"
        section="food"
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Everywhere' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Überall' })).not.toBeInTheDocument();
  });

  it('navigates back to /search with section when edit button is clicked', () => {
    render(
      <SearchContextBar
        searchTerm="Doner"
        section="ummah"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit search' }));

    expect(mockPush).toHaveBeenCalledWith('/search?section=ummah');
  });

  it('navigates back to home when the left icon button is clicked', () => {
    render(
      <SearchContextBar
        searchTerm="Doner"
        section="food"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
