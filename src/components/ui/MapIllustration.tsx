'use client';

import { cn } from '@/lib/utils';

interface MapIllustrationProps {
  className?: string;
}

/**
 * Map Illustration Component
 * 
 * Displays a stylized map with location pins showing:
 * - Red pins with X (non-halal locations)
 * - Grey pins with "حلال" text (halal locations)
 */
export function MapIllustration({ className = '' }: MapIllustrationProps) {
  return (
    <img
      alt="Map illustration showing halal and non-halal locations"
      className={cn('w-full h-full object-contain rounded-3xl', className)}
      src="/images/maps-problem.png"
    />
  );
}



