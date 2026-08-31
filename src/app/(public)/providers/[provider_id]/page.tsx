import { getProviderById } from '@/services/providers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCommunityServicesForProvider } from '@/services/communityServices';
import { ProviderDetailPageClient } from './ProviderDetailPageClient';

/**
 * Server component that fetches initial data and passes it to client component
 * 
 * Benefits:
 * - SSR for initial load (SEO, fast first paint)
 * - Client-side caching for subsequent navigations (instant)
 * - Prefetching support for hover/optimistic loading
 * - Parallel data fetching for better performance
 */
export default async function ProviderDetailPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  
  const serverClient = createSupabaseServerClient();
  // Fetch provider and community services in parallel for better performance
  // This eliminates the client-side waterfall and improves Time to Interactive
  const [provider, communityServices] = await Promise.all([
    getProviderById(provider_id, serverClient),
    getCommunityServicesForProvider(provider_id).catch(() => []), // Gracefully handle errors
  ]);

  return (
    <ProviderDetailPageClient 
      initialCommunityServices={communityServices}
      initialData={provider} 
      providerId={provider_id} 
    />
  );
}
