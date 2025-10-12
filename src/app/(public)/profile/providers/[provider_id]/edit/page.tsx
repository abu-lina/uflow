import { notFound } from 'next/navigation';

import { ProviderEditPage } from '@/components/providers/ProviderEditPage';
import { getProviderById } from '@/services/providers';

export default async function EditProviderPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  const provider = await getProviderById(provider_id);
  if (!provider) return notFound();

  return <ProviderEditPage provider={provider} />;
}
