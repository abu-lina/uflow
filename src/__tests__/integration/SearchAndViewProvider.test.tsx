import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';
import { mockBilalSearchResults } from '../mocks/providerData';
import type { Provider } from '@/services/providers';
// import { mockProviders } from '../mocks/providerData'; // Unused for now

// Mock the search service to return specific results
vi.mock('@/services/providers', () => ({
  searchProvidersAndZakat: vi.fn((query: string) => {
    if (query.toLowerCase().includes('bilal')) {
      return Promise.resolve(mockBilalSearchResults);
    }
    return Promise.resolve([]);
  }),
  getBookmarkedProviders: vi.fn(() => Promise.resolve([])),
}));

// Mock the categories service
vi.mock('@/services/categories', () => ({
  fetchFilteredCategories: vi.fn(() => Promise.resolve([])),
}));

// Mock the zakat projects service
vi.mock('@/services/communityServices', () => ({
  getCommunityServicesForProvider: vi.fn(() => Promise.resolve([])),
}));

describe('Complete User Journey: Search and View Provider', () => {
  // Helper function to safely click elements
  const safeClick = (element: Element | null) => {
    expect(element).toBeTruthy();
    fireEvent.click(element as HTMLElement);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Phase 1: Open App and Navigate to Search', () => {
    it('should render the main providers page with search functionality', () => {
      render(<ProvidersContent />);
      
      // Verify search bar is present
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      expect(searchInput).toBeInTheDocument();
      
      // Verify search button is present
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      expect(searchButton).toBeInTheDocument();
      
      // Verify category filter is present
      const categoryFilter = screen.getByText(/alle kategorien/i);
      expect(categoryFilter).toBeInTheDocument();
      
      // Verify location filter is present
      const locationFilter = screen.getByText(/überall/i);
      expect(locationFilter).toBeInTheDocument();
    });

    it('should allow typing in search input on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      
      // Test mobile keyboard input
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      
      // Verify input value
      expect(searchInput).toHaveValue('Bilal');
      
      // Test touch interaction simulation
      fireEvent.touchStart(searchInput);
      fireEvent.touchEnd(searchInput);
      
      expect(searchInput).toHaveFocus();
    });
  });

  describe('Phase 2: Search for "Bilal"', () => {
    it('should search for "Bilal" and show results', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Type search term
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      expect(searchInput).toHaveValue('Bilal');
      
      // Click search button
      fireEvent.click(searchButton);
      
      // Wait for search results to appear
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
    });

    it('should search for "Bilal" using Enter key', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      
      // Type search term and press Enter
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
      
      // Wait for search results to appear
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
    });

    it('should show "Bilal Moschee" in search results', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for and verify specific result
      await waitFor(() => {
        const bilalMoschee = screen.getByText('Bilal Moschee');
        expect(bilalMoschee).toBeInTheDocument();
        
        // Verify it's a clickable result
        const providerCard = bilalMoschee.closest('[role="button"]');
        expect(providerCard).toBeInTheDocument();
      });
    });

    it('should display correct provider information in search results', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for results and verify details
      await waitFor(() => {
        // Verify provider name
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
        
        // Verify category
        expect(screen.getByText('Mosque')).toBeInTheDocument();
        
        // Verify location
        expect(screen.getByText('Berlin')).toBeInTheDocument();
        
        // Verify description
        expect(screen.getByText(/Beautiful mosque in the heart of the city/)).toBeInTheDocument();
      });
    });
  });

  describe('Phase 3: Click on "Bilal Moschee" Provider', () => {
    it('should open provider detail modal when clicking on result', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      // Click on the provider result
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should display provider details in modal', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal and verify content
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        // Verify modal title
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
        
        // Verify provider details
        expect(screen.getByText(/Beautiful mosque in the heart of the city/)).toBeInTheDocument();
        expect(screen.getByText('Mosque')).toBeInTheDocument();
        expect(screen.getByText('Berlin')).toBeInTheDocument();
        expect(screen.getByText('123 Hauptstraße, Berlin')).toBeInTheDocument();
      });
    });

    it('should show contact information in modal', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal and verify contact info
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        
        // Verify contact information
        expect(screen.getByText('+49 30 12345678')).toBeInTheDocument();
        expect(screen.getByText('info@bilal-moschee.de')).toBeInTheDocument();
        
        const websiteLink = screen.getByRole('link', { name: /bilal-moschee\.de/i });
        expect(websiteLink).toBeInTheDocument();
        expect(websiteLink).toHaveAttribute('href', 'https://bilal-moschee.de');
      });
    });

    it('should display provider images in modal', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal and verify images
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        
        // Verify main image
        const mainImage = screen.getByAltText('Bilal Moschee');
        expect(mainImage).toBeInTheDocument();
        expect(mainImage).toHaveAttribute('src', 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-1.jpg');
        
        // Verify image counter
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
      });
    });
  });

  describe('Phase 4: Interact with Provider Detail Modal', () => {
    it('should navigate through images using arrow buttons', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal and navigate images
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Click next button
      const nextButton = screen.getByRole('button', { name: /next image/i });
      fireEvent.click(nextButton);
      
      // Wait for image change
      await waitFor(() => {
        const secondImage = screen.getByAltText('Bilal Moschee');
        expect(secondImage).toHaveAttribute('src', 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-2.jpg');
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });
      
      // Click previous button
      const prevButton = screen.getByRole('button', { name: /previous image/i });
      fireEvent.click(prevButton);
      
      // Wait for image change back
      await waitFor(() => {
        const firstImage = screen.getByAltText('Bilal Moschee');
        expect(firstImage).toHaveAttribute('src', 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-1.jpg');
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
      });
    });

    it('should navigate through images using keyboard arrows', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal and navigate with keyboard
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Navigate to next image with ArrowRight
      fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight' });
      
      await waitFor(() => {
        const secondImage = screen.getByAltText('Bilal Moschee');
        expect(secondImage).toHaveAttribute('src', 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-2.jpg');
      });
      
      // Navigate back with ArrowLeft
      fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft' });
      
      await waitFor(() => {
        const firstImage = screen.getByAltText('Bilal Moschee');
        expect(firstImage).toHaveAttribute('src', 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-1.jpg');
      });
    });

    it('should close modal with Escape key', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Close with Escape key
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal with close button', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search and open modal
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      safeClick(providerCard);
      
      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Close with close button
      const closeButton = screen.getByRole('button', { name: /schließen/i });
      fireEvent.click(closeButton);
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Phase 5: Mobile-Specific Interactions', () => {
    it('should handle mobile touch interactions correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Perform search
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      fireEvent.click(searchButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
      
      // Click on result with touch simulation
      const bilalMoschee = screen.getByText('Bilal Moschee');
      const providerCard = bilalMoschee.closest('[role="button"]');
      
      expect(providerCard).toBeTruthy();
      fireEvent.touchStart(providerCard as HTMLElement);
      fireEvent.touchEnd(providerCard as HTMLElement);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should handle mobile keyboard input in search', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      
      // Simulate mobile keyboard input
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Bilal' } });
      
      // Verify input value
      expect(searchInput).toHaveValue('Bilal');
      
      // Simulate mobile search submission
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle search with no results gracefully', async () => {
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Search for something that won't return results
      fireEvent.change(searchInput, { target: { value: 'NonExistentProvider' } });
      fireEvent.click(searchButton);
      
      // Wait for search to complete
      await waitFor(() => {
        // Should show empty state or no results message
        expect(screen.queryByText('NonExistentProvider')).not.toBeInTheDocument();
      });
    });

    it('should handle malformed provider data gracefully', async () => {
      // Mock search service to return malformed data
      const { searchProvidersAndZakat } = await import('@/services/providers');
      vi.mocked(searchProvidersAndZakat).mockResolvedValueOnce([
        {
          type: 'provider',
          data: {
            provider_id: 'malformed-123',
            name: 'Malformed Provider',
            // Missing other required fields
          } as Partial<Provider>,
          relevance_score: 0.5
        }
      ]);
      
      render(<ProvidersContent />);
      
      const searchInput = screen.getByPlaceholderText(/suchen/i);
      const searchButton = screen.getByRole('button', { name: /suchen/i });
      
      // Search for malformed data
      fireEvent.change(searchInput, { target: { value: 'Malformed' } });
      fireEvent.click(searchButton);
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Malformed Provider')).toBeInTheDocument();
      });
      
      // Should still be able to click on it
      const malformedProvider = screen.getByText('Malformed Provider');
      const providerCard = malformedProvider.closest('[role="button"]');
      safeClick(providerCard);
      
      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(screen.getByText('Malformed Provider')).toBeInTheDocument();
      });
    });
  });
});
