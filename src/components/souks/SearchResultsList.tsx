'use client';

import { motion } from 'framer-motion';

import { SoukCard } from '@/components/souks/SoukCard';
import { sharedTransition } from '@/components/ui/PageTransition';
import type { SearchResult, Souk } from '@/services/souks';

interface SearchResultsListProps {
  searchResults: SearchResult[];
  bookmarkedSoukIds: string[];
  onSoukClick: (souk: Souk) => void;
  onBookmarkChange: (soukId: string, isBookmarked: boolean) => void;
}

export function SearchResultsList({
  searchResults,
  bookmarkedSoukIds,
  onSoukClick,
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
        // Convert SearchResult back to Souk format for compatibility
        const souk: Souk = {
          souk_id: result.id,
          souk_name: result.name,
          souk_description: result.description,
          souk_images: result.images,
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
          category: result.category,
          zakat_id: result.type === 'zakat' ? result.id : undefined,
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
            onClick={() => onSoukClick(souk)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSoukClick(souk);
              }
            }}
          >
            <SoukCard
              {...souk}
              hideWebsiteButton={true}
              isBookmarked={bookmarkedSoukIds.includes(result.id)}
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
