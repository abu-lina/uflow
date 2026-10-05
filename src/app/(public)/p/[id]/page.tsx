import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getProviderById } from '@/services/providers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCommunityServicesForProvider } from '@/services/communityServices';
import { ProviderDetailPageClient } from './ProviderDetailPageClient';

// Issue 533 — /p/<id> used to render a not-found page under HTTP 200 with
// `index, follow`: the route never called notFound() server-side (the only
// notFound() was inside the client component, which can set neither the
// status nor the robots meta). Resolve the provider once per request and
// share the result between generateMetadata and the page — React `cache`
// dedupes it, getProviderById fans out to several queries.
const getProvider = cache((id: string) => getProviderById(id, createSupabaseServerClient()));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const provider = await getProvider(id);

  // Unknown provider: the page 404s, so don't advertise an indexable route.
  // Without this the root metadata's `index, follow` ships on a not-found body.
  if (!provider) {
    return {
      title: { absolute: 'Provider not found | Ummah Flow' },
      robots: { index: false, follow: false },
    };
  }

  return {};
}

/**
 * Server component that fetches initial data and passes it to client component
 *
 * Benefits:
 * - SSR for initial load (SEO, fast first paint)
 * - Client-side caching for subsequent navigations (instant)
 * - Prefetching support for hover/optimistic loading
 * - Parallel data fetching for better performance
 */
export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch provider and community services in parallel for better performance
  // This eliminates the client-side waterfall and improves Time to Interactive
  const [provider, communityServices] = await Promise.all([
    getProvider(id),
    getCommunityServicesForProvider(id).catch(() => []), // Gracefully handle errors
  ]);

  if (!provider) {
    notFound();
  }

  return (
    <ProviderDetailPageClient
      key={id}
      initialCommunityServices={communityServices}
      initialData={provider}
      providerId={id}
    />
  );
}
