// @vitest-environment jsdom
/**
 * Plan 235: SearchBar adminSlot support
 *
 * Verifies that SearchBar renders the adminSlot inside its desktop chip row
 * when provided, and omits it when not provided.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { SearchBar } from '@/features/search/components/SearchBar';

vi.mock('@/services/souks', () => ({
  searchSouksAndZakat: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/categories', () => ({
  fetchFilteredCategories: vi.fn(() => Promise.resolve([])),
  fetchUsedCategories: vi.fn(() => Promise.resolve([])),
}));

describe('SearchBar adminSlot (Plan 235)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders adminSlot content in the desktop chip row when provided', () => {
    render(
      <SearchBar
        adminSlot={<div data-testid="admin-filter-slot">Admin Filters Here</div>}
        customCities={['Berlin']}
      />,
    );

    expect(screen.getByTestId('admin-filter-slot')).toBeInTheDocument();
    expect(screen.getByText('Admin Filters Here')).toBeInTheDocument();
  });

  it('does not render adminSlot content when not provided', () => {
    render(<SearchBar customCities={['Berlin']} />);

    expect(screen.queryByTestId('admin-filter-slot')).not.toBeInTheDocument();
  });
});
