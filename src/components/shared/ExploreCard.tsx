import { forwardRef } from 'react';

import Image from 'next/image';

import type { ExploreCard as ExploreCardType } from '@/constants/explore';

interface ExploreCardProps extends ExploreCardType {
  className?: string;
}

export const ExploreCard = forwardRef<HTMLDivElement, ExploreCardProps>(
  ({ address, category, gradient = false, imageUrl, tags, title, className }, ref) => (
    <div ref={ref} className={`inline-flex shrink-0 flex-col items-start ${className || ''}`}>
      <div className="relative flex h-64 w-72 flex-col items-center justify-between">
        {gradient ? (
          <div
            className="absolute left-0 top-0 flex h-64 w-72 flex-col items-center justify-between 
            rounded-t-3xl bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500"
          />
        ) : (
          <div className="border-uFlowWhite absolute left-0 top-0 h-64 w-72 overflow-hidden rounded-t-3xl border">
            <Image
              fill
              alt={title}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 288px"
              src={imageUrl}
            />
          </div>
        )}
        <div className="flex flex-col items-end self-stretch p-3">
          <div
            className={`outline-uFlowDarkGrey flex size-6 items-center justify-center rounded-lg 
            outline outline-[0.6px] outline-offset-[-0.3px] backdrop-blur-sm ${
              gradient
                ? 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500'
                : 'bg-white/70'
            }`}
          >
            <span
              className={`block size-3.5 rounded ${gradient ? 'bg-uFlowWhite' : 'bg-uFlowText'}`}
            />
          </div>
        </div>
        <div className="flex flex-col items-start justify-end self-stretch p-3">
          <div
            className={`outline-uFlowDarkGrey flex h-6 items-center rounded-lg px-2 
            outline outline-[0.6px] outline-offset-[-0.3px] backdrop-blur-sm ${
              gradient
                ? 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500'
                : 'bg-white/70'
            }`}
          >
            <span
              className={`font-inter-tight text-sm font-medium ${gradient ? 'text-white' : 'text-black'}`}
            >
              {category}
            </span>
          </div>
        </div>
      </div>
      <div
        className="bg-uFlowWhite flex w-72 flex-col items-center rounded-b-3xl p-3.5 
      outline outline-[0.84px] outline-offset-[-0.84px] outline-neutral-300"
      >
        <div className="flex w-full flex-col items-start gap-3.5">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-uFlowText font-inter-tight text-xl font-semibold">{title}</span>
            <span className="text-uFlowText2 font-inter text-sm font-normal">{address}</span>
          </div>
          <div className="flex gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="outline-uFlowDarkGrey text-uFlowText flex items-center rounded px-1 py-0.5 
                font-inter-tight text-sm font-medium leading-none outline outline-1 outline-offset-[-0.93px]"
              >
                {tag}
              </span>
            ))}
            <span
              className="outline-uFlowDarkGrey text-uFlowText flex size-5 items-center rounded px-2 py-1 
            font-inter-tight text-sm font-medium leading-none outline outline-1 outline-offset-[-0.93px]"
            >
              +
            </span>
          </div>
          <div className="my-2 h-px w-full bg-zinc-100" />
          <div className="flex w-full gap-3.5">
            <button
              aria-label="Speichern"
              className={`flex h-8 flex-1 items-center gap-2 rounded-[9.6px] px-4 
              font-inter-tight text-base font-medium text-white ${
                gradient
                  ? 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500'
                  : 'bg-uFlowAccent'
              }`}
            >
              <span className={`block size-4 rounded ${gradient ? 'bg-uFlowWhite' : 'bg-white'}`} />
              Speichern
            </button>
            <button
              aria-label="Website"
              className={`flex h-8 flex-1 items-center gap-2 rounded-[9.6px] px-4 
              font-inter-tight text-base font-medium text-white ${
                gradient
                  ? 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500'
                  : 'bg-uFlowAccent'
              }`}
            >
              <span className="block size-4 rounded bg-white" />
              Website
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
);

ExploreCard.displayName = 'ExploreCard';
