'use client';

import { useRouter } from 'next/navigation';
import type { Provider } from '@/services/providers';
import { ProviderEditForm } from './ProviderEditForm';
import { PageHeader } from '@/components/layout/PageHeader';

interface ProviderEditPageProps {
  provider: Provider;
}

export function ProviderEditPage({ provider }: ProviderEditPageProps) {
  const router = useRouter();

  const handleSave = () => {
    router.push(`/profile/providers/${provider.provider_id}`);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <PageHeader
        title="Service bearbeiten"
        variant="back-and-title"
        onBack={`/profile/providers/${provider.provider_id}`}
      />

      {/* Main Content */}
      <main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] px-4 pb-4">
        <ProviderEditForm provider={provider} onSave={handleSave} />
      </main>
    </div>
  );
}