'use client';

import { useRouter } from 'next/navigation';
import { ProviderCard } from '@/components/providers/ProviderCard';
import type { Provider } from '@/services/providers';
import { PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

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
  const router = useRouter();

  const handleMouseEnter = (provider: Provider) => {
    // Prefetch route and image for community services
    if (provider.community_service_id) {
      // Prefetch the route
      router.prefetch(`/community-services/${provider.community_service_id}`);
      
      // Prefetch the first image if available
      let firstImageUrl: string | null = null;
      if (provider.provider_images) {
        try {
          const imagesData = typeof provider.provider_images === 'string' 
            ? JSON.parse(provider.provider_images)
            : provider.provider_images;
          firstImageUrl = Array.isArray(imagesData) 
            ? imagesData[0] 
            : imagesData.urls?.[0] || null;
        } catch {
          // Ignore parsing errors
        }
      }
      
      if (firstImageUrl && firstImageUrl !== PLACEHOLDER_IMAGE) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = firstImageUrl;
        document.head.appendChild(link);
      }
    }
  };

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
          onMouseEnter={() => handleMouseEnter(provider)}
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
