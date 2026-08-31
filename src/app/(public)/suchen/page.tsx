'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * /suchen — legacy route, permanently redirects to /search.
 * Kept so that existing deep-links, bookmarks, and tests are not broken.
 */
function SuchenRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const section = searchParams.get('section');
    const dest = section ? `/search?section=${section}` : '/search';
    router.replace(dest);
  }, [router, searchParams]);

  return null;
}

export default function SuchenPage() {
  return (
    <Suspense fallback={null}>
      <SuchenRedirect />
    </Suspense>
  );
}
