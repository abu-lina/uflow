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
      className={`relative flex aspect-[16/9] size-full max-w-[800px] flex-col items-center justify-center overflow-x-auto overflow-y-hidden rounded-2xl bg-mint px-16 py-8 shadow-lg sm:rounded-3xl md:rounded-[2.5rem] md:py-12 ${className ?? ''}`}
    >
      {/* Top Ornament */}
      <div className="absolute left-1/2 top-[18px] z-20 flex -translate-x-1/2 -translate-y-1/2 sm:top-[26px] md:top-[34px]">
        <Ornament className="h-[64px] w-[70px]" />
      </div>
      {/* Inner white border frame */}
      <div className="pointer-events-none absolute inset-0 z-0 m-4 rounded-xl border-2 border-white sm:m-6 sm:rounded-2xl md:m-8 md:rounded-3xl" />
      <div className="relative z-10 flex size-full flex-1 flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        {heading && (
          <h2 className="mb-6 w-full break-words text-center font-inter-tight text-xl font-semibold text-white sm:text-2xl md:text-3xl">
            {heading}
          </h2>
        )}
        <blockquote className="mb-6 w-full break-words text-justify font-serif text-xl leading-relaxed text-white">
          &ldquo;{quote}&rdquo;
        </blockquote>
        {author && (
          <figcaption className="w-full break-words text-right text-xs font-medium text-white sm:text-base md:text-lg">
            — {author}
          </figcaption>
        )}
      </div>
      {/* Bottom Ornament */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 sm:bottom-6 md:bottom-8">
        <Ornament className="h-[64px] w-[70px]" />
      </div>
    </figure>
  );
}
