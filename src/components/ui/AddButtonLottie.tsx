'use client';

import { cn } from '@/lib/utils';

interface AddButtonLottieProps {
  className?: string;
  height?: number | string;
}

export function AddButtonLottie({ className = '', height = 240 }: AddButtonLottieProps) {
  return (
    <img
      alt="Map illustration showing halal locations"
      className={cn('h-full w-auto object-contain', className)}
      src="/images/maps-solution.png"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}

