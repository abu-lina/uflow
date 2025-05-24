'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { SoukCard } from '@/components/shared/SoukCard';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePinterestTicker } from '@/hooks/usePinterestTicker';
import { useFilter } from '@/providers/filter-provider';
import { getSouks, type Souk } from '@/services/souks';

const CARD_WIDTH = 288; // px
const CARD_GAP = 32; // px (mr-8)
const ANIMATION_SPEED = 0.7; // px per frame

export function ExploreSection() {
  const [souks, setSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCategory } = useFilter();

  useEffect(() => {
    async function fetchSouks() {
      try {
        const data = await getSouks();
        setSouks(data);
      } catch (err) {
        setError('Failed to load souks');
        console.error('Error loading souks:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchSouks();
  }, []);

  // Filter souks based on selected category
  const filteredSouks = selectedCategory
    ? souks.filter((souk) => souk.category_id === selectedCategory)
    : souks;

  const { scrollPx } = usePinterestTicker({
    numCards: filteredSouks.length,
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
      className="relative flex w-full flex-col items-center justify-center gap-12 px-4 py-8 sm:gap-20 sm:px-6 sm:py-12 md:py-24 lg:px-8"
      id="explore"
    >
      <div className="flex w-full max-w-screen-xl flex-col items-center gap-6">
        <div className="flex w-full justify-center">
          <h2
            className="text-uFlowText inline-block whitespace-nowrap text-center font-inter-tight text-2xl font-medium sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl"
            id="explore-heading"
          >
            Entdecke Angebote aus <span className="text-mint">deiner Ummah</span>
          </h2>
        </div>
        <p className="w-full max-w-2xl text-center font-inter-tight text-base font-normal text-neutral-600 sm:text-lg md:text-xl lg:text-2xl">
          Jedes Zakat (Spenden) Projekt wird anhand unseres Halal-Review Konzept ausgewählt.
        </p>
        <Link href="/souks">
          <ActionButton label="Entdecke deine Ummah" size="lg" />
        </Link>
      </div>

      {/* Pinterest-style Infinite Carousel */}
      <div
        ref={carouselContainerRef}
        aria-label="Entdecke Angebote"
        className="w-screen overflow-hidden"
        role="region"
      >
        <div
          className="flex"
          style={{
            transform: `translateX(-${scrollPx}px)`,
            transition: 'transform 0.016s linear',
            width: `${(CARD_WIDTH + CARD_GAP) * filteredSouks.length * 3}px`,
          }}
        >
          {[...filteredSouks, ...filteredSouks, ...filteredSouks].map((souk, idx) => (
            <Link
              key={`${souk.souk_id}-${idx}`}
              aria-label="Zu den Souks"
              className="mr-8 w-[288px] shrink-0"
              href="/souks"
              tabIndex={0}
            >
              <SoukCard {...souk} className="w-full text-content" hideActions={true} />
            </Link>
          ))}
        </div>
      </div>

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
