import { notFound } from 'next/navigation';

import { getProviderById } from '@/services/providers';
import ProviderModalWrapper from './ProviderModalWrapper';

export default async function ProviderDetailPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  const provider = await getProviderById(provider_id);
  if (!provider) return notFound();

  return <ProviderModalWrapper provider={provider} />;
}
