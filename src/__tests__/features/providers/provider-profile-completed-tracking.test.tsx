/**
 * Plan 036 — M2b: provider_profile_completed tracking
 *
 * TDD tests verifying that trackEvent('provider_profile_completed', ...) fires
 * after a successful provider submission in:
 *  - StreamlinedRecommendForm
 *  - StreamlinedImportForm
 *
 * Tests written BEFORE implementation (RED phase).
 *
 * Setup strategy:
 *  - Mock createProviderOrService to resolve immediately
 *  - Mock useFormData to inject title + category (bypasses multi-step nav)
 *  - Pass initialCity="Berlin" to set isCitySelected=true from mount
 *  - Programmatically set phone/website via fireEvent to satisfy hasContact
 *  - Click submit → assert trackEvent fired
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { render } from '../../utils/test-utils';
import React from 'react';

vi.mock('@/lib/analytics/plausible', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/services/providerService', () => ({
  createProviderOrService: vi.fn().mockResolvedValue({ provider_id: 'test-id-123' }),
}));

// Provide minimal form context so formData.title and formData.category are pre-filled
vi.mock('@/providers/form-provider', () => ({
  useFormData: () => ({
    formData: {
      title: 'Test Provider Name',
      category: 'mosque',
      city: 'Berlin',
      offers_ids: [],
      email: '',
      phone: '',
      website: '',
      instagram: '',
      description: '',
      creationMode: 'recommendation',
      entityType: 'provider',
      isOnlineBusiness: false,
      street: '',
      zip: '',
      country: '',
      showAddress: false,
      needs_ids: [],
      images: [],
      selectedCommunityServiceIds: [],
      tags: [],
      socialCategory: '',
      socialTitle: '',
      socialDescription: '',
      userEmail: '',
    },
    updateFormData: vi.fn(),
    clearFormData: vi.fn(),
    setCreationMode: vi.fn(),
  }),
  FormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/services/placeAutocompleteService', () => ({
  searchPlacesInCity: vi.fn().mockResolvedValue([]),
}));

import { trackEvent } from '@/lib/analytics/plausible';
import { createProviderOrService } from '@/services/providerService';
import { StreamlinedRecommendForm } from '@/features/providers/StreamlinedRecommendForm';
import { StreamlinedImportForm } from '@/features/providers/StreamlinedImportForm';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset createProviderOrService to succeed
  vi.mocked(createProviderOrService).mockResolvedValue({ provider_id: 'test-id-123' });
  // Clear localStorage between tests
  localStorage.clear();
  // jsdom doesn't implement matchMedia — required by form UI internals
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ---------------------------------------------------------------------------
// Pre-populate localStorage so the form starts in a valid submittable state:
//   title='Test Provider', category='mosque', city='Berlin', website selected+filled
// ---------------------------------------------------------------------------
const RECOMMEND_KEY = 'recommendFormData';
const IMPORT_KEY = 'importOsmFormData';

const validFormStorage = JSON.stringify({
  formData: {
    title: 'Test Provider Name',
    category: 'mosque',
    city: 'Berlin',
    offers_ids: [],
    email: '',
    phone: '',
    website: 'https://example.com',
    instagram: '',
    userEmail: '',
    message: '',
    street: '',
    zip: '',
    country: '',
  },
  selectedContacts: {
    email: false,
    phone: false,
    website: true,
    instagram: false,
  },
});

// ---------------------------------------------------------------------------
// StreamlinedRecommendForm
// ---------------------------------------------------------------------------
describe('StreamlinedRecommendForm — provider_profile_completed tracking', () => {
  beforeEach(() => {
    // Pre-seed localStorage so the form starts valid (title+category+city+website)
    localStorage.setItem(RECOMMEND_KEY, validFormStorage);
  });

  it('emits provider_profile_completed after successful form submission', async () => {
    render(<StreamlinedRecommendForm initialCity="Berlin" />);

    // Wait for form to reach valid state (localStorage restored async via useEffect)
    const submitButton = await screen.findByRole('button', { name: /submit|absenden/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('provider_profile_completed', expect.objectContaining({
        city: 'Berlin',
        has_website: true,
      }));
    });
  });

  it('does NOT emit provider_profile_completed when form submission fails', async () => {
    vi.mocked(createProviderOrService).mockRejectedValue(new Error('Network error'));

    render(<StreamlinedRecommendForm initialCity="Berlin" />);

    const submitButton = await screen.findByRole('button', { name: /submit|absenden/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(createProviderOrService).toHaveBeenCalled();
    });

    expect(trackEvent).not.toHaveBeenCalledWith('provider_profile_completed', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// StreamlinedImportForm
// ---------------------------------------------------------------------------
describe('StreamlinedImportForm — provider_profile_completed tracking', () => {
  beforeEach(() => {
    localStorage.setItem(IMPORT_KEY, validFormStorage);
  });

  it('emits provider_profile_completed after successful form submission', async () => {
    render(<StreamlinedImportForm initialCity="Berlin" />);

    const submitButton = await screen.findByRole('button', { name: /submit|absenden/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith('provider_profile_completed', expect.objectContaining({
        city: 'Berlin',
        has_website: true,
      }));
    });
  });
});
