'use client';

import { useRouter } from 'next/navigation';
import type { Provider } from '@/services/providers';
import { ProviderEditForm } from './ProviderEditForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { useLanguage } from '@/providers/LanguageProvider';

interface ProviderEditPageProps {
  provider: Provider;
}

export function ProviderEditPage({ provider }: ProviderEditPageProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleSave = () => {
    router.push(`/profile/providers/${provider.provider_id}`);
  };

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader
          title={t('editProvider.title')}
          variant="back-and-title"
          onBack={`/profile/providers/${provider.provider_id}`}
        />
        <HeaderSpacer />
      </div>
      <main className="flex flex-1 flex-col px-6 pb-4 overflow-y-auto md:pt-[var(--desktop-header-height,153px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">
          <ProviderEditForm provider={provider} onSave={handleSave} />
        </div>
      </main>
    </div>
  );
}
