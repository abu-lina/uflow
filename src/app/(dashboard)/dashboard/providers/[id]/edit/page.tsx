'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import {
  ProviderEditForm,
  type ProviderEditFormData,
} from '@/features/providers/pages/ProviderEditForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { DeleteProviderModal } from '@/features/admin/components/DeleteProviderModal';
import { useLanguage } from '@/providers/LanguageProvider';
import { normalizeWebsiteUrl } from '@/utils/navigationUtils';
import type { Provider } from '@/services/providers';

interface AdminProviderEditPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminProviderEditPage({ params }: AdminProviderEditPageProps) {
  const { id: providerId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; isLoading: boolean }>({
    isOpen: false,
    isLoading: false,
  });

  useEffect(() => {
    async function loadProvider() {
      try {
        // Fetch provider via admin API to bypass RLS for non-approved providers
        const response = await fetch(`/api/admin/providers/${providerId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Provider not found');
          } else if (response.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to load provider');
          }
          return;
        }
        const data = await response.json();
        setProvider(data.data || data);
      } catch {
        setError('Failed to load provider');
      } finally {
        setLoading(false);
      }
    }

    loadProvider();
  }, [providerId]);

  const saveProviderEdits = useCallback(
    async (formData: ProviderEditFormData) => {
      // Plan 073 M1: Normalise providerImages to avoid contract drift
      // Empty/invalid → omit field (undefined = no DB change in service layer)
      // Valid {urls: string[]} → send as-is
      // Legacy array → wrap in {urls: [...]}
      const normaliseProviderImages = (rawImages: string): string | undefined => {
        // Case 1: Empty/absent → omit field entirely
        if (!rawImages || rawImages === '[]' || rawImages === 'null' || rawImages.trim() === '') {
          return undefined;
        }

        try {
          const parsed = JSON.parse(rawImages);

          // Case 2: Already valid {urls: string[]} with non-empty array
          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            Array.isArray(parsed.urls) &&
            parsed.urls.length > 0 &&
            parsed.urls.every((u: unknown) => typeof u === 'string')
          ) {
            return rawImages; // Send as-is
          }

          // Case 3: Legacy array format → wrap in {urls: [...]}
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((u: unknown) => typeof u === 'string')
          ) {
            return JSON.stringify({ urls: parsed });
          }

          // Case 4: Invalid structure → omit
          return undefined;
        } catch {
          // Case 5: Malformed JSON → omit
          return undefined;
        }
      };

      const normalisedImages = normaliseProviderImages(formData.images);

      const requestBody: Record<string, unknown> = {
        providerId,
        providerName: formData.providerName,
        providerDescription: formData.providerDescription || null,
        categoryId: formData.categoryId || undefined,
        listingType: formData.listingType,
        addressStreet: formData.isOnlineBusiness ? null : formData.street || null,
        addressZip: formData.isOnlineBusiness ? null : formData.zipCode || null,
        addressCity: formData.isOnlineBusiness ? null : formData.city || null,
        addressCountry: formData.isOnlineBusiness ? null : formData.country || null,
        contactEmail: formData.email || null,
        contactPhone: formData.phone || null,
        socialWebsite: formData.website || null,
        socialInstagram: formData.instagram || null,
        communityServiceIds:
          formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0
            ? formData.selectedCommunityServiceIds
            : undefined,

        // New fields
        menuItems:
          formData.menuItems && formData.menuItems.length > 0 ? formData.menuItems : undefined,
        deliveryLinks:
          formData.deliveryLinks && formData.deliveryLinks.length > 0
            ? formData.deliveryLinks
            : undefined,
        locations:
          formData.locations && formData.locations.length > 0 ? formData.locations : undefined,
        openingHours: formData.openingHours || null,
        verificationMethod: formData.verificationMethod,
        hasCertificate: formData.hasCertificate,
        certificateUrl: formData.certificateUrl
          ? normalizeWebsiteUrl(formData.certificateUrl)
          : null,
        muslimOwned: formData.muslimOwned,
        hasPrayerSpace: formData.hasPrayerSpace,
        familyFriendly: formData.familyFriendly,
        womenFriendly: formData.womenFriendly,
        childrenFriendly: formData.childrenFriendly,
        makesDonations: formData.makesDonations,
        hasParking: formData.hasParking,
        economicSolidarity: formData.economicSolidarity,
        noAlcohol: formData.noAlcohol,
        noPork: formData.noPork,
        noGambling: formData.noGambling,
        showAddress: formData.isOnlineBusiness ? false : formData.showAddress,
      };

      // Only include providerImages if normalisation returned a value
      if (normalisedImages !== undefined) {
        requestBody.providerImages = normalisedImages;
      }

      const response = await fetch('/api/admin/edit-provider', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          toast.error('This provider was modified by another user. Please refresh.');
        } else {
          toast.error(errorData.details || errorData.error || t('editProvider.errorUpdating'));
        }
        throw new Error(errorData.error || 'Failed to save');
      }

      const responseData = (await response.json()) as {
        data?: {
          updated_at?: string;
        };
      };

      return {
        updatedAt: responseData.data?.updated_at,
      };
    },
    [providerId, t],
  );

  const handleDeleteClick = useCallback(() => {
    setDeleteModal({ isOpen: true, isLoading: false });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to delete provider');
        setDeleteModal((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['provider', providerId] }),
        queryClient.invalidateQueries({ queryKey: ['providers'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
      ]);

      toast.success('Provider deleted successfully');
      router.push('/providers');
    } catch {
      toast.error('Failed to delete provider');
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  }, [providerId, queryClient, router]);

  const handleDeleteClose = useCallback(() => {
    if (!deleteModal.isLoading) {
      setDeleteModal({ isOpen: false, isLoading: false });
    }
  }, [deleteModal.isLoading]);

  if (loading) {
    return (
      <div className="h-screen-fix flex flex-col">
        <div className="md:hidden">
          <PageHeader title={t('editProvider.title')} variant="back-and-title" onBack="/providers" />
          <HeaderSpacer />
        </div>
        <main className="flex flex-1 items-center justify-center md:pt-[var(--desktop-header-height,153px)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="h-screen-fix flex flex-col">
        <div className="md:hidden">
          <PageHeader title={t('editProvider.title')} variant="back-and-title" onBack="/providers" />
          <HeaderSpacer />
        </div>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 md:pt-[var(--desktop-header-height,153px)]">
          <p className="text-center text-gray-500">{error || 'Provider not found'}</p>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-white"
            onClick={() => router.push('/providers')}
          >
            {t('editProvider.back')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader title={t('editProvider.title')} variant="back-and-title" onBack={`/providers`} />
        <HeaderSpacer />
      </div>
      <main className="flex flex-1 flex-col px-6 pb-4 overflow-y-auto md:pt-[calc(var(--desktop-header-height,153px)+16px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">
          <ProviderEditForm
            cancelUrl={`/providers/${providerId}`}
            enableLocalStorage={true}
            localStoragePrefix="admin_"
            provider={provider}
            subPageBaseUrl={`/dashboard/providers/${providerId}/edit`}
            onSubmitForm={async (formData) => {
              await saveProviderEdits(formData);
              await queryClient.invalidateQueries({ queryKey: ['provider', providerId] });
              router.push(`/providers/${providerId}`);
            }}
          />

          {/* Delete Provider Section */}
          <div className="mb-[calc(5rem+env(safe-area-inset-bottom))] mt-8 border-t border-neutral-200 pt-6">
            <button
              aria-label="Delete provider permanently"
              className="w-full rounded-lg bg-danger px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-danger-dark"
              type="button"
              onClick={handleDeleteClick}
            >
              Delete Provider
            </button>
            <p className="mt-2 text-center text-xs text-content-muted">
              This action cannot be undone. All data associated with this provider will be
              permanently removed.
            </p>
          </div>
        </div>

        <DeleteProviderModal
          isLoading={deleteModal.isLoading}
          isOpen={deleteModal.isOpen}
          providerName={provider.provider_name}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
        />
      </main>
    </div>
  );
}
