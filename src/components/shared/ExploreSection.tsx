'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { motion } from 'motion/react';

import { ProviderCard } from '@/components/providers/ProviderCard';
import { Button } from '@/components/ui/Button';
import { usePinterestTicker } from '@/hooks/usePinterestTicker';
import { useFilter } from '@/providers/filter-provider';
import { getProviders, type Provider } from '@/services/providers';
import { logSupabaseError } from '@/utils/errorUtils';

const CARD_WIDTH = 288; // px
const CARD_GAP = 32; // px (mr-8)
const ANIMATION_SPEED = 0.7; // px per frame

export function ExploreSection() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCategory } = useFilter();
  const router = useRouter();

  useEffect(() => {
    async function fetchProviders() {
      try {
        // Limit to 20 providers for homepage carousel performance
        // This reduces initial load time and improves rendering performance
        const data = await getProviders(20);
        setProviders(data);
      } catch (err) {
        setError('Failed to load providers');
        logSupabaseError('ExploreSection.fetchProviders', err);
        // Log additional details
        if (err instanceof Error) {
          console.error('Error loading providers:', err.message, err);
        } else {
          console.error('Error loading providers:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchProviders();
  }, []);

  // Filter providers based on selected category
  const filteredProviders = selectedCategory
    ? providers.filter((provider) => provider.category_id === selectedCategory)
    : providers;

  const { scrollPx } = usePinterestTicker({
    numCards: filteredProviders.length,
    cardWidth: CARD_WIDTH,
    cardGap: CARD_GAP,
    animationSpeed: ANIMATION_SPEED,
  });
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <section className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="text-uFlowText font-inter-tight text-xl">Loading...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="text-uFlowText font-inter-tight text-xl text-red-500">{error}</div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="explore-heading"
      className="flex min-h-screen md:h-screen w-full flex-col items-center justify-center gap-12 px-4 py-8 md:pt-20 md:pb-8 sm:gap-20 sm:px-6 lg:px-8"
      id="explore"
    >
      <motion.div
        className="flex w-full max-w-screen-xl flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className="flex w-full justify-center px-6 sm:px-8">
          <h2
            className="text-uFlowText inline-block break-words text-center font-inter-tight text-2xl font-medium sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl"
            id="explore-heading"
          >
            Entdecke Angebote aus <span className="text-primary">deiner Ummah</span>
          </h2>
        </div>
        <p className="w-full max-w-2xl text-center font-inter-tight text-base font-normal text-neutral-600 sm:text-lg md:text-xl lg:text-2xl">
          Jedes Zakat (Spenden) Projekt wird anhand unseres Halal-Review Konzept ausgewählt.
        </p>
        <Button
          className="h-10 px-4 text-base sm:h-12 sm:px-8 sm:text-lg"
          variant="primary"
          onClick={() => router.push('/providers')}
        >
          Entdecke deine Ummah
        </Button>
      </motion.div>

      {/* Pinterest-style Infinite Carousel */}
      <motion.div
        ref={carouselContainerRef}
        aria-label="Entdecke Angebote"
        className="w-screen overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        role="region"
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(-${scrollPx}px)`,
            transition: 'transform 0.016s linear',
            width: `${(CARD_WIDTH + CARD_GAP) * filteredProviders.length * 3}px`,
          }}
        >
          {[...filteredProviders, ...filteredProviders, ...filteredProviders].map((provider, idx) => {
            // Only load first 6 cards eagerly (2 sets of 3 visible cards)
            // Rest use lazy loading for better performance
            const isVisible = idx < 6;
            return (
              <Link
                key={`${provider.provider_id}-${idx}`}
                aria-label="Zu den Providers"
                className="mr-8 w-[288px] shrink-0"
                href="/providers"
                tabIndex={0}
              >
                <ProviderCard 
                  {...provider} 
                  className="w-full text-content" 
                  hideWebsiteButton={true}
                  isBookmarked={false}
                  loading={isVisible ? 'eager' : 'lazy'}
                  priority={isVisible && idx < 3}
                  onBookmarkChange={() => {
                    // Non-actionable: bookmark button is shown but does nothing
                  }}
                />
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Floating Arrow Button */}
      <button
        aria-label="Nach oben scrollen"
        className="absolute bottom-10 right-0 hidden size-10 items-center justify-center rounded-3xl bg-zinc-100/60 backdrop-blur-sm md:flex"
        type="button"
      >
        <span aria-hidden="true" className="bg-uFlowText block h-5 w-2.5" />
      </button>
    </section>
  );
}
