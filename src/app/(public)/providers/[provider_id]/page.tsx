import { notFound } from 'next/navigation';

import { ProviderDetailPage as ProviderDetailPageComponent } from '@/components/providers/ProviderDetailPage';
import { getProviderById } from '@/services/providers';

export default async function ProviderDetailPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  const provider = await getProviderById(provider_id);
  if (!provider) return notFound();

  return <ProviderDetailPageComponent provider={provider} />;
}
