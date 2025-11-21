import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { SearchBar } from '@/features/search/components/SearchBar';
// import { mockSearchContext } from '../mocks/soukData'; // Unused for now

// Mock the search service
vi.mock('@/services/souks', () => ({
  searchSouksAndZakat: vi.fn(() => Promise.resolve([])),
}));

// Mock the categories service
vi.mock('@/services/categories', () => ({
  fetchFilteredCategories: vi.fn(() => Promise.resolve([])),
}));

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render search input field', () => {
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<SearchBar />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should render location filter', () => {
      render(<SearchBar />);
      
      const locationFilter = screen.getByText(/everywhere/i);
      expect(locationFilter).toBeInTheDocument();
    });

    it('should render category filter', () => {
      render(<SearchBar />);
      
      const categoryFilter = screen.getByText(/all/i);
      expect(categoryFilter).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should allow typing in search input', async () => {
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchTerm = 'Bilal';
      
      fireEvent.change(searchInput, { target: { value: searchTerm } });
      
      expect(searchInput).toHaveValue(searchTerm);
    });

    it('should search for "Bilal" and show results', async () => {
      const mockSetSearchQuery = vi.fn();
      const mockSetSelectedCategory = vi.fn();
      const mockSetSelectedLocation = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSearchQuery: mockSetSearchQuery,
            setSelectedCategory: mockSetSelectedCategory,
            setSelectedLocation: mockSetSelectedLocation,
          }
        }
      );
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Type search term
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      
      // Click search button
      fireEvent.click(searchButton);
      
      // Wait for search to complete
      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith('Bilal');
      });
    });

    it('should handle search with Enter key', async () => {
      const mockSetSearchQuery = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSearchQuery: mockSetSearchQuery,
          }
        }
      );
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      
      // Type search term and press Enter
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
      
      // Wait for search to complete
      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith('Bilal');
      });
    });

    it('should clear search when input is cleared', async () => {
      const mockSetSearchQuery = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSearchQuery: mockSetSearchQuery,
          }
        }
      );
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      
      // Type search term
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      expect(searchInput).toHaveValue('Bilal');
      
      // Clear search term
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Filter Functionality', () => {
    it('should open category dropdown when clicked', async () => {
      render(<SearchBar />);
      
      const categoryFilter = screen.getByText(/all/i);
      fireEvent.click(categoryFilter);
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText(/moschee/i)).toBeInTheDocument();
      });
    });

    it('should open location dropdown when clicked', async () => {
      render(<SearchBar />);
      
      const locationFilter = screen.getByText(/everywhere/i);
      fireEvent.click(locationFilter);
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText(/berlin/i)).toBeInTheDocument();
      });
    });

    it('should filter by category when selected', async () => {
      const mockSetSelectedCategory = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSelectedCategory: mockSetSelectedCategory,
          }
        }
      );
      
      const categoryFilter = screen.getByText(/all/i);
      fireEvent.click(categoryFilter);
      
      // Wait for dropdown and select Mosque category
      await waitFor(() => {
        const mosqueOption = screen.getByText(/moschee/i);
        fireEvent.click(mosqueOption);
      });
      
      expect(mockSetSelectedCategory).toHaveBeenCalledWith('Mosque');
    });

    it('should filter by location when selected', async () => {
      const mockSetSelectedLocation = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSelectedLocation: mockSetSelectedLocation,
          }
        }
      );
      
      const locationFilter = screen.getByText(/everywhere/i);
      fireEvent.click(locationFilter);
      
      // Wait for dropdown and select Berlin location
      await waitFor(() => {
        const berlinOption = screen.getByText(/berlin/i);
        fireEvent.click(berlinOption);
      });
      
      expect(mockSetSelectedLocation).toHaveBeenCalledWith('Berlin');
    });
  });

  describe('Search Results Integration', () => {
    it('should navigate to souks page with search parameters', async () => {
      const mockPush = vi.fn();
      
      // Mock useRouter
      vi.doMock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
        }),
      }));
      
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Type search term and search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for navigation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/souks?q=Bilal');
      });
    });

    it('should combine search query with category filter', async () => {
      const mockPush = vi.fn();
      
      vi.doMock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
        }),
      }));
      
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const categoryFilter = screen.getByText(/all/i);
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Set category filter
      fireEvent.click(categoryFilter);
      await waitFor(() => {
        const mosqueOption = screen.getByText(/moschee/i);
        fireEvent.click(mosqueOption);
      });
      
      // Type search term and search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for navigation with combined parameters
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/souks?q=Bilal&category=Mosque');
      });
    });

    it('should combine search query with location filter', async () => {
      const mockPush = vi.fn();
      
      vi.doMock('next/navigation', () => ({
        useRouter: () => ({
          push: mockPush,
        }),
      }));
      
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const locationFilter = screen.getByText(/everywhere/i);
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Set location filter
      fireEvent.click(locationFilter);
      await waitFor(() => {
        const berlinOption = screen.getByText(/berlin/i);
        fireEvent.click(berlinOption);
      });
      
      // Type search term and search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for navigation with combined parameters
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/souks?q=Bilal&location=Berlin');
      });
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
      
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Verify elements are present and accessible
      expect(searchInput).toBeInTheDocument();
      expect(searchButton).toBeInTheDocument();
      
      // Test touch interaction simulation
      fireEvent.touchStart(searchInput);
      fireEvent.touchEnd(searchInput);
      
      expect(searchInput).toHaveFocus();
    });

    it('should handle mobile keyboard input correctly', async () => {
      render(<SearchBar />);
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      
      // Simulate mobile keyboard input
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      
      // Verify input value
      expect(searchInput).toHaveValue('Bilal');
      
      // Simulate mobile search submission
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
      
      // Wait for search to complete
      await waitFor(() => {
        expect(searchInput).toHaveValue('Bilal');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty search gracefully', async () => {
      const mockSetSearchQuery = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSearchQuery: mockSetSearchQuery,
          }
        }
      );
      
      // const searchInput = screen.getByPlaceholderText(/search in your ummah/i); // Not used in this test
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Try to search with empty input
      fireEvent.click(searchButton);
      
      // Should not call setSearchQuery with empty value
      expect(mockSetSearchQuery).not.toHaveBeenCalledWith('');
    });

    it('should handle special characters in search', async () => {
      const mockSetSearchQuery = vi.fn();
      
      render(
        <SearchBar />,
        {
          searchContext: {
            setSearchQuery: mockSetSearchQuery,
          }
        }
      );
      
      const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
      const searchButton = screen.getByRole('button', { name: /search in your ummah/i });
      
      // Search with special characters
      const searchTerm = 'Bilal & Co.';
      fireEvent.change(searchInput, { target: { value: searchTerm } });
      fireEvent.click(searchButton);
      
      // Wait for search to complete
      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith(searchTerm);
      });
    });
  });
});
