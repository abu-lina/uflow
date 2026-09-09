// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { SearchBar } from '@/features/search/components/SearchBar';
import * as providersModule from '@/services/providers';
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

// @/services/providers is mocked in test-utils.tsx (including fetchAvailableFilters).

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

    it('[post-review fix] uses gap-1 in search input row', () => {
      const { container } = renderSearchBar();
      const searchRow = container.querySelector('div.relative.flex.w-full.items-center.gap-1');
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

      // Location button exists with aria-haspopup (Wer removed; Filter hidden when no data)
      const buttons = screen.getAllByRole('button');
      const dropdownButtons = buttons.filter((b) => b.getAttribute('aria-haspopup') === 'listbox');
      expect(dropdownButtons.length).toBeGreaterThanOrEqual(1);
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

  describe('Filter Dropdown with Counts', () => {
    const mockFilters = [
      { key: 'muslim', count: 5 },
      { key: 'parken', count: 0 },
    ];

    it('only shows filters with count > 0 in the dropdown', async () => {
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve(mockFilters) as ReturnType<typeof providersModule.fetchAvailableFilters>,
      );

      const { container } = renderSearchBar();

      // Wait for the filter chip to appear
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      // Open the filter dropdown
      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      // The dropdown shows the count-5 item but NOT the count-0 item
      await waitFor(() => {
        expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
        expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument();
      });
    });

    it('hides the filter chip entirely when all filters have count 0', async () => {
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve([
            { key: 'muslim', count: 0 },
            { key: 'parken', count: 0 },
          ]) as ReturnType<typeof providersModule.fetchAvailableFilters>,
      );

      const { container } = renderSearchBar();

      // Wait for filters to load, then verify only the location chip exists
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        // Only the location dropdown; no filter chip
        expect(haspopupButtons.length).toBe(1);
      });
    });

    it('shows no disabled items in the dropdown (all visible items are clickable)', async () => {
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve([
            { key: 'muslim', count: 3 },
            { key: 'parken', count: 0 },
            { key: 'gebet', count: 2 },
          ]) as ReturnType<typeof providersModule.fetchAvailableFilters>,
      );

      const { container } = renderSearchBar();

      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      await waitFor(() => {
        // Get dropdown buttons (inside the dropdown container)
        const dropdown = container.querySelector('.dropdown-container') as HTMLElement;
        expect(dropdown).toBeTruthy();
        const dropdownButtons = dropdown.querySelectorAll('button');
        // All dropdown items should be enabled (none disabled)
        dropdownButtons.forEach((btn) => {
          expect(btn).not.toBeDisabled();
        });
        // Should have exactly 2 items (muslim + gebet), not 3
        expect(dropdownButtons.length).toBe(2);
      });
    });
  });

  describe('Clear Filters', () => {
    const filtersWithData = [
      { key: 'muslim', count: 5 },
      { key: 'gebet', count: 3 },
    ];

    it('shows an X button on the filter chip when filters are selected', async () => {
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve(filtersWithData) as ReturnType<
            typeof providersModule.fetchAvailableFilters
          >,
      );

      const { container } = renderSearchBar();

      // Wait for the filter chip
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      // Open dropdown and select a filter
      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
      });

      // Click the muslim filter item
      const allButtons = screen.getAllByRole('button');
      const muslimButton = allButtons.find((b) => b.textContent?.includes('(5)'));
      expect(muslimButton).toBeTruthy();
      fireEvent.click(muslimButton as HTMLElement);

      // The filter chip should now show a clear (X) button
      // The X button has aria-label matching the clearAll translation, same as the
      // dropdown "Clear all" button. Use getAllByRole and pick the one with the X icon.
      await waitFor(() => {
        const clearBtns = screen.getAllByRole('button', { name: /clear all/i });
        expect(clearBtns.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('clears all filters when the X button on the chip is clicked', async () => {
      const mockOnSearchSubmit = vi.fn();
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve(filtersWithData) as ReturnType<
            typeof providersModule.fetchAvailableFilters
          >,
      );

      const { container } = renderSearchBar({ onSearchSubmit: mockOnSearchSubmit });

      // Wait for filter chip
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      // Open dropdown and select a filter
      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const muslimButton = allButtons.find((b) => b.textContent?.includes('(5)'));
      expect(muslimButton).toBeTruthy();
      fireEvent.click(muslimButton as HTMLElement);

      // Click the clear X button on the chip (first "Clear all" button is the X on the chip)
      await waitFor(() => {
        const clearBtns = screen.getAllByRole('button', { name: /clear all/i });
        fireEvent.click(clearBtns[0]);
      });

      // onSearchSubmit should have been called with empty array (explicit clear signal)
      await waitFor(() => {
        const lastCall = mockOnSearchSubmit.mock.calls[mockOnSearchSubmit.mock.calls.length - 1];
        // Third arg should be [] (explicitly cleared), not undefined
        expect(lastCall[2]).toEqual([]);
      });
    });

    it('shows "Clear all" button in dropdown when filters are selected', async () => {
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve(filtersWithData) as ReturnType<
            typeof providersModule.fetchAvailableFilters
          >,
      );

      const { container } = renderSearchBar();

      // Wait for the filter chip
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      // Open dropdown and select a filter
      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
      });

      // Select a filter (dropdown stays open after selection)
      const allButtons = screen.getAllByRole('button');
      const muslimButton = allButtons.find((b) => b.textContent?.includes('(5)'));
      expect(muslimButton).toBeTruthy();
      fireEvent.click(muslimButton as HTMLElement);

      // "Clear all" button should appear in the dropdown (which is still open)
      await waitFor(() => {
        expect(screen.getByText(/clear all/i)).toBeInTheDocument();
      });
    });

    it('does not show "Clear all" when no filters are selected', async () => {
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve(filtersWithData) as ReturnType<
            typeof providersModule.fetchAvailableFilters
          >,
      );

      const { container } = renderSearchBar();

      // Wait for the filter chip
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      // Open dropdown without selecting any filter
      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
      });

      // "Clear all" should NOT be shown
      expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument();
    });

    it('clears all filters and closes dropdown when "Clear all" is clicked', async () => {
      const mockOnSearchSubmit = vi.fn();
      vi.spyOn(providersModule, 'fetchAvailableFilters').mockImplementation(
        () =>
          Promise.resolve(filtersWithData) as ReturnType<
            typeof providersModule.fetchAvailableFilters
          >,
      );

      const { container } = renderSearchBar({ onSearchSubmit: mockOnSearchSubmit });

      // Wait for filter chip
      await waitFor(() => {
        const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
        expect(haspopupButtons.length).toBe(2);
      });

      // Open dropdown and select a filter
      const haspopupButtons = container.querySelectorAll('button[aria-haspopup="listbox"]');
      fireEvent.click(haspopupButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const muslimButton = allButtons.find((b) => b.textContent?.includes('(5)'));
      expect(muslimButton).toBeTruthy();
      fireEvent.click(muslimButton as HTMLElement);

      // Click "Clear all" (dropdown is still open after selecting a filter)
      await waitFor(() => {
        const clearAllBtn = screen.getByText(/clear all/i);
        fireEvent.click(clearAllBtn);
      });

      // Dropdown should be closed (no dropdown-container visible)
      await waitFor(() => {
        const dropdown = container.querySelector('.dropdown-container');
        // The filter dropdown should be gone (closed)
        // Note: the location dropdown may exist but is not open by default
        expect(dropdown).toBeFalsy();
      });

      // onSearchSubmit called with empty array (explicit clear signal)
      const lastCall = mockOnSearchSubmit.mock.calls[mockOnSearchSubmit.mock.calls.length - 1];
      expect(lastCall[2]).toEqual([]);
    });
  });
});
