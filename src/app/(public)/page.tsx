'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { Header } from '@/components/layout/Header';
import { ExploreCard } from '@/components/shared/ExploreCard';
import { QuoteCard } from '@/components/shared/QuoteCard';
import { ActionButton } from '@/components/ui/ActionButton';
import { Bismillah } from '@/components/ui/Bismillah';
import { PageSliderIndicator } from '@/components/ui/PageSliderIndicator';
import { quotes } from '@/constants/quotes';
import { usePinterestTicker } from '@/hooks/usePinterestTicker';
import { useFilter } from '@/providers/filter-provider';
import { getSouks, type Souk } from '@/services/souks';

const CARD_WIDTH = 288; // px
const CARD_GAP = 32; // px (mr-8)
const ANIMATION_SPEED = 0.7; // px per frame

function LandingSection() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center">
      <Header />
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="mx-auto flex w-full max-w-[960px] flex-col items-center">
          <div className="flex flex-col items-center justify-center">
            {/* Bismillah Section */}
            <div className="mb-16 flex flex-col items-center gap-2">
              <Bismillah className="size-[69.36px] w-[390px] text-mint" />
              <span className="bg-gold-gradient bg-clip-text font-baskerville text-base font-normal leading-[18px] text-transparent">
                Im Namen Allahs des Allerbarmers, des Allbarmherzigen
              </span>
            </div>

            {/* Heading + Paragraph Section */}
            <section className="mb-16 flex flex-col items-center gap-4">
              <h1 className="w-full text-center font-inter-tight text-[72px] font-medium leading-[87px] text-content-title">
                Von <span className="text-primary">Muslimen</span> für{' '}
                <span className="text-primary">Muslime</span>
              </h1>
              <p className="w-full max-w-xl text-center font-inter text-2xl font-normal leading-[29px] text-content">
                Der erste halal-konforme Marktplatz der sicherstellt, das Jeder die Zakat entrichtet
                insha&apos;Allah.
              </p>
            </section>

            {/* Action Button */}
            <div className="mb-16">
              <Link href="/souks">
                <ActionButton label="Entdecke deine Ummah" size="lg" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section
      aria-labelledby="about-heading"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-[#F9F9F9] px-2"
      id="about"
    >
      <div className="flex w-full max-w-screen-xl flex-col items-center gap-16">
        <div className="flex w-full flex-col items-center gap-6">
          <h2
            className="w-full max-w-[960px] text-center font-inter-tight text-3xl font-medium leading-tight text-black sm:text-5xl md:text-6xl"
            id="about-heading"
          >
            Warum braucht es einen <span className="text-mint">muslimischen Marktplatz</span>?
          </h2>
          <p className="w-full max-w-2xl text-center font-inter text-lg leading-snug text-content sm:text-2xl">
            Mit Ummah Flow möchten wir – mit der Erlaubnis Allahs ﷲ – unsere Ummah wieder stark
            machen.
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-1">
          <QuoteCard {...quotes[activeIndex]} />
          <PageSliderIndicator
            activeIndex={activeIndex}
            className="mt-4"
            count={quotes.length}
            onChange={setActiveIndex}
          />
        </div>
      </div>
    </section>
  );
}

function ExploreSection() {
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
      <section className="flex min-h-[50vh] w-full items-center justify-center bg-[#F9F9F9]">
        <div className="text-uFlowText font-inter-tight text-xl">Loading...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[50vh] w-full items-center justify-center bg-[#F9F9F9]">
        <div className="text-uFlowText font-inter-tight text-xl text-red-500">{error}</div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="explore-heading"
      className="relative flex w-full flex-col items-center justify-center gap-20 bg-[#F9F9F9] px-0 py-12 md:py-24"
      id="explore"
    >
      <div className="flex w-full max-w-screen-xl flex-col items-center gap-6 px-4 md:px-20">
        <div className="flex w-full justify-center">
          <h2
            className="text-uFlowText inline-block whitespace-nowrap text-center font-inter-tight text-3xl font-medium sm:text-5xl md:text-6xl lg:text-7xl"
            id="explore-heading"
          >
            Entdecke Angebote aus <span className="text-mint">deiner Ummah</span>
          </h2>
        </div>
        <p className="w-full max-w-2xl text-center font-inter-tight text-lg font-normal text-neutral-600 md:text-2xl">
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
            <ExploreCard
              key={`${souk.souk_id}-${idx}`}
              {...souk}
              className="mr-8 w-[288px] shrink-0"
            />
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

export default function LandingPage() {
  return (
    <main className="w-full">
      <LandingSection />
      <AboutSection />
      <ExploreSection />
    </main>
  );
}
