import { Suspense } from 'react';

import { ProvidersContent } from './ProvidersContent';

// Force dynamic rendering to avoid static generation issues with search params
export const dynamic = 'force-dynamic';

export default function ProvidersPage() {
  return (
    <Suspense fallback={null}>
      <ProvidersContent />
    </Suspense>
  );
}
