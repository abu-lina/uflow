'use client';

import { ProviderCard } from '@/components/providers/ProviderCard';
import type { Provider } from '@/services/providers';

interface ProvidersListProps {
  providers: Provider[];
  bookmarkedProviderIds: string[];
  onProviderClick: (provider: Provider) => void;
  onBookmarkChange: (providerId: string, isBookmarked: boolean) => void;
}

export function ProvidersList({
  providers,
  bookmarkedProviderIds,
  onProviderClick,
  onBookmarkChange,
}: ProvidersListProps) {
  return (
    <div
      key={`providers-${providers.length}-${providers[0]?.provider_id || 'empty'}`}
      className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4"
    >
      {providers.map((provider) => (
        <div
          key={provider.provider_id}
          className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
          role="button"
          tabIndex={0}
          onClick={() => onProviderClick(provider)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onProviderClick(provider);
            }
          }}
        >
          <ProviderCard
            {...provider}
            hideWebsiteButton={true}
            isBookmarked={bookmarkedProviderIds.includes(provider.provider_id)}
            onBookmarkChange={(isBookmarked: boolean) =>
              onBookmarkChange(provider.provider_id, isBookmarked)
            }
          />
        </div>
      ))}
    </div>
  );
}
