import { SoukCard } from "@/components/shared/marketplace";
import { useSouks } from "../hooks/useSouks";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";

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
      <div className="text-center py-8">
        <p className="text-gray-500">No souks found</p>
      </div>
    );
  }

  // UI presentation using the shared component
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {souks.map((souk) => (
        <SoukCard key={souk.souk_id} souk={souk} />
      ))}
    </div>
  );
} 