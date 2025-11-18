'use client';

import { motion } from 'motion/react';

import { ProviderCard } from '@/components/providers/ProviderCard';
import { sharedTransition } from '@/components/ui/PageTransition';
import { usePrefetchProvider } from '@/hooks/useProvider';
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
  const prefetchProvider = usePrefetchProvider();

  return (
    <motion.div
      key={`providers-${providers.length}-${providers[0]?.provider_id || 'empty'}`}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4"
      initial={false}
      transition={sharedTransition}
    >
      {providers.map((provider, index) => (
        <motion.div
          key={provider.provider_id}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
          initial={false}
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
          onMouseEnter={() => {
            // Prefetch provider data on hover for instant navigation
            prefetchProvider(provider.provider_id);
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
        </motion.div>
      ))}
    </motion.div>
  );
}
