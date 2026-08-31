import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { SearchBar } from '@/features/search/components/SearchBar';
import type { ComponentProps } from 'react';

// Mock the search service
vi.mock('@/services/souks', () => ({
  searchSouksAndZakat: vi.fn(() => Promise.resolve([])),
}));

// Mock the categories service
vi.mock('@/services/categories', () => ({
  fetchFilteredCategories: vi.fn(() => Promise.resolve([])),
  fetchUsedCategories: vi.fn(() => Promise.resolve([])),
}));

// Mock the providers service (cities fetch) to avoid hitting Supabase in tests
vi.mock('@/services/providers', () => ({
  fetchProviderCities: vi.fn(() => Promise.resolve([])),
  fetchFilteredCities: vi.fn(() => Promise.resolve([])),
}));

const renderSearchBar = (props: ComponentProps<typeof SearchBar> = {}) =>
  render(<SearchBar customCities={['Berlin']} {...props} />);

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render search input field', () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render search region with proper role', () => {
      renderSearchBar();

      // SearchBar uses role="search" on the container, not a search button
      const searchRegion = screen.getByRole('search');
      expect(searchRegion).toBeInTheDocument();
    });

    it('should render location filter button', () => {
      renderSearchBar();

      // Location filter is a button with aria-haspopup="listbox"
      const locationButtons = screen.getAllByRole('button');
      // At least one button should be the location dropdown
      expect(locationButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('[post-review fix] uses gap-1 in search icon/input row', () => {
      const { container } = renderSearchBar();
      const searchRow = container.querySelector('div.relative.flex.flex-1.flex-row.items-center.gap-1');
      expect(searchRow).toBeTruthy();
      expect(searchRow?.className).not.toContain('sm:gap-4');
    });
  });

  describe('Search Functionality', () => {
    it('should allow typing in search input', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchTerm = 'Bilal';

      fireEvent.change(searchInput, { target: { value: searchTerm } });

      expect(searchInput).toHaveValue(searchTerm);
    });

    it('should call onSearchSubmit callback on Enter key', async () => {
      const mockOnSearchSubmit = vi.fn();

      renderSearchBar({ onSearchSubmit: mockOnSearchSubmit });

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);

      // Type search term and press Enter
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // onSearchSubmit should be called with query, category, location
      await waitFor(() => {
        expect(mockOnSearchSubmit).toHaveBeenCalled();
        expect(mockOnSearchSubmit.mock.calls[0][0]).toBe('Bilal');
      });
    });

    it('should clear search when input is cleared', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);

      // Type search term
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      expect(searchInput).toHaveValue('Bilal');

      // Clear search term
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(searchInput).toHaveValue('');
    });

    it('should show clear button when search query has content', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);

      // Type search term
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });

      // Clear button should appear (aria-label uses common.delete translation)
      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /delete/i });
        expect(clearButton).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should have location dropdown button', () => {
      renderSearchBar();

      // Location, Wer, and Filter buttons exist with aria-haspopup
      const buttons = screen.getAllByRole('button');
      const dropdownButtons = buttons.filter((b) => b.getAttribute('aria-haspopup') === 'listbox');
      expect(dropdownButtons.length).toBe(3);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should be accessible on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchRegion = screen.getByRole('search');

      // Verify elements are present and accessible on mobile viewport
      expect(searchInput).toBeInTheDocument();
      expect(searchRegion).toBeInTheDocument();

      // Verify input is interactive (can type)
      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(searchInput).toHaveValue('test');
    });

    it('should handle mobile keyboard input correctly', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);

      // Simulate mobile keyboard input
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });

      // Verify input value
      expect(searchInput).toHaveValue('Bilal');

      // Simulate mobile search submission via Enter
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // Input should retain value
      await waitFor(() => {
        expect(searchInput).toHaveValue('Bilal');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty search gracefully', async () => {
      const mockOnSearchSubmit = vi.fn();

      renderSearchBar({ onSearchSubmit: mockOnSearchSubmit });

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);

      // Enter with empty input still triggers onSearchSubmit
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // The component calls handleSearch() which calls onSearchSubmit
      expect(mockOnSearchSubmit).toHaveBeenCalled();
    });

    it('should handle special characters in search', async () => {
      renderSearchBar();

      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);

      // Search with special characters
      const searchTerm = 'Bilal & Co.';
      fireEvent.change(searchInput, { target: { value: searchTerm } });

      // Input should accept special characters
      expect(searchInput).toHaveValue(searchTerm);
    });
  });
});
