// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPush,
  mockBack,
  mockToastError,
  mockToastInfo,
  mockToastSuccess,
  mockCreateRelationship,
  mockProviderUpdateEq,
  mockProviderUpdate,
  mockProviderCommunityServicesSelectEq,
  mockProviderCommunityServicesDeleteEq,
  mockProviderCommunityServicesSelect,
  mockProviderCommunityServicesDelete,
  mockEngagementsSelectEq,
  mockEngagementsSelect,
  mockEngagementsDeleteEq,
  mockEngagementsDelete,
  mockEngagementsInsert,
  mockCategoriesOrder,
  mockCategoriesSelect,
  mockPcDelete,
  mockPcDeleteEq,
  mockPcDeleteNeq,
  mockPcInsert,
  mockRpc,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockCreateRelationship: vi.fn(),
  mockProviderUpdateEq: vi.fn(),
  mockProviderUpdate: vi.fn(),
  mockProviderCommunityServicesSelectEq: vi.fn(),
  mockProviderCommunityServicesDeleteEq: vi.fn(),
  mockProviderCommunityServicesSelect: vi.fn(),
  mockProviderCommunityServicesDelete: vi.fn(),
  mockEngagementsSelectEq: vi.fn(),
  mockEngagementsSelect: vi.fn(),
  mockEngagementsDeleteEq: vi.fn(),
  mockEngagementsDelete: vi.fn(),
  mockEngagementsInsert: vi.fn(),
  mockCategoriesOrder: vi.fn(),
  mockCategoriesSelect: vi.fn(),
  mockPcDelete: vi.fn(),
  mockPcDeleteEq: vi.fn(),
  mockPcDeleteNeq: vi.fn(),
  mockPcInsert: vi.fn(),
  mockRpc: vi.fn(),
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
    info: mockToastInfo,
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
        'editProvider.additionalCategories': 'Additional categories',
        'editProvider.noAdditionalCategories': 'None selected',
        'editProvider.secondaryCategoriesCleared': 'Additional categories were reset',
        'editProvider.secondaryCategoriesRejected': 'The selected categories could not be saved.',
        'editProvider.secondaryCategoriesTooMany': 'You can add up to 4 additional categories.',
        'editProvider.secondaryCategoriesAllSection':
          'This category applies to all sections and cannot be an additional category.',
        'editProvider.secondaryCategoriesWrongSection':
          'Additional categories must belong to the same section as the primary category.',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: (...args: unknown[]) =>
    mockCreateRelationship(...args),
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
        <button
          aria-label={secondaryButton['aria-label']}
          type="button"
          onClick={secondaryButton.onClick}
        >
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

      if (table === 'provider_engagements') {
        return {
          select: mockEngagementsSelect,
          delete: mockEngagementsDelete,
          insert: mockEngagementsInsert,
        };
      }

      if (table === 'providers') {
        return {
          update: mockProviderUpdate,
        };
      }

      if (table === 'provider_categories') {
        return {
          delete: mockPcDelete,
          insert: mockPcInsert,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc: mockRpc,
  },
}));

import { ProviderEditForm } from '@/features/providers/pages/ProviderEditForm';
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
    mockRpc.mockResolvedValue({ data: null, error: null });

    mockCategoriesOrder.mockResolvedValue({ data: [], error: null });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({
      eq: mockProviderCommunityServicesSelectEq,
    });

    mockProviderCommunityServicesDeleteEq.mockResolvedValue({ error: null });
    mockProviderCommunityServicesDelete.mockReturnValue({
      eq: mockProviderCommunityServicesDeleteEq,
    });

    mockProviderUpdateEq.mockResolvedValue({ error: null });
    mockProviderUpdate.mockReturnValue({ eq: mockProviderUpdateEq });
  });

  it('[post-fix PASSES] owner submit persists provider_description', async () => {
    render(<ProviderEditForm enableLocalStorage={false} provider={baseProvider} />);

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
      }),
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
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalled();
    });

    expect(mockToastError).not.toHaveBeenCalledWith('Error updating provider');
    expect(mockToastError).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('admin footer shows cancel and save buttons', () => {
    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={false}
        provider={baseProvider}
      />,
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it.skip('[pre-fix FAILS] moderation section selector uses translation keys for label and options', () => {
    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={false}
        provider={baseProvider}
      />,
    );

    expect(screen.getByText('Section Label (i18n)')).toBeInTheDocument();

    const select = screen.getByRole('combobox', {
      name: 'Section Label (i18n)',
    });

    expect(select).toHaveTextContent('Unclassified (i18n)');
    expect(select).toHaveTextContent('Food (i18n)');
    expect(select).toHaveTextContent('Business (i18n)');
  });

  it('[post-fix PASSES] save button in admin mode sends current form data to onSubmitForm', async () => {
    const onSubmitForm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={false}
        onSubmitForm={onSubmitForm}
        provider={baseProvider}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter description'), {
      target: { value: 'Reviewed and enriched description' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({
          providerDescription: 'Reviewed and enriched description',
        }),
      );
    });
  });

  it('[post-fix PASSES] admin save normalizes schemeless website before submitting to onSubmitForm', async () => {
    const onSubmitForm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={false}
        onSubmitForm={onSubmitForm}
        provider={{ ...baseProvider, social_website: 'www.example.com' }}
      />,
    );

    // Use fireEvent.submit on the form; fireEvent.click on a submit button
    // without prior interaction doesn't reliably trigger onSubmit in jsdom.
    const form = screen.getByRole('button', { name: 'Save' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({
          website: 'https://www.example.com',
        }),
      );
    });
  });

  it('[post-fix PASSES] admin save should persist listing_type change via onSubmitForm', async () => {
    const onSubmitForm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={false}
        onSubmitForm={onSubmitForm}
        provider={{ ...baseProvider, listing_type: 'food' }}
      />,
    );

    const sectionSelect = screen.getByLabelText('Section Label (i18n)');
    fireEvent.change(sectionSelect, { target: { value: 'store' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({
          listingType: 'store',
        }),
      );
    });
  });
});

describe('ProviderEditForm admin draft-state persistence (Plan 060)', () => {
  const pid = baseProvider.provider_id;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    localStorage.clear();

    mockCategoriesOrder.mockResolvedValue({
      data: [{ category_id: 'cat-food', name_de: 'Essen & Trinken', name_en: 'Food & Drinks' }],
      error: null,
    });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({
      eq: mockProviderCommunityServicesSelectEq,
    });
  });

  it.skip('[pre-fix FAILS] admin form with enableLocalStorage=false ignores admin category selection', () => {
    // Simulate: admin sub-page wrote the category to localStorage
    localStorage.setItem(`admin_edit_category_${pid}`, 'cat-food');

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />,
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
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Food & Drinks')).toBeInTheDocument();
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
      />,
    );

    await waitFor(() => {
      // Should show placeholder — admin form should NOT read unprefixed owner key
      expect(screen.getByText('Select category')).toBeInTheDocument();
    });
  });

  it('[post-fix PASSES] owner form still reads unprefixed keys (no regression)', async () => {
    localStorage.setItem(`edit_category_${pid}`, 'cat-food');

    render(<ProviderEditForm enableLocalStorage={true} provider={baseProvider} />);

    await waitFor(() => {
      expect(screen.getByText('Food & Drinks')).toBeInTheDocument();
    });
  });
});

describe('ProviderEditForm inline localStorage (Plan 152)', () => {
  const pid = baseProvider.provider_id;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    localStorage.clear();

    mockCategoriesOrder.mockResolvedValue({ data: [], error: null });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({
      eq: mockProviderCommunityServicesSelectEq,
    });

    mockProviderCommunityServicesDeleteEq.mockResolvedValue({ error: null });
    mockProviderCommunityServicesDelete.mockReturnValue({
      eq: mockProviderCommunityServicesDeleteEq,
    });

    mockProviderUpdateEq.mockResolvedValue({ error: null });
    mockProviderUpdate.mockReturnValue({ eq: mockProviderUpdateEq });
  });

  it('stale empty string in localStorage does NOT overwrite DB value', () => {
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ instagram: '' }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          social_instagram: '@realhandle',
        }}
      />,
    );

    const input = screen.getByPlaceholderText('Instagram') as HTMLInputElement;
    expect(input.value).toBe('@realhandle');
  });

  it('non-empty localStorage value restores on mount', () => {
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ instagram: '@saved' }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          social_instagram: '@dbvalue',
        }}
      />,
    );

    const input = screen.getByPlaceholderText('Instagram') as HTMLInputElement;
    expect(input.value).toBe('@saved');
  });

  it('null in localStorage falls through to DB value', () => {
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ instagram: null }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          social_instagram: '@dbvalue',
        }}
      />,
    );

    const input = screen.getByPlaceholderText('Instagram') as HTMLInputElement;
    expect(input.value).toBe('@dbvalue');
  });

  it('typing survives after sync with stale empty string', () => {
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ instagram: '' }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          social_instagram: '@realhandle',
        }}
      />,
    );

    const input = screen.getByPlaceholderText('Instagram') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'testhandle' } });
    expect(input.value).toBe('testhandle');

    fireEvent(window, new Event('focus'));
    expect(input.value).toBe('testhandle');
  });

  it('[post-fix PASSES] syncFromLocalStorage recomputes isOnlineBusiness from address data', async () => {
    // Stale localStorage has isOnlineBusiness=true, provider has city=Berlin
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ isOnlineBusiness: true }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          address_city: 'Berlin',
          address_zip: '10115',
        }}
      />,
    );

    // After sync, isOnlineBusiness should be false (city=Berlin present)
    // so address fields should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('City')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('City')).toHaveValue('Berlin');
  });

  it('[post-fix PASSES] handleSubmit owner path preserves address_city when isOnlineBusiness contradicts city', async () => {
    // Setup: form has isOnlineBusiness=true (stale) but city=Berlin (from provider)
    // We render with provider data and localStorage with stale isOnlineBusiness
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ isOnlineBusiness: true }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          address_city: 'Berlin',
          address_zip: '10115',
          address_street: 'Street 1',
          address_country: 'Germany',
        }}
      />,
    );

    // Wait for sync to settle and click save
    await waitFor(() => {
      expect(screen.getByPlaceholderText('City')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockProviderUpdate).toHaveBeenCalled();
    });

    const updateArg = mockProviderUpdate.mock.calls[0][0];
    // address_city should be Berlin, NOT null (protected by the && guard)
    expect(updateArg.address_city).toBe('Berlin');
    expect(updateArg.address_street).toBe('Street 1');
    expect(updateArg.address_zip).toBe('10115');
    expect(updateArg.address_country).toBe('Germany');
  });

  it('[post-fix PASSES] handleSubmit owner path nulls address when intentional online', async () => {
    // Setup: user intentionally set online=true with no address data
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ isOnlineBusiness: true }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          address_city: null,
          address_street: null,
          address_zip: null,
          address_country: null,
        }}
      />,
    );

    // After sync: no city, no zip → isOnlineBusiness=true
    // Save should null address fields (both guards pass)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockProviderUpdate).toHaveBeenCalled();
    });

    const updateArg = mockProviderUpdate.mock.calls[0][0];
    expect(updateArg.address_city).toBeNull();
    expect(updateArg.address_street).toBeNull();
    expect(updateArg.address_zip).toBeNull();
    expect(updateArg.address_country).toBeNull();
    expect(updateArg.show_address).toBe(false);
  });

  it('empty string in localStorage does not overwrite phone field', () => {
    localStorage.setItem(`admin_edit_inline_${pid}`, JSON.stringify({ phone: '' }));

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{
          ...baseProvider,
          contact_phone: '+49123456789',
        }}
      />,
    );

    const input = screen.getByPlaceholderText('Phone') as HTMLInputElement;
    expect(input.value).toBe('+49123456789');
  });
});

describe('ProviderEditForm clears localStorage drafts after save', () => {
  const pid = baseProvider.provider_id;

  const draftKeys = [
    'edit_inline_',
    'edit_category_',
    'edit_social_',
    'edit_images_',
    'edit_menu_',
    'edit_delivery_',
    'edit_locations_',
    'edit_hours_',
    'edit_halal_',
    'edit_values_',
    'edit_additional_categories_',
    'edit_additional_categories_for_',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    localStorage.clear();

    mockCategoriesOrder.mockResolvedValue({ data: [], error: null });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({
      eq: mockProviderCommunityServicesSelectEq,
    });

    mockProviderCommunityServicesDeleteEq.mockResolvedValue({ error: null });
    mockProviderCommunityServicesDelete.mockReturnValue({
      eq: mockProviderCommunityServicesDeleteEq,
    });

    mockProviderUpdateEq.mockResolvedValue({ error: null });
    mockProviderUpdate.mockReturnValue({ eq: mockProviderUpdateEq });

    // #254: the owner save path now writes the junction after the providers
    // update — delete().eq(pid).neq(primary) then insert(rows).
    mockPcDeleteNeq.mockResolvedValue({ error: null });
    mockPcDeleteEq.mockReturnValue(
      Object.assign(Promise.resolve({ error: null }), { neq: mockPcDeleteNeq }),
    );
    mockPcDelete.mockReturnValue({ eq: mockPcDeleteEq });
    mockPcInsert.mockResolvedValue({ error: null });
  });

  it('[post-fix PASSES] admin onSubmitForm clears all localStorage draft keys after success', async () => {
    // Seed stale drafts
    localStorage.setItem(
      `admin_edit_inline_${pid}`,
      JSON.stringify({ providerName: 'Stale Name' }),
    );
    localStorage.setItem(`admin_edit_category_${pid}`, 'stale-cat');
    localStorage.setItem(`admin_edit_images_${pid}`, '{"urls":["stale.jpg"]}');

    const onSubmitForm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        onSubmitForm={onSubmitForm}
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalled();
    });

    // All draft keys should be cleared after successful save
    for (const key of draftKeys) {
      expect(localStorage.getItem(`admin_${key}${pid}`)).toBeNull();
    }
  });

  it('[post-fix PASSES] owner save clears all localStorage draft keys after success', async () => {
    // Set up engagement mocks for owner save path
    mockEngagementsSelectEq.mockResolvedValue({ data: [], error: null });
    mockEngagementsSelect.mockReturnValue({ eq: mockEngagementsSelectEq });
    mockEngagementsDeleteEq.mockResolvedValue({ error: null });
    mockEngagementsDelete.mockReturnValue({ eq: mockEngagementsDeleteEq });

    // Seed stale drafts (unprefixed for owner)
    localStorage.setItem(`edit_inline_${pid}`, JSON.stringify({ providerName: 'Stale Name' }));
    localStorage.setItem(`edit_category_${pid}`, 'stale-cat');

    render(<ProviderEditForm enableLocalStorage={true} provider={baseProvider} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockProviderUpdate).toHaveBeenCalled();
    });

    // All draft keys should be cleared after successful save
    for (const key of draftKeys) {
      expect(localStorage.getItem(`${key}${pid}`)).toBeNull();
    }
  });
});

describe('ProviderEditForm reviewStatus dead path (#548, AC 18)', () => {
  const pid = baseProvider.provider_id;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    localStorage.clear();

    mockCategoriesOrder.mockResolvedValue({ data: [], error: null });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({
      eq: mockProviderCommunityServicesSelectEq,
    });
  });

  it('submitted form data carries no reviewStatus — status is set by the review endpoint only', async () => {
    const onSubmitForm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        enableLocalStorage={false}
        onSubmitForm={onSubmitForm}
        provider={{ ...baseProvider, review_status: 'pending' } as Provider}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalled();
    });

    const submitted = onSubmitForm.mock.calls[0][0] as Record<string, unknown>;
    expect('reviewStatus' in submitted).toBe(false);
  });

  it('a seeded reviewStatus in the halal draft does not re-enter form state', () => {
    // Pre-cleanup drafts may still contain the dead key — it must be ignored
    // rather than rehydrated, or the draft would resurrect the second write
    // path this issue removed.
    localStorage.setItem(
      `admin_edit_halal_${pid}`,
      JSON.stringify({ noAlcohol: true, reviewStatus: 'approved' }),
    );

    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={baseProvider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />,
    );

    // Navigate away to a sub-page — this flushes the inline draft to
    // localStorage, which is the exact payload shape we can inspect.
    fireEvent.click(screen.getByText('Halal Check'));

    const stored = localStorage.getItem(`admin_edit_inline_${pid}`);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string) as Record<string, unknown>;
    expect('reviewStatus' in parsed).toBe(false);
  });

  it('the inline draft payload never contains reviewStatus', () => {
    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        provider={{ ...baseProvider, review_status: 'rejected' } as Provider}
        subPageBaseUrl={`/dashboard/providers/${pid}/edit`}
      />,
    );

    fireEvent.click(screen.getByText('Halal Check'));

    const parsed = JSON.parse(localStorage.getItem(`admin_edit_inline_${pid}`) as string) as Record<
      string,
      unknown
    >;
    expect('reviewStatus' in parsed).toBe(false);
  });
});

// #254 Seam 4: secondary categories ride the same form state, the same
// {pfx}edit_* localStorage draft protocol, and both save paths.
describe('ProviderEditForm secondary categories (#254)', () => {
  const pid = baseProvider.provider_id;

  const catFood = {
    category_id: 'cat-a',
    name_de: 'Essen & Trinken',
    name_en: 'Food & Drinks',
    applicable_section: 'food',
  };
  const catTurk = {
    category_id: 'cat-b',
    name_de: 'Türkisch',
    name_en: 'Turkish',
    applicable_section: 'food',
  };
  const catArab = {
    category_id: 'cat-c',
    name_de: 'Arabisch',
    name_en: 'Arabic',
    applicable_section: 'food',
  };
  const catAll = {
    category_id: 'cat-all',
    name_de: 'Gemeinschaft & Spenden',
    name_en: 'Community & Donations',
    applicable_section: 'all',
  };

  // Provider with a junction embed: cat-a primary, cat-b + cat-c secondary.
  const providerWithJunction = {
    ...baseProvider,
    category_id: 'cat-a',
    provider_categories: [
      { category_id: 'cat-a' },
      { category_id: 'cat-b' },
      { category_id: 'cat-c' },
    ],
  } as unknown as Provider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    localStorage.clear();

    mockCategoriesOrder.mockResolvedValue({
      data: [catFood, catTurk, catArab, catAll],
      error: null,
    });
    mockCategoriesSelect.mockReturnValue({ order: mockCategoriesOrder });

    mockProviderCommunityServicesSelectEq.mockResolvedValue({ data: [], error: null });
    mockProviderCommunityServicesSelect.mockReturnValue({
      eq: mockProviderCommunityServicesSelectEq,
    });

    mockProviderUpdateEq.mockResolvedValue({ error: null });
    mockProviderUpdate.mockReturnValue({ eq: mockProviderUpdateEq });

    mockEngagementsSelectEq.mockResolvedValue({ data: [], error: null });
    mockEngagementsSelect.mockReturnValue({ eq: mockEngagementsSelectEq });
    mockEngagementsDeleteEq.mockResolvedValue({ error: null });
    mockEngagementsDelete.mockReturnValue({ eq: mockEngagementsDeleteEq });
    mockEngagementsInsert.mockResolvedValue({ error: null });

    // provider_categories chain: delete().eq(pid) -> thenable, optionally
    // .neq(primary) -> thenable. insert(rows) -> resolves {error:null}.
    mockPcDeleteNeq.mockResolvedValue({ error: null });
    mockPcDeleteEq.mockReturnValue(
      Object.assign(Promise.resolve({ error: null }), { neq: mockPcDeleteNeq }),
    );
    mockPcDelete.mockReturnValue({ eq: mockPcDeleteEq });
    mockPcInsert.mockResolvedValue({ error: null });
  });

  it('hydrates secondary categories from junction rows minus the primary (case 47/51)', async () => {
    const onSubmitForm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={false}
        onSubmitForm={onSubmitForm}
        provider={providerWithJunction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({ secondaryCategoryIds: ['cat-b', 'cat-c'] }),
      );
    });
  });

  it.each(['', 'admin_'])(
    'the %s draft key overrides the hydrated junction value (case 48)',
    async (prefix) => {
      localStorage.setItem(`${prefix}edit_additional_categories_${pid}`, '["cat-x","cat-y"]');

      const onSubmitForm = vi.fn().mockResolvedValue(undefined);
      render(
        <ProviderEditForm
          cancelUrl="/p/test-id"
          enableLocalStorage={true}
          localStoragePrefix={prefix}
          onSubmitForm={onSubmitForm}
          provider={providerWithJunction}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(onSubmitForm).toHaveBeenCalledWith(
          expect.objectContaining({ secondaryCategoryIds: ['cat-x', 'cat-y'] }),
        );
      });
    },
  );

  it('picking a different primary clears the secondary selection and toasts (case 49)', async () => {
    // User navigated to the category sub-page and chose a new primary; the
    // draft is waiting in localStorage when the form comes back into focus.
    localStorage.setItem(`edit_category_${pid}`, 'cat-new');

    const onSubmitForm = vi.fn().mockResolvedValue(undefined);
    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={true}
        onSubmitForm={onSubmitForm}
        provider={providerWithJunction}
      />,
    );

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith('Additional categories were reset');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-new', secondaryCategoryIds: [] }),
      );
    });
  });

  it('a secondary draft picked under the OLD primary does not survive the primary change (reverse visit order)', async () => {
    // The sub-pages were visited in reverse: additional-categories first
    // (draft tagged with the primary it was picked under), then category.
    // The draft predates the new primary, so the reset must hold and warn.
    localStorage.setItem(`edit_additional_categories_${pid}`, '["cat-b"]');
    localStorage.setItem(`edit_additional_categories_for_${pid}`, 'cat-a');
    localStorage.setItem(`edit_category_${pid}`, 'cat-new');

    const onSubmitForm = vi.fn().mockResolvedValue(undefined);
    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={true}
        onSubmitForm={onSubmitForm}
        provider={providerWithJunction}
      />,
    );

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith('Additional categories were reset');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-new', secondaryCategoryIds: [] }),
      );
    });
    // The stale draft keys are dropped so a later sync cannot resurrect them.
    expect(localStorage.getItem(`edit_additional_categories_${pid}`)).toBeNull();
    expect(localStorage.getItem(`edit_additional_categories_for_${pid}`)).toBeNull();
  });

  it('a secondary draft picked under the new primary survives the primary change', async () => {
    // Drafts written in order by the sub-pages: category first, then the
    // secondaries chosen under that new primary (the companion key records
    // which primary the picker was scoped to).
    localStorage.setItem(`edit_category_${pid}`, 'cat-new');
    localStorage.setItem(`edit_additional_categories_${pid}`, '["cat-b"]');
    localStorage.setItem(`edit_additional_categories_for_${pid}`, 'cat-new');

    const onSubmitForm = vi.fn().mockResolvedValue(undefined);
    render(
      <ProviderEditForm
        cancelUrl="/p/test-id"
        enableLocalStorage={true}
        onSubmitForm={onSubmitForm}
        provider={providerWithJunction}
      />,
    );

    await waitFor(() => {
      // The hydrated secondaries were NOT for the draft primary — but the
      // draft secondary set was, so no reset toast.
      expect(mockToastInfo).not.toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-new', secondaryCategoryIds: ['cat-b'] }),
      );
    });
  });

  it('owner save routes the junction replace through owner_update_provider_categories (case 50)', async () => {
    localStorage.setItem(`edit_additional_categories_${pid}`, '["cat-b"]');
    localStorage.setItem(`edit_additional_categories_for_${pid}`, 'cat-a');

    render(<ProviderEditForm enableLocalStorage={true} provider={providerWithJunction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });

    // providers.category_id first — its sync trigger resets the junction —
    // then ONE rpc replaces the secondary set atomically. No separate
    // PostgREST delete+insert on provider_categories: that pair was the
    // non-atomic write that left zero secondaries on a rejected insert.
    expect(mockProviderUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockRpc.mock.invocationCallOrder[0],
    );
    expect(mockRpc).toHaveBeenCalledWith('owner_update_provider_categories', {
      p_provider_id: pid,
      p_secondary_category_ids: ['cat-b'],
    });
    expect(mockPcDelete).not.toHaveBeenCalled();
    expect(mockPcInsert).not.toHaveBeenCalled();
  });

  it('clears the additional-categories draft key after a successful save (case 52)', async () => {
    localStorage.setItem(`admin_edit_additional_categories_${pid}`, '["cat-b"]');

    const onSubmitForm = vi.fn().mockResolvedValue(undefined);
    render(
      <ProviderEditForm
        enableLocalStorage={true}
        localStoragePrefix="admin_"
        onSubmitForm={onSubmitForm}
        provider={providerWithJunction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalled();
    });
    expect(localStorage.getItem(`admin_edit_additional_categories_${pid}`)).toBeNull();
  });

  it('renders no secondary entry point when the primary is in the all section (case 53)', async () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={
          {
            ...baseProvider,
            category_id: 'cat-all',
            provider_categories: [{ category_id: 'cat-all' }],
          } as unknown as Provider
        }
      />,
    );

    // Wait for categories to load so the row would have had its chance.
    await waitFor(() => {
      expect(screen.getByText('Community & Donations')).toBeInTheDocument();
    });
    expect(screen.queryByText('Additional categories')).not.toBeInTheDocument();
  });

  it('renders the secondary entry point for a food primary and navigates to the sub-page', async () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        provider={providerWithJunction}
        subPageBaseUrl="/dashboard/providers/x/edit"
      />,
    );

    const row = await screen.findByText('Additional categories');
    expect(row).toBeInTheDocument();
    // Shows the hydrated secondary names
    await waitFor(() => {
      expect(screen.getByText('Turkish, Arabic')).toBeInTheDocument();
    });

    fireEvent.click(row.closest('div[class*="cursor-pointer"]') as HTMLElement);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/providers/x/edit/additional-categories');
  });

  // #254 review MEDIUM 2: PostgREST passes the constraint text through in
  // the 23514 payload, so each rule violation maps to a specific toast.
  it.each([
    ['provider p has 6 categories, maximum is 5', 'You can add up to 4 additional categories.'],
    [
      "secondary categories cannot be 'all'-section categories: Gemeinschaft & Spenden",
      'This category applies to all sections and cannot be an additional category.',
    ],
    [
      'secondary categories must be in section food like the primary: Kleidung & Mode',
      'Additional categories must belong to the same section as the primary category.',
    ],
    [
      'provider p primary category x missing from provider_categories',
      'The selected categories could not be saved.',
    ],
  ])('maps the 23514 "%s" to a specific toast', async (message, expectedToast) => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '23514', message } });
    localStorage.setItem(`edit_additional_categories_${pid}`, '["cat-b"]');
    localStorage.setItem(`edit_additional_categories_for_${pid}`, 'cat-a');

    render(<ProviderEditForm enableLocalStorage={true} provider={providerWithJunction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(expectedToast);
    });
    expect(mockToastError).not.toHaveBeenCalledWith('Error updating provider');
  });
});
