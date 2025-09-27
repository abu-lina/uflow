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
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-[#D4D4D4] bg-white px-4 py-6 shadow-sm sm:gap-6 sm:px-6 sm:py-8 w-full">
      {/* Icon - Different images for each card */}
      <div className={`relative flex items-center justify-center ${
        cardIndex === 0 
          ? 'h-[140px] w-auto sm:h-[176px]' 
          : cardIndex === 2
          ? 'h-[140px] w-auto sm:h-[176px]'
          : 'h-[140px] w-[115px] sm:h-[176px] sm:w-[144px]'
      }`}>
        {cardIndex === 0 ? (
          <Image
            alt="Nabi"
            className="h-[140px] w-auto object-contain sm:h-[176px]"
            height={176}
            src="/images/Nabi.png"
            width={144}
          />
        ) : cardIndex === 2 ? (
          <Image
            alt="Home"
            className="h-[140px] w-auto object-contain sm:h-[176px]"
            height={176}
            src="/images/Home.png"
            width={144}
          />
        ) : (
          <OrigamiBirdIcon alt="Origami Bird" className="h-[140px] w-[115px] sm:h-[176px] sm:w-[144px]" />
        )}
      </div>

      {/* Text Content */}
      <div className="flex w-full flex-col items-center gap-3 sm:gap-4">
        {/* Title */}
        <h3 className="w-full text-center font-inter-tight text-2xl font-semibold text-[#232323] sm:text-3xl whitespace-pre-line">
          {quote.heading}
        </h3>
        
        {/* Description */}
        <p className="w-full text-justify font-inter text-sm font-normal text-[#232323] sm:text-base">
          {quote.quote}
        </p>
      </div>
    </div>
  );
}
