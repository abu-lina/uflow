import { ProviderScreeningPanel } from '@/features/admin/components/ProviderScreeningPanel';
import { getProviderScreenings } from '@/features/admin/services/provider-screenings.server';

/** Server component: fetches screenings for admins; renders nothing for everyone else. */
export async function ProviderScreeningSection({ providerId }: { providerId: string }) {
  const result = await getProviderScreenings(providerId);
  if (result.state === 'forbidden') return null;
  return <ProviderScreeningPanel result={result} />;
}
