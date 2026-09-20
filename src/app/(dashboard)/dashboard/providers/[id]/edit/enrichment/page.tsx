'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';

import { EnrichmentReviewPanel } from '@/features/admin/components/EnrichmentReviewPanel';
import { EditSubPageLayout } from '@/components/layout/EditSubPageLayout';

export default function EditEnrichmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <EditSubPageLayout
      primaryButton={{
        label: 'Back to Edit',
        icon: 'material-symbols:arrow-back',
        onClick: () => router.back(),
      }}
      title="Enrichment Review"
    >
      <EnrichmentReviewPanel providerId={id} />
    </EditSubPageLayout>
  );
}
