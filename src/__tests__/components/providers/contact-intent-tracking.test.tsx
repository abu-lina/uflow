/**
 * Plan 036 — M2: contact_intent_triggered tracking
 *
 * TDD tests verifying that trackEvent('contact_intent_triggered', ...) fires
 * when a seeker taps Call or Website in:
 *  - ProviderDetailModal (desktop action bar buttons)
 *  - ProviderCardModal (via ProviderActionBar links)
 *
 * Tests written BEFORE implementation (RED phase).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../utils/test-utils';
import { ProviderDetailModal } from '@/components/providers/ProviderDetailModal';
import { ProviderCardModal } from '@/components/providers/ProviderCardModal';
import { mockProviders } from '../../mocks/providerData';

// Mock trackEvent — must be declared before component imports resolve
vi.mock('@/lib/analytics/plausible', () => ({
  trackEvent: vi.fn(),
}));

// Import AFTER the mock is set up
import { trackEvent } from '@/lib/analytics/plausible';

const mockProvider = mockProviders[0]; // Berlin, contact_phone + social_website set
const mockOnClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Prevent window.open from navigating in jsdom
  vi.spyOn(window, 'open').mockImplementation(() => null);
  // Suppress console.log from ProviderDetailModal image debug
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// ProviderDetailModal — desktop action bar buttons
// ---------------------------------------------------------------------------
describe('ProviderDetailModal — contact_intent_triggered', () => {
  it('emits contact_intent_triggered with contact_type=call when call button is clicked', async () => {
    render(
      <ProviderDetailModal
        provider={mockProvider}
        onClose={mockOnClose}
      />,
    );

    // The call button renders an Icon with data-icon="entypo:old-phone"
    // We find the icon span, then climb up to its parent button
    const callIcon = document.querySelector('[data-icon="entypo:old-phone"]');
    expect(callIcon).toBeTruthy();
    const callButton = callIcon?.closest('button');
    expect(callButton).toBeTruthy();

    fireEvent.click(callButton!);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('contact_intent_triggered', {
        contact_type: 'call',
        city: mockProvider.address_city,
      });
    });
  });

  it('emits contact_intent_triggered with contact_type=website when website button is clicked', async () => {
    render(
      <ProviderDetailModal
        provider={mockProvider}
        onClose={mockOnClose}
      />,
    );

    // Website button renders Icon with data-icon="mdi:internet"
    const websiteIcon = document.querySelector('[data-icon="mdi:internet"]');
    expect(websiteIcon).toBeTruthy();
    const websiteButton = websiteIcon?.closest('button');
    expect(websiteButton).toBeTruthy();

    fireEvent.click(websiteButton!);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('contact_intent_triggered', {
        contact_type: 'website',
        city: mockProvider.address_city,
      });
    });
  });

  it('does NOT emit contact_intent_triggered when save button is clicked', async () => {
    render(
      <ProviderDetailModal
        provider={mockProvider}
        onClose={mockOnClose}
      />,
    );

    // Save button renders Icon with data-icon="iconamoon:heart" or similar
    const saveIcons = document.querySelectorAll(
      '[data-icon="iconamoon:heart"], [data-icon="iconamoon:heart-fill"]',
    );
    // Find the one inside the action bar's desktop section (not mobile)
    const saveButton = saveIcons[0]?.closest('button');

    if (saveButton) {
      fireEvent.click(saveButton);
    }

    // trackEvent must NOT be called for save actions
    expect(trackEvent).not.toHaveBeenCalledWith(
      'contact_intent_triggered',
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// ProviderCardModal — ProviderActionBar call/website links
// ---------------------------------------------------------------------------
describe('ProviderCardModal — contact_intent_triggered', () => {
  const cardProvider = {
    provider_id: mockProvider.provider_id,
    provider_name: mockProvider.provider_name,
    address_city: mockProvider.address_city,
    contact_phone: mockProvider.contact_phone,
    social_website: mockProvider.social_website,
    provider_images: mockProvider.provider_images,
    category: mockProvider.category,
  };

  it('emits contact_intent_triggered with contact_type=call when call link is clicked', async () => {
    render(
      <ProviderCardModal
        open={true}
        provider={cardProvider}
        onClose={mockOnClose}
      />,
    );

    // ProviderActionBar renders <a aria-label={t('providers.call')} href="tel:...">
    // In English locale (jsdom default): 'Call'; in German: 'Anrufen'
    const callLink = screen.getByRole('link', { name: /^(Call|Anrufen)$/i });
    expect(callLink).toBeInTheDocument();

    fireEvent.click(callLink);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('contact_intent_triggered', {
        contact_type: 'call',
        city: cardProvider.address_city,
      });
    });
  });

  it('emits contact_intent_triggered with contact_type=website when website link is clicked', async () => {
    render(
      <ProviderCardModal
        open={true}
        provider={cardProvider}
        onClose={mockOnClose}
      />,
    );

    // ProviderActionBar renders <a aria-label="Website" href="...">
    const websiteLink = screen.getByRole('link', { name: 'Website' });
    expect(websiteLink).toBeInTheDocument();

    fireEvent.click(websiteLink);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('contact_intent_triggered', {
        contact_type: 'website',
        city: cardProvider.address_city,
      });
    });
  });

  it('does NOT emit when provider has no phone and no website', async () => {
    render(
      <ProviderCardModal
        open={true}
        provider={{
          ...cardProvider,
          contact_phone: null,
          social_website: null,
        }}
        onClose={mockOnClose}
      />,
    );

    // Action bar buttons that don't exist cannot fire events
    expect(screen.queryByRole('link', { name: 'Anrufen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
    expect(trackEvent).not.toHaveBeenCalledWith('contact_intent_triggered', expect.anything());
  });
});
