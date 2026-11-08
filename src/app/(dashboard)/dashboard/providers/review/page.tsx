'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { ProviderReviewQueue } from '@/features/admin/components/ProviderReviewQueue';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ProviderReviewPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLElement>(null);

  return (
    <div className="h-screen-fix flex flex-col">
      <PageHeader
        scrollContainerRef={scrollRef}
        title={t('providerReview.title')}
        variant="back-and-title"
        onBack={() => router.push('/dashboard')}
      />
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 pt-24">
        <ProviderReviewQueue />
      </main>
    </div>
  );
}
