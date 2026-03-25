'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { ProviderEditForm, type ProviderEditFormData } from '@/components/providers/ProviderEditForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { RejectModal } from '@/features/admin/components/RejectModal';
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

  const saveProviderEdits = async (formData: ProviderEditFormData) => {
    const response = await fetch('/api/admin/edit-provider', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        providerName: formData.providerName,
        providerDescription: formData.providerDescription || null,
        categoryId: formData.categoryId || undefined,
        addressStreet: formData.isOnlineBusiness ? null : (formData.street || null),
        addressZip: formData.isOnlineBusiness ? null : (formData.zipCode || null),
        addressCity: formData.isOnlineBusiness ? null : (formData.city || null),
        addressCountry: formData.isOnlineBusiness ? null : (formData.country || null),
        contactEmail: formData.email || null,
        contactPhone: formData.phone || null,
        socialWebsite: formData.website || null,
        socialInstagram: formData.instagram || null,
        providerImages: formData.images,
        offersIds: formData.selectedOfferIds,
        needsIds: formData.selectedNeedIds,
        communityServiceIds: formData.selectedCommunityServiceIds,
      }),
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

    return {
      updatedAt: responseData.data?.updated_at,
    };
  };

  const reviewProvider = async (reviewStatus: 'approved' | 'rejected', expectedUpdatedAt?: string, reviewFeedback?: string) => {
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
  };

  const finishModerationAction = async (
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
  };

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
  }, [rejectModal.formData]);

  const handleRejectClose = useCallback(() => {
    if (!rejectModal.isLoading) {
      setRejectModal({ isOpen: false, formData: null, isLoading: false });
    }
  }, [rejectModal.isLoading]);

  if (loading) {
    return (
      <div className="flex h-screen-fix flex-col">
        <PageHeader
          title={t('editProvider.title')}
          variant="back-and-title"
          onBack="/providers"
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
          onBack="/providers"
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
        onBack={`/providers`}
      />
      <main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] px-6 pb-4">
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
              onClick: async (formData) => finishModerationAction(formData, 'approved'),
              'aria-label': 'Approve provider and save changes',
            },
          }}
          subPageBaseUrl={`/dashboard/providers/${providerId}/edit`}
        />
        <RejectModal
          isLoading={rejectModal.isLoading}
          isOpen={rejectModal.isOpen}
          providerName={provider.provider_name}
          onClose={handleRejectClose}
          onConfirm={handleRejectConfirm}
        />
      </main>
    </div>
  );
}
