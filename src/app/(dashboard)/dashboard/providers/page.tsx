'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProviderReviewCard, type PendingProvider } from '@/components/admin/ProviderReviewCard';
import { ProviderCardSkeleton } from '@/components/admin/ProviderCardSkeleton';
import { StatusFilter } from '@/components/admin/StatusFilter';
import { toast } from 'sonner';

interface PendingProvidersResponse {
  providers: PendingProvider[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function AdminProvidersPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'needs_revision'>('pending');

  // Use React Query for caching and offline support
  const {
    data: queryData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<PendingProvidersResponse, Error>({
    queryKey: ['admin-pending-providers', selectedStatus],
    queryFn: async () => {
      const response = await fetch(`/api/admin/pending-providers?status=${selectedStatus}`);
      
      // Handle offline state
      if (!navigator.onLine) {
        throw new Error('You are offline. Please check your internet connection.');
      }

      const responseData = await response.json() as { data?: PendingProvidersResponse; error?: string };

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to fetch providers');
      }

      return responseData.data || { providers: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - stays in cache
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: (failureCount, error) => {
      // Don't retry if offline or 401/403 errors
      if (!navigator.onLine) return false;
      if (error instanceof Error && error.message.includes('Unauthorized')) return false;
      if (error instanceof Error && error.message.includes('Forbidden')) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const providers: PendingProvider[] = queryData?.providers ?? [];
  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const handleReview = async (providerId: string, status: 'approved' | 'rejected' | 'needs_revision', feedback?: string) => {
    // Optimistic update: remove provider from list immediately
    queryClient.setQueryData<PendingProvidersResponse>(['admin-pending-providers', selectedStatus], (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        providers: oldData.providers.filter((p: PendingProvider) => p.provider_id !== providerId),
      };
    });

    try {
      const response = await fetch('/api/admin/review-provider', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          reviewStatus: status,
          reviewFeedback: feedback,
        }),
      });

      const responseData = await response.json() as { 
        data?: { 
          provider_id?: string;
          provider_name?: string;
          review_status?: string;
          review_feedback?: string | null;
        }; 
        error?: string 
      };

      if (!response.ok) {
        // Revert optimistic update on error
        await refetch();
        // Use generic error message to avoid leaking internal details
        const errorMessage = response.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : response.status === 413
          ? 'Request too large. Please reduce the feedback length.'
          : responseData.error || 'Failed to update review status. Please try again.';
        throw new Error(errorMessage);
      }

      // Refetch to ensure consistency
      await refetch();
      
      // Invalidate provider count cache when a provider is approved/rejected
      // This ensures the city stage updates immediately
      if (status === 'approved' || status === 'rejected') {
        // Get the provider's city from the providers list before it's removed
        const provider = providers.find(p => p.provider_id === providerId);
        if (provider?.address_city) {
          // #region agent log
          console.log('[DEBUG] Invalidating provider-count cache', { city: provider.address_city, status });
          fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/providers/page.tsx:103',message:'Invalidating provider-count cache',data:{city:provider.address_city,status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          queryClient.invalidateQueries({ queryKey: ['provider-count', provider.address_city] });
        } else {
          // If city not available, invalidate all provider-count queries
          queryClient.invalidateQueries({ queryKey: ['provider-count'] });
        }
        // Also invalidate general provider queries
        queryClient.invalidateQueries({ queryKey: ['providers'] });
      }
    } catch (err) {
      // Revert optimistic update on error
      await refetch();
      const errorMessage = err instanceof Error ? err.message : 'Failed to update review status';
      toast.error(errorMessage);
      throw err; // Re-throw so component can handle it
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">Provider Review</h1>
          <StatusFilter selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const isOffline = error.includes('offline') || error.includes('internet connection');
    
    return (
      <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Provider Review</h1>
        <StatusFilter selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} />
      </div>
        <div className="rounded-lg border border-danger-soft bg-danger-soft p-4 md:p-6" role="alert">
          <h2 className="text-lg font-semibold text-danger-dark mb-4">Error Loading Providers</h2>
          <p className="text-danger mb-4">{error}</p>
          {isOffline && (
            <p className="text-sm text-danger-dark mb-4">
              The app will automatically retry when your connection is restored.
            </p>
          )}
          <Button
            aria-label="Retry loading providers"
            className="bg-danger-light text-white hover:bg-danger"
            variant="secondary"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Provider Review</h1>
        <StatusFilter selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} />
      </div>

      {providers.length === 0 ? (
        <EmptyState
          description="All providers have been reviewed. Check back later for new submissions."
          title={`No providers ${selectedStatus === 'pending' ? 'pending' : 'needing'} review`}
        />
      ) : (
        <div aria-label={`${providers.length} providers ${selectedStatus === 'pending' ? 'pending' : 'needing'} review`} className="space-y-4 md:space-y-6" role="list">
          {providers.map((provider, index) => (
            <div key={provider.provider_id} role="listitem">
              <ProviderReviewCard
                index={index}
                provider={provider}
                onReview={handleReview}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


