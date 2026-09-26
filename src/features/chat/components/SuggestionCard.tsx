'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

// NOTE: This component overlaps with RowItem (src/components/ui/RowItem.tsx) in the
// icon+title+subtitle pattern. It exists separately because:
// - RowItem's IconWrapper adds selection-state UI (ring+check badge) not needed here
// - RowItem uses gap-3, this card uses gap-4
// - Icon container has specific styling (w-12 h-12 rounded-[10px] bg-primary/10)
// Promote to src/components/ui/ only if reused outside chat.

interface SuggestionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  href?: string;
}

const cardContent = (icon: ReactNode, title: string, subtitle?: string) => (
  <>
    <div className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <div className="font-inter-tight text-base font-semibold text-text-primary">{title}</div>
      {subtitle && <div className="font-inter text-sm text-text-muted">{subtitle}</div>}
    </div>
  </>
);

export function SuggestionCard({ icon, title, subtitle, onClick, disabled, className, href }: SuggestionCardProps) {
  const containerClass = cn('flex items-center gap-4 text-left w-full', disabled && 'pointer-events-none opacity-50', className);

  if (href) {
    return (
      <Link className={containerClass} href={href}>
        {cardContent(icon, title, subtitle)}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={containerClass} disabled={disabled} onClick={onClick}>
        {cardContent(icon, title, subtitle)}
      </button>
    );
  }

  return (
    <div className={containerClass}>
      {cardContent(icon, title, subtitle)}
    </div>
  );
}
