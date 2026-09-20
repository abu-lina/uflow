'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';

import { EnrichmentReviewPanel } from '@/features/admin/components/EnrichmentReviewPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { FooterAction } from '@/components/ui/FooterAction';

export default function EditEnrichmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader title="Enrichment Review" variant="back-and-title" onBack={() => router.back()} />
        <HeaderSpacer />
      </div>
      <main className="flex flex-1 flex-col px-6 pb-4 overflow-y-auto md:pt-[calc(var(--desktop-header-height,153px)+16px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">
          <EnrichmentReviewPanel providerId={id} />
        </div>
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
