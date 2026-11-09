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
      {/* Mobile header — hidden on desktop; desktop title is rendered inside the queue */}
      <PageHeader
        className="md:hidden"
        scrollContainerRef={scrollRef}
        title={t('providerReview.title')}
        variant="back-and-title"
        onBack={() => router.push('/dashboard')}
      />
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-6 pt-24 md:pt-[calc(var(--desktop-header-height,153px)+16px)]"
      >
        <ProviderReviewQueue onBack={() => router.push('/dashboard')} />
      </main>
    </div>
  );
}
