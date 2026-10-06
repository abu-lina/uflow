import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getProviderById } from '@/services/providers';
import { createSupabaseCallerClient } from '@/lib/supabase/server';
import { getCommunityServicesForProvider } from '@/services/communityServices';
import { ProviderDetailPageClient } from './ProviderDetailPageClient';

// Issue 533 — /p/<id> used to render a not-found page under HTTP 200 with
// `index, follow`: the route never called notFound() server-side (the only
// notFound() was inside the client component, which can set neither the
// status nor the robots meta). Resolve the provider once per request and
// share the result between generateMetadata and the page — React `cache`
// dedupes it, getProviderById fans out to several queries.
//
// Issue 547 — the fetch runs as the CALLER, not anon: the providers SELECT
// policy (provider_is_visible) grants creators/owners/admins their
// non-approved rows, and the middleware guard applies the same predicate to
// the same identity. Anon and unrelated users get a row-less result and
// notFound() — indistinguishable from a nonexistent id.
const getProvider = cache(async (id: string) =>
  getProviderById(id, await createSupabaseCallerClient()),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const provider = await getProvider(id);

  // Unknown provider: the page 404s, so don't advertise an indexable route.
  // Without this the root metadata's `index, follow` ships on a not-found body.
  // Non-approved rows render only for the creator/owner/admin (#547) and
  // must stay out of the index for exactly the same reason.
  if (!provider) {
    return {
      title: { absolute: 'Provider not found | Ummah Flow' },
      robots: { index: false, follow: false },
    };
  }

  if (provider.review_status !== 'approved') {
    return {
      title: { absolute: 'Listing under review | Ummah Flow' },
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
