'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ProviderReviewQueue } from '@/features/admin/components/ProviderReviewQueue';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ProviderReviewPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLElement>(null);

  return (
    <div className="h-screen-fix flex flex-col">
      {/* Mobile header */}
      <PageHeader
        className="md:hidden"
        scrollContainerRef={scrollRef}
        title={t('providerReview.title')}
        variant="back-and-title"
        onBack={() => router.push('/dashboard')}
      />
      {/* Desktop title row — outside main so it doesn't scroll away */}
      <div className="hidden md:flex md:items-center md:gap-2 md:px-8 md:pb-4 md:pt-[calc(var(--desktop-header-height,153px)+8px)]">
        <button
          className="text-content-secondary hover:text-content-heading"
          type="button"
          onClick={() => router.push('/dashboard')}
        >
          <Icon className="h-6 w-6" icon="material-symbols:chevron-left" />
        </button>
        <h1 className="font-inter-tight text-2xl font-semibold text-content-heading">
          {t('providerReview.title')}
        </h1>
      </div>
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-6 pt-24 md:px-8 md:pb-8 md:pt-0"
      >
        <ProviderReviewQueue />
      </main>
    </div>
  );
}
