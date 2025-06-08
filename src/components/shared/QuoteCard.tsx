import * as React from 'react';

import { Ornament } from '@/components/ui/Ornament';

interface QuoteCardProps {
  heading?: string;
  quote: string;
  author?: string;
  className?: string;
  ariaLabel?: string;
}

export function QuoteCard({
  heading,
  quote,
  author,
  className,
  ariaLabel = 'Zitatkarte',
}: QuoteCardProps) {
  return (
    <figure
      aria-label={ariaLabel}
      className={`relative flex aspect-[3/4] w-full max-w-[800px] flex-col items-center justify-center overflow-x-auto overflow-y-hidden rounded-2xl bg-mint px-6 py-12 shadow-lg sm:aspect-auto sm:rounded-3xl sm:px-8 md:rounded-[2.5rem] md:px-16 md:py-12 ${className ?? ''}`}
    >
      {/* Top Ornament */}
      <div className="absolute left-1/2 top-[18px] z-20 flex -translate-x-1/2 -translate-y-1/2 sm:top-[26px] md:top-[34px]">
        <Ornament className="w-13 h-12 sm:h-12 sm:w-14 md:h-16 md:w-20" />
      </div>
      {/* Inner white border frame */}
      <div className="pointer-events-none absolute inset-0 z-0 m-4 rounded-xl border-2 border-white sm:m-6 sm:rounded-2xl md:m-8 md:rounded-3xl" />
      <div className="relative z-10 flex size-full flex-1 flex-col items-center justify-center p-6 sm:p-6 md:p-8">
        {heading && (
          <h2 className="mb-8 w-full break-words text-center font-inter-tight text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl sm:leading-snug md:text-3xl md:leading-normal">
            {heading}
          </h2>
        )}
        <blockquote className="mb-8 w-full break-words text-center font-serif text-lg leading-relaxed tracking-wide text-white/95 sm:text-xl sm:leading-loose">
          &ldquo;{quote}&rdquo;
        </blockquote>
        {author && (
          <figcaption className="w-full break-words text-right text-sm font-medium tracking-wide text-white/90 sm:text-base md:text-lg">
            — {author}
          </figcaption>
        )}
      </div>
      {/* Bottom Ornament */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 sm:bottom-6 md:bottom-8">
        <Ornament className="w-13 h-12 sm:h-12 sm:w-14 md:h-16 md:w-20" />
      </div>
    </figure>
  );
}
