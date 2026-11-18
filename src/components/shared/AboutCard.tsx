'use client';

import { AddButtonLottie } from '@/components/ui/AddButtonLottie';
import { MapIllustration } from '@/components/ui/MapIllustration';
import { OrigamiBirdIcon } from '@/components/ui/OrigamiBirdIcon';
import type { Quote } from '@/constants/quotes';

interface AboutCardProps {
  quote: Quote;
  cardIndex: number;
}

export function AboutCard({ quote, cardIndex }: AboutCardProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3 p-6 sm:gap-4 md:justify-start">
      {/* Icon */}
      <div
        className={`relative flex flex-shrink-0 items-center justify-center ${
          cardIndex === 0
            ? 'h-[241px] w-[295px] sm:h-[241px] sm:w-[295px] md:h-[241px] md:w-[295px]'
            : cardIndex === 1
              ? 'h-[240px] w-auto'
              : 'h-[140px] w-[115px] sm:h-[200px] sm:w-[150px] md:h-[196px] md:w-full'
        }`}
      >
        {cardIndex === 0 ? (
          <MapIllustration className="h-full w-full" />
        ) : cardIndex === 1 ? (
          <AddButtonLottie className="h-full w-auto" height={240} />
        ) : (
          <OrigamiBirdIcon
            alt="Origami Bird"
            className="h-[140px] w-[115px] sm:h-[200px] sm:w-[150px] md:h-[196px] md:w-auto"
          />
        )}
      </div>

      {/* Text Content */}
      <div className="flex w-full flex-col items-center">
        {/* Title - Responsive: xl (mobile) → 2xl (xs) → 3xl (sm/md) → 3xl (lg) → 4xl (xl) */}
        <h3 className="w-full break-words text-center font-inter-tight text-xl font-semibold text-[#232323] xs:text-2xl sm:text-3xl md:text-3xl lg:text-3xl xl:text-4xl">
          {quote.heading}
        </h3>

        {/* Description - 16px (text-base) */}
        <p
          className="mt-2 w-full text-center font-inter text-base font-normal text-[#232323] xs:mt-4"
          dangerouslySetInnerHTML={{ __html: quote.quote }}
        />
      </div>
    </div>
  );
}
