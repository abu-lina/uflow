'use client';

import Image from 'next/image';
import { OrigamiBirdIcon } from '@/components/ui/OrigamiBirdIcon';
import type { Quote } from '@/constants/quotes';

interface AboutCardProps {
  quote: Quote;
  cardIndex: number;
}

export function AboutCard({ quote, cardIndex }: AboutCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[#D4D4D4] bg-white px-6 py-6 shadow-sm w-full sm:gap-4 md:aspect-[3/4] md:justify-start md:overflow-hidden">
      {/* Icon - Responsive ratio: current on mobile, 3:4 on larger devices */}
      <div className={`relative flex items-center justify-center flex-shrink-0 ${
        cardIndex === 0 
          ? 'h-[140px] w-auto sm:h-[200px] md:h-[196px] md:w-full' 
          : cardIndex === 2
          ? 'h-[140px] w-auto sm:h-[200px] md:h-[196px] md:w-full'
          : 'h-[140px] w-[115px] sm:h-[200px] sm:w-[150px] md:h-[196px] md:w-full'
      }`}>
        {cardIndex === 0 ? (
          <Image
            alt="Nabi"
            className="h-[140px] w-auto object-contain sm:h-[200px] md:h-[196px] md:w-auto"
            height={200}
            src="/images/Nabi.png"
            width={150}
          />
        ) : cardIndex === 2 ? (
          <Image
            alt="Home"
            className="h-[140px] w-auto object-contain sm:h-[200px] md:h-[196px] md:w-auto"
            height={200}
            src="/images/Home.png"
            width={150}
          />
        ) : (
          <OrigamiBirdIcon alt="Origami Bird" className="h-[140px] w-[115px] sm:h-[200px] sm:w-[150px] md:h-[196px] md:w-auto" />
        )}
      </div>

      {/* Text Content */}
      <div className="flex w-full flex-col items-center flex-1 md:min-h-0 md:overflow-y-auto">
        {/* Title - Responsive: 2xl (iPhone SE) → 3xl (phones 376+) → 4xl (tablets 640+) → 4xl (desktop 768+) */}
        <h3 className="w-full text-center font-inter-tight text-2xl font-semibold text-[#232323] xs:text-3xl sm:text-4xl md:text-4xl break-words">
          {quote.heading}
        </h3>
        
        {/* Description - Responsive: sm (iPhone SE) → base (phones 376+) → lg (tablets 640+) → lg (desktop 768+) */}
        {/* Gap: 8px on iPhone SE, 16px on larger phones (376px+) */}
        <p 
          className="w-full text-justify font-inter text-sm font-normal text-[#232323] xs:text-base sm:text-lg md:text-lg mt-2 xs:mt-4 [text-align-last:left]"
          dangerouslySetInnerHTML={{ __html: quote.quote }}
        />
      </div>
    </div>
  );
}
