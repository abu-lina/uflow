'use client';

import { ProviderCard } from '@/components/providers/ProviderCard';
import type { SearchResult, Provider } from '@/services/providers';

interface SearchResultsListProps {
  searchResults: SearchResult[];
  bookmarkedProviderIds: string[];
  onProviderClick: (provider: Provider) => void;
  onBookmarkChange: (providerId: string, isBookmarked: boolean) => void;
}

export function SearchResultsList({
  searchResults,
  bookmarkedProviderIds,
  onProviderClick,
  onBookmarkChange,
}: SearchResultsListProps) {
  return (
    <div className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
      {searchResults.map((result) => {
        // Convert SearchResult back to Provider format for compatibility
        const provider: Provider = {
          provider_id: result.id,
          provider_name: result.name,
          provider_images: result.images,
          category_id: result.category_id,
          address_city: result.address_city,
          social_website: result.social_website,
          social_instagram: result.social_instagram,
          contact_email: result.contact_email,
          contact_phone: result.contact_phone,
          address_street: result.address_street,
          address_country: result.address_country,
          address_zip: result.address_zip,
          location_latitude: result.location_latitude,
          location_longitude: result.location_longitude,
          created_at: result.created_at,
          updated_at: result.updated_at,
          barakah_effects: result.barakah_effects,
          offers_ids: result.offers_ids,
          needs_ids: result.needs_ids,
          category: result.category,
          community_service_id: result.type === 'community_service' ? result.id : undefined,
        };

        return (
          <div
            key={result.id}
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
              isBookmarked={bookmarkedProviderIds.includes(result.id)}
              onBookmarkChange={(isBookmarked: boolean) =>
                onBookmarkChange(result.id, isBookmarked)
              }
            />
          </div>
        );
      })}
    </div>
  );
}
