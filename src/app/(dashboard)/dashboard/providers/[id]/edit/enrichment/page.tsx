'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';

import { EnrichmentReviewPanel } from '@/features/admin/components/EnrichmentReviewPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';

export default function EditEnrichmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Enrichment Review" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-4 overflow-y-auto">
        <EnrichmentReviewPanel providerId={id} />
      </main>
      <FooterAction
        primaryButton={{
          label: 'Back to Edit',
          icon: 'material-symbols:arrow-back',
          onClick: () => router.back(),
        }}
        secondaryButton={{
          icon: 'material-symbols:close',
          onClick: () => router.back(),
          'aria-label': 'Close',
        }}
      />
    </div>
  );
}
