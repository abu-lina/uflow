'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { ProviderEditForm, type ProviderEditFormData } from '@/components/providers/ProviderEditForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { RejectModal } from '@/features/admin/components/RejectModal';
import { DeleteProviderModal } from '@/features/admin/components/DeleteProviderModal';
import { useLanguage } from '@/providers/LanguageProvider';
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
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; formData: ProviderEditFormData | null; isLoading: boolean }>({
    isOpen: false, formData: null, isLoading: false,
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; isLoading: boolean }>({
    isOpen: false, isLoading: false,
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

  const saveProviderEdits = useCallback(async (formData: ProviderEditFormData) => {
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
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((u: unknown) => typeof u === 'string')) {
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
      addressStreet: formData.isOnlineBusiness ? null : (formData.street || null),
      addressZip: formData.isOnlineBusiness ? null : (formData.zipCode || null),
      addressCity: formData.isOnlineBusiness ? null : (formData.city || null),
      addressCountry: formData.isOnlineBusiness ? null : (formData.country || null),
      contactEmail: formData.email || null,
      contactPhone: formData.phone || null,
      socialWebsite: formData.website || null,
      socialInstagram: formData.instagram || null,
      communityServiceIds: formData.selectedCommunityServiceIds,

      // New fields
      menuItems: formData.menuItems,
      deliveryLinks: formData.deliveryLinks,
      locations: formData.locations,
      openingHours: formData.openingHours || null,
      verificationMethod: formData.verificationMethod,
      hasCertificate: formData.hasCertificate,
      certificateUrl: formData.certificateUrl || null,
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
      reviewStatus: formData.reviewStatus,
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
        toast.error(errorData.error || t('editProvider.errorUpdating'));
      }
      throw new Error(errorData.error || 'Failed to save');
    }

    const responseData = await response.json() as {
      data?: {
        updated_at?: string;
      };
    };

    // If reviewStatus was changed, sync it via the review-provider API
    if (formData.reviewStatus && formData.reviewStatus !== provider?.review_status) {
      const reviewResponse = await fetch('/api/admin/review-provider', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          reviewStatus: formData.reviewStatus,
          expectedUpdatedAt: responseData.data?.updated_at,
        }),
      });

      if (!reviewResponse.ok) {
        console.error('Failed to sync review status');
      }
    }

    return {
      updatedAt: responseData.data?.updated_at,
    };
  }, [providerId, provider?.review_status, t]);

  const reviewProvider = useCallback(async (reviewStatus: 'approved' | 'rejected', expectedUpdatedAt?: string, reviewFeedback?: string) => {
    const response = await fetch('/api/admin/review-provider', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        reviewStatus,
        expectedUpdatedAt,
        ...(reviewFeedback ? { reviewFeedback } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = response.status === 409
        ? 'This provider was modified by another reviewer. Please refresh.'
        : response.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : errorData.error || `Failed to ${reviewStatus === 'approved' ? 'approve' : 'reject'} provider.`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [providerId]);

  const finishModerationAction = useCallback(async (
    formData: ProviderEditFormData,
    reviewStatus: 'approved' | 'rejected',
    reviewFeedback?: string
  ) => {
    const { updatedAt } = await saveProviderEdits(formData);
    await reviewProvider(reviewStatus, updatedAt, reviewFeedback);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] }),
      queryClient.invalidateQueries({ queryKey: ['providers'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
    ]);

    toast.success(reviewStatus === 'approved' ? 'Provider approved successfully' : 'Provider rejected');
    router.push(`/providers`);
  }, [saveProviderEdits, reviewProvider, queryClient, providerId, router]);

  const handleRejectClick = useCallback(async (formData: ProviderEditFormData) => {
    setRejectModal({ isOpen: true, formData, isLoading: false });
  }, []);

  const handleRejectConfirm = useCallback(async (feedback: string) => {
    if (!rejectModal.formData) return;
    setRejectModal(prev => ({ ...prev, isLoading: true }));
    try {
      await finishModerationAction(rejectModal.formData, 'rejected', feedback);
    } catch {
      setRejectModal(prev => ({ ...prev, isLoading: false }));
    }
  }, [rejectModal.formData, finishModerationAction]);

  const handleRejectClose = useCallback(() => {
    if (!rejectModal.isLoading) {
      setRejectModal({ isOpen: false, formData: null, isLoading: false });
    }
  }, [rejectModal.isLoading]);

  const handleDeleteClick = useCallback(() => {
    setDeleteModal({ isOpen: true, isLoading: false });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to delete provider');
        setDeleteModal(prev => ({ ...prev, isLoading: false }));
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
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  }, [providerId, queryClient, router]);

  const handleDeleteClose = useCallback(() => {
    if (!deleteModal.isLoading) {
      setDeleteModal({ isOpen: false, isLoading: false });
    }
  }, [deleteModal.isLoading]);

  const handleApproveConfirm = useCallback(async (formData: ProviderEditFormData) => {
    await finishModerationAction(formData, 'approved');
  }, [finishModerationAction]);

  if (loading) {
    return (
      <div className="flex h-screen-fix flex-col">
        <PageHeader
          title={t('editProvider.title')}
          variant="back-and-title"
          onBack={() => router.back()}
        />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="flex h-screen-fix flex-col">
        <PageHeader
          title={t('editProvider.title')}
          variant="back-and-title"
          onBack={() => router.back()}
        />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
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
    <div className="flex h-screen-fix flex-col">
      <PageHeader
        title={t('editProvider.title')}
        variant="back-and-title"
        onBack={() => router.back()}
      />
      <main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] md:pt-[calc(env(safe-area-inset-top)+80px)] px-6 pb-4">
        <div className="w-full md:max-w-2xl md:mx-auto">
        <ProviderEditForm
          enableLocalStorage={true}
          localStoragePrefix="admin_"
          provider={provider}
          reviewFooterActions={{
            reject: {
              label: 'Reject',
              variant: 'danger',
              onClick: handleRejectClick,
              'aria-label': 'Reject provider and save changes',
            },
            approve: {
              label: 'Approve',
              variant: 'success',
              onClick: handleApproveConfirm,
              'aria-label': 'Approve provider and save changes',
            },
          }}
          subPageBaseUrl={`/dashboard/providers/${providerId}/edit`}
          onSubmitForm={async (formData) => { 
            await saveProviderEdits(formData);
            await queryClient.invalidateQueries({ queryKey: ['provider', providerId] });
            router.push(`/providers/${providerId}`);
          }}
        />

        {/* Delete Provider Section */}
        <div className="mt-8 border-t border-neutral-200 pt-6 mb-[calc(5rem+env(safe-area-inset-bottom))]">
          <button
            aria-label="Delete provider permanently"
            className="w-full rounded-lg bg-danger px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-danger-dark"
            type="button"
            onClick={handleDeleteClick}
          >
            Delete Provider
          </button>
          <p className="mt-2 text-xs text-content-muted text-center">
            This action cannot be undone. All data associated with this provider will be permanently removed.
          </p>
        </div>

        </div>

        <RejectModal
          isLoading={rejectModal.isLoading}
          isOpen={rejectModal.isOpen}
          providerName={provider.provider_name}
          onClose={handleRejectClose}
          onConfirm={handleRejectConfirm}
        />
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
