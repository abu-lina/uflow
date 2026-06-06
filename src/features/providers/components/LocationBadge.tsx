'use client';

import Link from 'next/link';

interface LocationBadgeProps {
  count: number;
  providerId: string;
}

export function LocationBadge({ count, providerId }: LocationBadgeProps) {
  if (count <= 1) return null;

  return (
    <Link
      className="inline-flex h-6 items-center justify-center gap-1 overflow-hidden rounded-[7.2px] border border-border bg-background/70 px-2 backdrop-blur-[1.50px] hover:bg-background/90"
      href={`/providers/${providerId}#locations`}
    >
      <span className="font-inter-tight text-sm font-medium text-content">
        {count} Standorte
      </span>
    </Link>
  );
}
