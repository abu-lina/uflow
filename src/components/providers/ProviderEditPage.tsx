'use client';

import { useRouter } from 'next/navigation';
import type { Provider } from '@/services/providers';
import { ProviderEditForm } from './ProviderEditForm';
import { PageHeader } from '@/components/layout/PageHeader';
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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <PageHeader
        title={t('editProvider.title')}
        variant="back-and-title"
        onBack={`/profile/providers/${provider.provider_id}`}
      />

      {/* Main Content */}
      <main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] px-6 pb-4">
        <ProviderEditForm provider={provider} onSave={handleSave} />
      </main>
    </div>
  );
}