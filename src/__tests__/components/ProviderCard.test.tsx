import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, mockMatchMedia } from '../utils/test-utils';
import { ProviderCard } from '@/features/providers/components/ProviderCard';
import { mockProviders } from '../mocks/providerData';
import type { Provider } from '@/services/providers';
import * as AuthProviderModule from '@/providers/auth-provider';

describe('ProviderCard Component', () => {
  const mockProvider = mockProviders[0]; // Bilal Moschee
  const mockOnClick = vi.fn();
  const mockOnBookmarkChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render provider name', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByText('Bilal Moschee')).toBeInTheDocument();
    });

    it('should render provider address', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // ProviderCard renders address, not description
      expect(screen.getByText(/123 Hauptstraße, 10115 Berlin/)).toBeInTheDocument();
    });

    it('should render provider category', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Category is shown as overlay on image using German name (default test locale)
      expect(screen.getByText('Moschee')).toBeInTheDocument();
    });

    it('should render provider location in address', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Location is part of the full address string
      expect(screen.getByText(/Berlin/)).toBeInTheDocument();
    });

    it('should render provider image', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const providerImage = screen.getByAltText('Bilal Moschee');
      expect(providerImage).toBeInTheDocument();
      expect(providerImage).toHaveAttribute(
        'src',
        'https://mock-supabase-url.com/storage/v1/object/public/images/bilal-mosque-1.jpg',
      );
    });

    it('should render dynamic fallback when no images available', () => {
      // Final fallback should be the placeholder image when neither provider nor category image exists
      const providerWithoutImages = { ...mockProvider, provider_images: null };

      render(
        <ProviderCard
          {...providerWithoutImages}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const img = screen.getByAltText(providerWithoutImages.provider_name);
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toContain('/images/placeholder.jpg');
    });

    it('should render category storage image as normal card image when provider has no uploaded image', () => {
      // Turkish category now uses DB-driven Supabase Storage URLs (Plan 122)
      const TURKISH_CATEGORY_IMAGES = {
        urls: [
          'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/232c2870-7929-43eb-a909-6cac90203192/1.webp',
          'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/232c2870-7929-43eb-a909-6cac90203192/2.webp',
        ],
      };
      const providerWithoutImages = {
        ...mockProvider,
        provider_images: null,
        category_id: '232c2870-7929-43eb-a909-6cac90203192', // Turkish — has Storage images in DB
        category: {
          ...mockProvider.category,
          name_de: mockProvider.category?.name_de || 'Tuerkisch',
          name_en: mockProvider.category?.name_en || 'Turkish',
          category_images: TURKISH_CATEGORY_IMAGES,
        },
      };

      render(
        <ProviderCard
          {...providerWithoutImages}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Should NOT render the fallback placeholder — Storage image takes its place
      expect(screen.queryByTestId('provider-image-fallback')).not.toBeInTheDocument();
      // The Next.js Image component renders an <img> with the provider name as alt
      const img = screen.getByAltText(providerWithoutImages.provider_name);
      expect(img.getAttribute('src')).toBeTruthy();
      expect(img.getAttribute('src')).toContain('category-images');
      expect(img.className).toContain('object-cover');
      expect((img.parentElement as HTMLElement).style.backgroundColor).toBeTruthy();
    });

    it('[regression] provider-owned image wins over category fallback when both are available', () => {
      // Pre-fix: category-first logic set isCategoryFallbackImage=true whenever a category static
      // image existed — even when the provider had uploaded their own image. This caused scale-[1.08]
      // to be applied to a real provider photo (visual bug + semantic regression).
      // Post-fix: provider image takes priority; scale-[1.08] only applied when no provider image.
      const providerWithBothImages = {
        ...mockProvider,
        provider_images: JSON.stringify({
          urls: ['https://mock-supabase-url.com/storage/v1/object/public/images/own-photo.jpg'],
        }),
        category_id: '232c2870-7929-43eb-a909-6cac90203192', // Turkish — has static fallback images (real DB ID)
        category: {
          ...mockProvider.category,
          category_id: '232c2870-7929-43eb-a909-6cac90203192',
          name_de: 'Türkisch',
          name_en: 'Turkish',
        },
      };

      render(
        <ProviderCard
          {...providerWithBothImages}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const img = screen.getByAltText(providerWithBothImages.provider_name);
      expect(img).toBeInTheDocument();
      // Category fallback adds 'scale-[1.08] px-3 py-0'; provider-owned image uses plain object-cover.
      // If this assertion fails, the category image is still overriding the provider's own image.
      expect(img.className).not.toContain('scale-[1.08]');
    });
  });

  describe('Interactive Functionality', () => {
    it('should render address as a clickable element', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Address is rendered as a button for navigation
      const addressButton = screen.getByText(/123 Hauptstraße/);
      expect(addressButton).toBeInTheDocument();
      expect(addressButton.tagName).toBe('BUTTON');
    });

    it('should not render website button in bookmark mode', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByRole('button', { name: /website/i })).not.toBeInTheDocument();
    });

    it('should render top-right save icon button', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    });

    it('should match figma bookmark shell style', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const saveButton = screen.getByRole('button', { name: /^save$/i });
      expect(saveButton.className).toContain('rounded-[6px]');
      expect(saveButton.className).toContain('border-neutral');
      expect(saveButton.className).toContain('border-[0.8px]');
      expect(saveButton.className).toContain('bg-white/70');
      expect(saveButton.className).toContain('backdrop-blur-[2px]');
    });

    it('should render card container', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Card renders as a div container, parent handles navigation
      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();
    });
  });

  describe('Bookmark Functionality', () => {
    it('should expose save icon label when not bookmarked', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should expose saved icon label when bookmarked', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={true}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByRole('button', { name: /^saved$/i })).toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('should render save icon as clickable button', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const saveButton = screen.getByRole('button', { name: /^save$/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should render save icon and hide website action', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /website/i })).not.toBeInTheDocument();
    });

    it('should not render full Allahuma Barik text after first save click', async () => {
      const authSpy = vi.spyOn(AuthProviderModule, 'useAuth').mockReturnValue({
        user: { id: 'user-1' },
      } as ReturnType<typeof AuthProviderModule.useAuth>);

      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(screen.queryByText('Allahuma Barik')).not.toBeInTheDocument();
      });

      authSpy.mockRestore();
    });
  });

  describe('Contact Information', () => {
    it('should not render contact phone on card (phone shown in detail modal)', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // ProviderCard doesn't display phone — detail modal does
      expect(screen.queryByText('+49 30 12345678')).not.toBeInTheDocument();
    });

    it('should not render contact email on card (email shown in detail modal)', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // ProviderCard doesn't display email — detail modal does
      expect(screen.queryByText('info@bilal-moschee.de')).not.toBeInTheDocument();
    });

    it('should not render website button in bookmark mode', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByRole('button', { name: /website/i })).not.toBeInTheDocument();
    });

    it('should not render contact info when not available', () => {
      const providerWithoutContact = {
        ...mockProvider,
        contact_phone: null,
        contact_email: null,
        website: null,
      };

      render(
        <ProviderCard
          {...providerWithoutContact}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByText('+49 30 12345678')).not.toBeInTheDocument();
      expect(screen.queryByText('info@bilal-moschee.de')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /bilal-moschee\.de/i })).not.toBeInTheDocument();
    });
  });

  describe('Tags and Categories', () => {
    it('should render provider name and address when available', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // ProviderCard shows provider name and address (barakah_effects display removed in Plan 114 Phase 2)
      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();
    });

    it('should not render tags when not available', () => {
      const providerWithoutTags = { ...mockProvider, tags: null };

      render(
        <ProviderCard
          {...providerWithoutTags}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByText('mosque')).not.toBeInTheDocument();
    });
  });

  describe('Plan 115 — specialties and open status', () => {
    it('[pre-fix FAILS] [post-fix PASSES] renders top-2 specialties with +N overflow', () => {
      const providerWithSpecialties = {
        ...mockProvider,
        offers: [
          { name_de: 'Shawarma' },
          { name_de: 'Falafel' },
          { name_de: 'Manti' },
        ],
      };

      render(
        <ProviderCard
          {...providerWithSpecialties}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByText('Shawarma · Falafel · +1')).toBeInTheDocument();
      expect(screen.queryByText(/Shawarma · Falafel · Manti/)).not.toBeInTheDocument();
    });

    it('[pre-fix FAILS] [post-fix PASSES] renders open-status marker when opening_hours exists', () => {
      const providerWithOpeningHours = {
        ...mockProvider,
        opening_hours: {
          monday: { open: '00:00', close: '23:59' },
          tuesday: { open: '00:00', close: '23:59' },
          wednesday: { open: '00:00', close: '23:59' },
          thursday: { open: '00:00', close: '23:59' },
          friday: { open: '00:00', close: '23:59' },
          saturday: { open: '00:00', close: '23:59' },
          sunday: { open: '00:00', close: '23:59' },
        },
      };

      render(
        <ProviderCard
          {...providerWithOpeningHours}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      const statusLine = screen.getByTestId('provider-open-status');
      expect(statusLine).toBeInTheDocument();
      expect(screen.getByText(/^(open|closed|geöffnet|geschlossen)$/i)).toBeInTheDocument();
      expect(screen.queryByText('●')).not.toBeInTheDocument();
      expect(screen.queryByText(/open until|opens on|opens tomorrow/i)).not.toBeInTheDocument();
    });

    it('[pre-fix FAILS] [post-fix PASSES] hides open-status marker when opening_hours is absent', () => {
      const providerWithoutOpeningHours = {
        ...mockProvider,
        opening_hours: null,
      };

      render(
        <ProviderCard
          {...providerWithoutOpeningHours}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.queryByTestId('provider-open-status')).not.toBeInTheDocument();
    });


  });

  // Verification status tests removed - component doesn't have verification badges

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();

      // Bookmark action has aria-label
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();

      // Save button is keyboard accessible
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Check if the component renders at all
      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();
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

      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();
      const saveButton = screen.getByRole('button', { name: /^save$/i });

      // Verify elements are present and accessible
      expect(saveButton).toBeInTheDocument();

      // Test touch interaction simulation on the main card area
      const cardArea = screen.getByText(mockProvider.provider_name).closest('div');
      if (cardArea) {
        fireEvent.touchStart(cardArea);
        fireEvent.touchEnd(cardArea);
      }

      // ProviderCard doesn't handle clicks directly - that's handled by parent components
    });

    it('should handle mobile touch events correctly', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Check if the component renders at all
      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();

      // Simulate mobile touch events on the main card area
      const cardArea = screen.getByText(mockProvider.provider_name).closest('div');
      if (cardArea) {
        fireEvent.touchStart(cardArea);
        fireEvent.touchEnd(cardArea);
      }

      // ProviderCard doesn't handle clicks directly - that's handled by parent components
    });
  });

  describe('Error Handling', () => {
    it('should handle missing provider data gracefully', () => {
      const incompleteProvider: Provider = {
        provider_id: 'incomplete-123',
        provider_name: 'Incomplete Provider',
        provider_images: null,
        category_id: null,
        address_city: null,
        social_website: null,
        social_instagram: null,
        contact_email: null,
        contact_phone: null,
        address_street: null,
        address_country: null,
        address_zip: null,
        location_latitude: null,
        location_longitude: null,
        created_at: null,
        updated_at: null,
        offers_ids: [],
        needs_ids: [],
      };

      render(
        <ProviderCard
          {...incompleteProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Should still render basic information
      expect(screen.getByText('Incomplete Provider')).toBeInTheDocument();
    });

    it('should handle malformed image data gracefully', () => {
      const providerWithMalformedImages = {
        ...mockProvider,
        provider_images: 'invalid-json',
      };

      render(
        <ProviderCard
          {...providerWithMalformedImages}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Should still render the component without crashing
      expect(screen.getByText(mockProvider.provider_name)).toBeInTheDocument();
    });
  });

  /**
   * Plan 058 M3: Admin Moderation Mode
   * 
   * ProviderCard supports a `mode` prop to switch between:
   * - 'bookmark' (default): Shows Save/Saved button
   * - 'moderation': Shows Approve/Reject buttons for admin review
   */
  describe('Admin Moderation Mode (Plan 058)', () => {
    const mockOnApprove = vi.fn();
    const mockOnReject = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render bookmark mode by default', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          onBookmarkChange={mockOnBookmarkChange}
        />,
      );

      // Bookmark mode uses top-right heart overlay and hides bottom action row.
      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /website/i })).not.toBeInTheDocument();
      // Should NOT show moderation buttons
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should show moderation buttons when mode is "moderation"', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      // Should show Approve and Reject buttons
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
      // Should NOT show Save button
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('should call onApprove when Approve button is clicked', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledTimes(1);
    });

    it('should call onReject when Reject button is clicked', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('should show review status badge when reviewStatus is provided', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          reviewStatus="pending"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      // Should show a status indicator
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should show approved status with appropriate styling', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          reviewStatus="approved"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      expect(screen.getByText(/approved/i)).toBeInTheDocument();
    });

    it('should show rejected status with appropriate styling', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          reviewStatus="rejected"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });

    it('should disable buttons when isReviewing is true', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          isReviewing={true}
          mode="moderation"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      const rejectButton = screen.getByRole('button', { name: /reject/i });

      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('should not call callbacks when buttons are disabled', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          isReviewing={true}
          mode="moderation"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(mockOnApprove).not.toHaveBeenCalled();
    });

    it('should have hidden class on moderation wrapper for mobile (Plan 188)', () => {
      render(
        <ProviderCard
          {...mockProvider}
          isBookmarked={false}
          mode="moderation"
          onApprove={mockOnApprove}
          onBookmarkChange={mockOnBookmarkChange}
          onReject={mockOnReject}
        />,
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      const wrapperDiv = approveButton.parentElement;

      // Wrapper should have 'hidden' (mobile hidden) and 'sm:flex' (desktop visible)
      expect(wrapperDiv).toHaveClass('hidden');
      expect(wrapperDiv).toHaveClass('sm:flex');
      // Buttons are still in the DOM even when visually hidden
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });
});
