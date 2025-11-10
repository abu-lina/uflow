import { getProviderById } from '@/services/providers';
import { ProviderDetailPageClient } from './ProviderDetailPageClient';

/**
 * Server component that fetches initial data and passes it to client component
 * 
 * Benefits:
 * - SSR for initial load (SEO, fast first paint)
 * - Client-side caching for subsequent navigations (instant)
 * - Prefetching support for hover/optimistic loading
 */
export default async function ProviderDetailPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  
  // Fetch initial data on server (for SSR)
  // Client component will use React Query cache for subsequent navigations
  const provider = await getProviderById(provider_id);

  return <ProviderDetailPageClient initialData={provider} providerId={provider_id} />;
}
