'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { EnrichmentReviewPanel } from '@/features/admin/components/EnrichmentReviewPanel';

export default function EnrichmentPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Enrichment Review" variant="back-and-title" onBack={() => router.push('/dashboard')} />
      <main className="flex-1 overflow-y-auto px-4 py-6 pt-24">
        <EnrichmentReviewPanel />
      </main>
    </div>
  );
}
