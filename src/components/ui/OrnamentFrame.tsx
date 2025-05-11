import * as React from 'react';

import { Ornament } from './Ornament';

interface OrnamentFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function OrnamentFrame({ children, className = '', style, ...props }: OrnamentFrameProps) {
  return (
    <div
      className={[
        'relative flex aspect-[16/9] w-full max-w-[800px] flex-col items-center justify-center',
        'overflow-visible rounded-3xl border border-[#BFDBD8]',
        className,
      ].join(' ')}
      style={style}
      {...props}
    >
      {/* Outer Mint Frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 z-0 rounded-[2.5rem] bg-[#BFDBD8]"
      />
      {/* Content (Inner Frame) */}
      <div className="relative z-0 flex min-h-full w-full flex-col items-center justify-center rounded-3xl border-2 border-white p-12">
        {children}
      </div>
      {/* Top Ornament */}
      <div className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center">
        <Ornament className="relative z-20 h-[64px] w-[70px]" />
      </div>
      {/* Bottom Ornament */}
      <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 items-center">
        <Ornament className="relative z-20 h-[64px] w-[70px]" />
      </div>
    </div>
  );
}
