import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPush,
  mockBack,
  mockToastError,
  mockToastSuccess,
  mockCreateRelationship,
  mockProviderUpdateEq,
  mockProviderUpdate,
  mockProviderCommunityServicesSelectEq,
  mockProviderCommunityServicesDeleteEq,
  mockProviderCommunityServicesSelect,
  mockProviderCommunityServicesDelete,
  mockCategoriesOrder,
  mockCategoriesSelect,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockCreateRelationship: vi.fn(),
  mockProviderUpdateEq: vi.fn(),
  mockProviderUpdate: vi.fn(),
  mockProviderCommunityServicesSelectEq: vi.fn(),
  mockProviderCommunityServicesDeleteEq: vi.fn(),
  mockProviderCommunityServicesSelect: vi.fn(),
  mockProviderCommunityServicesDelete: vi.fn(),
  mockCategoriesOrder: vi.fn(),
  mockCategoriesSelect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('@iconify/react', () => ({
  Icon: (props: Record<string, unknown>) => <span data-testid="icon" {...props} />,
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'editProvider.basics': 'Basics',
        'editProvider.location': 'Location',
        'editProvider.contact': 'Contact',
        'editProvider.media': 'Media',
        'editProvider.titleField': 'Title',
        'editProvider.titlePlaceholder': 'Enter title',
        'editProvider.description': 'Description',
        'editProvider.descriptionPlaceholder': 'Enter description',
        'editProvider.category': 'Category',
        'providers.selectCategory': 'Select category',
        'editProvider.whatDoIOffer': 'What do I offer?',
        'editProvider.offersSelected': '{{count}} offers selected',
        'editProvider.selectOffers': 'Select offers',
        'editProvider.whatDoINeed': 'What do I need?',
        'editProvider.needsSelected': '{{count}} needs selected',
        'editProvider.selectNeeds': 'Select needs',
        'editProvider.onlineBusiness': 'Online business',
        'editProvider.noPhysicalLocation': 'No physical location',
        'editProvider.onlineBusinessDisplay': 'Online only',
        'editProvider.street': 'Street',
        'editProvider.streetPlaceholder': 'Street',
        'editProvider.zipCode': 'ZIP',
        'editProvider.zipCodePlaceholder': 'ZIP',
        'editProvider.city': 'City',
        'editProvider.cityPlaceholder': 'City',
        'editProvider.country': 'Country',
        'editProvider.countryPlaceholder': 'Country',
        'editProvider.website': 'Website',
        'editProvider.websitePlaceholder': 'Website',
        'editProvider.instagram': 'Instagram',
        'editProvider.instagramPlaceholder': 'Instagram',
        'editProvider.email': 'Email',
        'editProvider.emailPlaceholder': 'Email',
        'editProvider.phone': 'Phone',
        'editProvider.phonePlaceholder': 'Phone',
        'editProvider.images': 'Images',
        'editProvider.imagesSelected': '{{count}} images selected',
        'editProvider.uploadImages': 'Upload images',
        'editProvider.socialInitiatives': 'Social initiatives',
        'editProvider.initiativesSelected': '{{count}} initiatives selected',
        'editProvider.selectInitiatives': 'Select initiatives',
        'editProvider.save': 'Save',
        'editProvider.saveChanges': 'Save changes',
        'editProvider.discardChanges': 'Discard changes',
        'editProvider.mustBeLoggedIn': 'Must be logged in',
        'editProvider.errorUpdating': 'Error updating provider',
        'editProvider.sectionFieldLabel': 'Section Label (i18n)',
        'editProvider.sectionUnclassified': 'Unclassified (i18n)',
        'editProvider.sectionFood': 'Food (i18n)',
        'editProvider.sectionBusiness': 'Business (i18n)',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: (...args: unknown[]) => mockCreateRelationship(...args),
}));

vi.mock('@/components/ui/FooterAction', () => ({
  FooterAction: ({
    primaryButton,
    secondaryButton,
  }: {
    primaryButton?: { label: string; onClick: () => void; disabled?: boolean };
    secondaryButton?: { onClick: () => void; 'aria-label': string };
  }) => (
    <div>
      {primaryButton ? (
        <button disabled={primaryButton.disabled} type="button" onClick={primaryButton.onClick}>
          {primaryButton.label}
        </button>
      ) : null}
      {secondaryButton ? (
        <button aria-label={secondaryButton['aria-label']} type="button" onClick={secondaryButton.onClick}>
          secondary
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'categories') {
        return {
          select: mockCategoriesSelect,
        };
      }

      if (table === 'provider_community_services') {
        return {
          select: mockProviderCommunityServicesSelect,
          delete: mockProviderCommunityServicesDelete,
        };
      }

      if (table === 'providers') {
        return {
          update: mockProviderUpdate,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  },
}));

import { ProviderEditForm } from '@/components/providers/ProviderEditForm';
import type { Provider } from '@/services/providers';

const baseProvider: Provider = {
  provider_id: '123e4567-e89b-12d3-a456-426614174000',
  provider_name: 'Test Provider',
  provider_images: '{"urls":[]}',
  category_id: null,
  address_city: 'Berlin',
  social_website: '',
  social_instagram: '',
  contact_email: '',
  contact_phone: '',
  address_street: 'Street 1',
  address_country: 'Germany',
  address_zip: '10115',
  location_latitude: null,
  location_longitude: null,
  created_at: null,
  updated_at: null,
  offers_ids: [],
  needs_ids: [],
  show_address: true,
  description: null,
};

describe('ProviderEditForm regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCategoriesOrder.mockResolvedValue({ data: [], error: null });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({ eq: mockProviderCommunityServicesSelectEq });

    mockProviderCommunityServicesDeleteEq.mockResolvedValue({ error: null });
    mockProviderCommunityServicesDelete.mockReturnValue({ eq: mockProviderCommunityServicesDeleteEq });

    mockProviderUpdateEq.mockResolvedValue({ error: null });
    mockProviderUpdate.mockReturnValue({ eq: mockProviderUpdateEq });
  });

  it('[post-fix PASSES] owner submit persists provider_description', async () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={baseProvider}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter description'), {
      target: { value: 'Owner description from shared form' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockProviderUpdate).toHaveBeenCalled();
    });

    expect(mockProviderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_description: 'Owner description from shared form',
      })
    );
  });

  it('[post-fix PASSES] admin custom submit failure does not emit duplicate generic toast', async () => {
    const onSubmitForm = vi.fn().mockRejectedValue(new Error('specific failure'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        onSubmitForm={onSubmitForm}
        provider={baseProvider}
        subPageBaseUrl="/dashboard/providers/123/edit"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalled();
    });

    expect(mockToastError).not.toHaveBeenCalledWith('Error updating provider');
    expect(mockToastError).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('[post-fix PASSES] moderation footer replaces generic save with reject and approve actions', () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={baseProvider}
        reviewFooterActions={{
          reject: {
            label: 'Reject',
            onClick: vi.fn().mockResolvedValue(undefined),
          },
          approve: {
            label: 'Approve',
            onClick: vi.fn().mockResolvedValue(undefined),
          },
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('[pre-fix FAILS] moderation section selector uses translation keys for label and options', () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={baseProvider}
        reviewFooterActions={{
          reject: { label: 'Reject', onClick: vi.fn() },
          approve: { label: 'Approve', onClick: vi.fn() },
        }}
      />
    );

    expect(screen.getByText('Section Label (i18n)')).toBeInTheDocument();

    const select = screen.getByRole('combobox', {
      name: 'Section Label (i18n)',
    });

    expect(select).toHaveTextContent('Unclassified (i18n)');
    expect(select).toHaveTextContent('Food (i18n)');
    expect(select).toHaveTextContent('Business (i18n)');
  });

  it('[post-fix PASSES] moderation footer sends current form data to the selected action', async () => {
    const approveAction = vi.fn().mockResolvedValue(undefined);
    const rejectAction = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={baseProvider}
        reviewFooterActions={{
          reject: {
            label: 'Reject',
            onClick: rejectAction,
          },
          approve: {
            label: 'Approve',
            onClick: approveAction,
          },
        }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter description'), {
      target: { value: 'Reviewed and enriched description' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(approveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          providerDescription: 'Reviewed and enriched description',
        })
      );
    });

    expect(rejectAction).not.toHaveBeenCalled();
    expect(mockProviderUpdate).not.toHaveBeenCalled();
  });

  it('[post-fix PASSES] moderation approve is not blocked when provider website is schemeless', async () => {
    const approveAction = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={{ ...baseProvider, social_website: 'www.example.com' }}
        reviewFooterActions={{
          reject: {
            label: 'Reject',
            onClick: vi.fn().mockResolvedValue(undefined),
          },
          approve: {
            label: 'Approve',
            onClick: approveAction,
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(approveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          website: 'https://www.example.com',
        })
      );
    });
  });

  it('[post-fix PASSES] admin moderation flow should allow editing Section (listing_type)', async () => {
    const approveAction = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={{ ...baseProvider, listing_type: 'food' }}
        reviewFooterActions={{
          reject: {
            label: 'Reject',
            onClick: vi.fn().mockResolvedValue(undefined),
          },
          approve: {
            label: 'Approve',
            onClick: approveAction,
          },
        }}
      />
    );

    const sectionSelect = screen.getByLabelText('Section Label (i18n)');
    fireEvent.change(sectionSelect, { target: { value: 'business' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(approveAction).toHaveBeenCalledWith(
        expect.objectContaining({
          listingType: 'business',
        })
      );
    });
  });
});

describe('ProviderEditForm admin draft-state persistence (Plan 060)', () => {
  const pid = baseProvider.provider_id;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockCategoriesOrder.mockResolvedValue({ data: [{ category_id: 'cat-food', name_de: 'Essen & Trinken', name_en: 'Food & Drinks' }], error: null });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({ eq: mockProviderCommunityServicesSelectEq });
  });

  it('[pre-fix FAILS] admin form with enableLocalStorage=false ignores admin category selection', () => {
    // Simulate: admin sub-page wrote the category to localStorage
    localStorage.setItem(`admin_edit_category_${pid}`, 'cat-food');

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />
    );

    // Pre-fix: form ignores localStorage entirely → shows placeholder
    expect(screen.getByText('Select category')).toBeInTheDocument();
  });

  it('[post-fix PASSES] admin form with localStoragePrefix reads admin-prefixed category', async () => {
    localStorage.setItem(`admin_edit_category_${pid}`, 'cat-food');

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Food & Drinks')).toBeInTheDocument();
    });
  });

  it('[post-fix PASSES] admin form reads admin-prefixed offers count', async () => {
    localStorage.setItem(`admin_edit_offers_${pid}`, JSON.stringify(['offer-1', 'offer-2', 'offer-3']));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });
  });

  it('[post-fix PASSES] admin form reads admin-prefixed needs count', async () => {
    localStorage.setItem(`admin_edit_needs_${pid}`, JSON.stringify(['need-1', 'need-2']));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });
  });

  it('[post-fix PASSES] admin form ignores unprefixed owner draft state (context isolation)', async () => {
    // Owner flow wrote category to unprefixed key
    localStorage.setItem(`edit_category_${pid}`, 'cat-food');
    // Admin flow has no matching admin-prefixed key

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />
    );

    await waitFor(() => {
      // Should show placeholder — admin form should NOT read unprefixed owner key
      expect(screen.getByText('Select category')).toBeInTheDocument();
    });
  });

  it('[post-fix PASSES] owner form still reads unprefixed keys (no regression)', async () => {
    localStorage.setItem(`edit_category_${pid}`, 'cat-food');

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        provider={baseProvider}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Food & Drinks')).toBeInTheDocument();
    });
  });
});