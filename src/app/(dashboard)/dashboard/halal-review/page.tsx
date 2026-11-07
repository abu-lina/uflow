'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { HalalReviewQueue } from '@/features/admin/components/HalalReviewQueue';
import { useLanguage } from '@/providers/LanguageProvider';

export default function HalalReviewPage() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="h-screen-fix flex flex-col">
      <PageHeader
        title={t('halalReview.title')}
        variant="back-and-title"
        onBack={() => router.push('/dashboard')}
      />
      <main className="flex-1 overflow-y-auto px-4 py-6 pt-24">
        <HalalReviewQueue />
      </main>
    </div>
  );
}
