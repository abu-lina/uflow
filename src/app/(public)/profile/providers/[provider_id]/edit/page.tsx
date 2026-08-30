import { notFound } from 'next/navigation';

import { ProviderEditPage } from '@/features/providers/pages/ProviderEditPage';
import { getProviderById } from '@/services/providers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function EditProviderPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const { provider_id } = await params;
  const provider = await getProviderById(provider_id, createSupabaseServerClient());
  if (!provider) return notFound();

  return <ProviderEditPage provider={provider} />;
}
