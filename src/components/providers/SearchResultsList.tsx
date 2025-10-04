'use client';

import { motion } from 'framer-motion';

import { ProviderCard } from '@/components/providers/ProviderCard';
import { sharedTransition } from '@/components/ui/PageTransition';
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
    <motion.div
      key={`search-results-${searchResults.length}-${searchResults[0]?.id || 'empty'}`}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4"
      initial={{ opacity: 0 }}
      transition={sharedTransition}
    >
      {searchResults.map((result, index) => {
        // Convert SearchResult back to Provider format for compatibility
        const provider: Provider = {
          provider_id: result.id,
          provider_name: result.name,
          provider_offers: result.description,
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
          <motion.div
            key={result.id}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            role="button"
            tabIndex={0}
            transition={{
              ...sharedTransition,
              delay: index * 0.02,
            }}
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
          </motion.div>
        );
      })}
    </motion.div>
  );
}
