import { SoukCard } from '@/components/shared/marketplace';
import { ErrorMessage } from '@/components/ui/error-message';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

import { useSouks } from '../hooks/useSouks';

export function SouksList() {
  // Business logic is handled by the feature hook
  const { data: souks, isLoading, error } = useSouks();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (!souks?.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No souks found</p>
      </div>
    );
  }

  // UI presentation using the shared component
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {souks.map((souk) => (
        <SoukCard key={souk.souk_id} souk={souk} />
      ))}
    </div>
  );
}
