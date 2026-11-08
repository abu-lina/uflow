'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { ProviderReviewQueue } from '@/features/admin/components/ProviderReviewQueue';

export default function ProviderReviewPage() {
  const router = useRouter();

  return (
    <div className="h-screen-fix flex flex-col">
      <PageHeader
        title="Provider Review"
        variant="back-and-title"
        onBack={() => router.push('/dashboard')}
      />
      <main className="flex-1 overflow-y-auto px-4 py-6 pt-24">
        <ProviderReviewQueue />
      </main>
    </div>
  );
}
