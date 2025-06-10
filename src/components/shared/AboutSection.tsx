'use client';

import { useState } from 'react';

import { QuoteCard } from '@/components/shared/QuoteCard';
import { PageSliderIndicator } from '@/components/ui/PageSliderIndicator';
import { quotes } from '@/constants/quotes';

export function AboutSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setActiveIndex((prev) => (prev + 1) % quotes.length);
    }
    if (isRightSwipe) {
      setActiveIndex((prev) => (prev - 1 + quotes.length) % quotes.length);
    }
  };

  return (
    <section
      aria-labelledby="about-heading"
      className="mt-4 flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 sm:mt-24 sm:px-6 lg:px-8"
      id="about"
    >
      <div className="flex w-full max-w-screen-xl flex-col items-center gap-8 sm:gap-16">
        <div className="flex w-full flex-col items-center gap-4 sm:gap-6">
          <h2
            className="w-full max-w-[960px] text-center font-inter-tight text-2xl font-medium leading-tight text-black sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
            id="about-heading"
          >
            Warum braucht es einen <span className="text-mint">muslimischen Marktplatz</span>?
          </h2>
          <p className="w-full max-w-2xl text-center font-inter text-base leading-snug text-content sm:text-lg md:text-xl lg:text-2xl">
            Mit Ummah Flow möchten wir – mit der Erlaubnis Allahs ﷲ – unsere Ummah wieder stark
            machen.
          </p>
        </div>
        <div
          className="flex w-full flex-col items-center gap-1"
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchMove}
          onTouchStart={onTouchStart}
        >
          <QuoteCard {...quotes[activeIndex]} />
          <div className="hidden sm:block">
            <PageSliderIndicator
              activeIndex={activeIndex}
              className="mt-4"
              count={quotes.length}
              onChange={setActiveIndex}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
