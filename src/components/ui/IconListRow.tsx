import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconListRowProps {
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function IconListRow({ icon, children, trailing, className }: IconListRowProps) {
  return (
    <div className={cn('flex w-full items-center gap-3 rounded-xl', className)}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
