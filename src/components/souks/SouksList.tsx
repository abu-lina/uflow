'use client';

import { motion } from 'framer-motion';

import { SoukCard } from '@/components/souks/SoukCard';
import { sharedTransition } from '@/components/ui/PageTransition';
import type { Souk } from '@/services/souks';

interface SouksListProps {
  souks: Souk[];
  bookmarkedSoukIds: string[];
  onSoukClick: (souk: Souk) => void;
  onBookmarkChange: (soukId: string, isBookmarked: boolean) => void;
}

export function SouksList({
  souks,
  bookmarkedSoukIds,
  onSoukClick,
  onBookmarkChange,
}: SouksListProps) {
  return (
    <motion.div
      key={`souks-${souks.length}-${souks[0]?.souk_id || 'empty'}`}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4"
      initial={{ opacity: 0 }}
      transition={sharedTransition}
    >
      {souks.map((souk, index) => (
        <motion.div
          key={souk.souk_id}
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
            isBookmarked={bookmarkedSoukIds.includes(souk.souk_id)}
            onBookmarkChange={(isBookmarked: boolean) =>
              onBookmarkChange(souk.souk_id, isBookmarked)
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
