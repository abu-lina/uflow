import { notFound } from 'next/navigation';

import { ProviderDetailPage } from '@/components/providers/ProviderDetailPage';
import { ProfileProviderDetailButtons } from '@/components/providers/ProfileProviderDetailButtons';
import { getProviderById } from '@/services/providers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ProfileProviderDetailPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  const provider = await getProviderById(provider_id, createSupabaseServerClient());
  if (!provider) return notFound();

  return (
    <ProviderDetailPage 
      backPath="/profile"
      customActionButtons={<ProfileProviderDetailButtons providerId={provider_id} />}
      provider={provider}
    />
  );
}
